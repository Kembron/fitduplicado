import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/database"
import {
  getCurrentMonthStart,
  getCurrentMonthEnd,
  getPreviousMonthStart,
  getPreviousMonthEnd,
  formatDateTimeForSQL,
  getCurrentMonthInfo,
} from "@/lib/date-utils"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const currentMonthStart = getCurrentMonthStart()
    const currentMonthEnd = getCurrentMonthEnd()
    const previousMonthStart = getPreviousMonthStart()
    const previousMonthEnd = getPreviousMonthEnd()
    const monthInfo = getCurrentMonthInfo()

    const currentMonthStartStr = formatDateTimeForSQL(currentMonthStart)
    const currentMonthEndStr = formatDateTimeForSQL(currentMonthEnd)
    const previousMonthStartStr = formatDateTimeForSQL(previousMonthStart)
    const previousMonthEndStr = formatDateTimeForSQL(previousMonthEnd)

    // 1. Ingresos del mes actual
    const currentMonthResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as revenue
      FROM payments
      WHERE payment_date >= ${currentMonthStartStr}
      AND payment_date <= ${currentMonthEndStr}
    `

    // 2. Ingresos del mes anterior
    const previousMonthResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as revenue
      FROM payments
      WHERE payment_date >= ${previousMonthStartStr}
      AND payment_date <= ${previousMonthEndStr}
    `

    // 3. Ingresos por tipo de membresía
    const membershipRevenueResult = await sql`
      SELECT
        COALESCE(ms.name, 'Sin membresía') as membership_name,
        COUNT(p.id) as payment_count,
        COALESCE(SUM(p.amount), 0) as total_amount,
        COALESCE(AVG(p.amount), 0) as avg_amount
      FROM payments p
      LEFT JOIN memberships ms ON p.membership_id = ms.id
      WHERE p.payment_date >= ${currentMonthStartStr}
      AND p.payment_date <= ${currentMonthEndStr}
      GROUP BY ms.id, ms.name
      HAVING SUM(p.amount) > 0
      ORDER BY total_amount DESC
    `

    // 4. Ingresos por método de pago
    const paymentMethodRevenueResult = await sql`
      SELECT
        COALESCE(payment_method, 'otro') as payment_method,
        COUNT(*) as payment_count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM payments
      WHERE payment_date >= ${currentMonthStartStr}
      AND payment_date <= ${currentMonthEndStr}
      GROUP BY payment_method
      HAVING SUM(amount) > 0
      ORDER BY total_amount DESC
    `

    // 5. Ingresos diarios del mes
    const dailyRevenueResult = await sql`
      SELECT
        DATE(payment_date) as day,
        COALESCE(SUM(amount), 0) as amount,
        COUNT(*) as payment_count
      FROM payments
      WHERE payment_date >= ${currentMonthStartStr}
      AND payment_date <= ${currentMonthEndStr}
      GROUP BY DATE(payment_date)
      HAVING SUM(amount) > 0
      ORDER BY day
    `

    // 6. Top socios que más aportaron este mes
    const topContributorsResult = await sql`
      SELECT
        COALESCE(m.name, 'Sin nombre') as member_name,
        COALESCE(SUM(p.amount), 0) as total_contribution,
        COUNT(p.id) as payment_count,
        COALESCE(ms.name, 'Sin membresía') as membership_name
      FROM payments p
      LEFT JOIN members m ON p.member_id = m.id
      LEFT JOIN memberships ms ON p.membership_id = ms.id
      WHERE p.payment_date >= ${currentMonthStartStr}
      AND p.payment_date <= ${currentMonthEndStr}
      GROUP BY m.id, m.name, ms.name
      HAVING SUM(p.amount) > 0
      ORDER BY total_contribution DESC
      LIMIT 10
    `

    // Procesar resultados
    const currentRevenue = Math.max(0, Number(currentMonthResult[0]?.revenue) || 0)
    const previousRevenue = Math.max(0, Number(previousMonthResult[0]?.revenue) || 0)

    let growth = 0
    if (previousRevenue > 0) {
      growth = Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100 * 10) / 10
    } else if (currentRevenue > 0 && previousRevenue === 0) {
      growth = 100
    }

    const dailyAverage = monthInfo.daysPassed > 0 ? currentRevenue / monthInfo.daysPassed : 0
    const projectedRevenue = Math.round(dailyAverage * monthInfo.daysInMonth)

    const responseData = {
      currentMonth: {
        revenue: currentRevenue,
        growth: Math.max(-100, Math.min(1000, growth)),
        projectedRevenue: projectedRevenue,
        dailyAverage: Math.round(dailyAverage),
        daysInMonth: monthInfo.daysInMonth,
        daysPassed: monthInfo.daysPassed,
      },
      lastMonth: {
        revenue: previousRevenue,
      },
      revenueByMembership: membershipRevenueResult.map((item: any) => ({
        membershipName: String(item.membership_name || "Sin membresía"),
        paymentCount: Math.max(0, Number(item.payment_count) || 0),
        totalAmount: Math.max(0, Number(item.total_amount) || 0),
        avgAmount: Math.max(0, Math.round(Number(item.avg_amount) || 0)),
      })),
      revenueByPaymentMethod: paymentMethodRevenueResult.map((item: any) => ({
        paymentMethod: String(item.payment_method || "otro").toLowerCase(),
        paymentCount: Math.max(0, Number(item.payment_count) || 0),
        totalAmount: Math.max(0, Number(item.total_amount) || 0),
      })),
      dailyRevenue: dailyRevenueResult.map((item: any) => ({
        day: String(item.day),
        amount: Math.max(0, Number(item.amount) || 0),
        paymentCount: Math.max(0, Number(item.payment_count) || 0),
      })),
      topContributors: topContributorsResult.map((item: any) => ({
        memberName: String(item.member_name || "Sin nombre"),
        totalContribution: Math.max(0, Number(item.total_contribution) || 0),
        paymentCount: Math.max(0, Number(item.payment_count) || 0),
        membershipName: String(item.membership_name || "Sin membresía"),
      })),
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("Error in monthly revenue API:", error)

    const fallbackData = {
      currentMonth: {
        revenue: 0,
        growth: 0,
        projectedRevenue: 0,
        dailyAverage: 0,
        daysInMonth: 30,
        daysPassed: 1,
      },
      lastMonth: {
        revenue: 0,
      },
      revenueByMembership: [],
      revenueByPaymentMethod: [],
      dailyRevenue: [],
      topContributors: [],
    }

    return NextResponse.json(fallbackData, { status: 200 })
  }
}
