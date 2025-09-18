import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/database"
import { getTodayLocalDate, getUruguayDate, debugDate } from "@/lib/date-utils"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    console.log("🔍 === DEBUG PAYMENTS TODAY - INICIO ===")
    debugDate("Debug Payments Today")

    const uruguayDate = getUruguayDate()
    const todayUruguay = getTodayLocalDate()

    console.log("📅 FECHAS CALCULADAS:", {
      uruguayDate: uruguayDate.toString(),
      todayUruguay,
      isJuly1st: todayUruguay === "2025-07-01",
    })

    // Consulta todos los pagos de hoy
    const todayPayments = await sql`
      SELECT 
        p.id,
        p.amount,
        p.payment_date,
        p.payment_method,
        p.description,
        COALESCE(m.name, 'Sin nombre') as member_name,
        COALESCE(ms.name, 'Sin membresía') as membership_name,
        DATE(p.payment_date AT TIME ZONE 'America/Montevideo') as payment_date_local
      FROM payments p
      LEFT JOIN members m ON p.member_id = m.id
      LEFT JOIN memberships ms ON p.membership_id = ms.id
      WHERE DATE(p.payment_date AT TIME ZONE 'America/Montevideo') = ${todayUruguay}::date
      ORDER BY p.payment_date DESC
    `

    // Consulta pagos de los últimos 7 días para contexto
    const recentPayments = await sql`
      SELECT 
        DATE(p.payment_date AT TIME ZONE 'America/Montevideo') as date,
        COUNT(*) as payment_count,
        COALESCE(SUM(p.amount), 0) as total_amount
      FROM payments p
      WHERE p.payment_date >= ${todayUruguay}::date - interval '7 days'
      AND p.payment_date <= ${todayUruguay}::date + interval '1 day'
      GROUP BY DATE(p.payment_date AT TIME ZONE 'America/Montevideo')
      ORDER BY date DESC
    `

    // Consulta total del mes actual
    const currentMonthTotal = await sql`
      SELECT 
        COUNT(*) as payment_count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM payments
      WHERE DATE(payment_date AT TIME ZONE 'America/Montevideo') >= '2025-07-01'
      AND DATE(payment_date AT TIME ZONE 'America/Montevideo') <= '2025-07-31'
    `

    const responseData = {
      debug: {
        uruguayDateTime: uruguayDate.toString(),
        todayUruguay,
        isJuly1st: todayUruguay === "2025-07-01",
        currentTime: new Date().toISOString(),
      },
      todayPayments: todayPayments.map((p: any) => ({
        id: p.id,
        amount: Number(p.amount),
        payment_date: p.payment_date,
        payment_date_local: p.payment_date_local,
        payment_method: p.payment_method,
        description: p.description,
        member_name: p.member_name,
        membership_name: p.membership_name,
      })),
      todayTotal: {
        count: todayPayments.length,
        amount: todayPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0),
      },
      recentPayments: recentPayments.map((p: any) => ({
        date: p.date,
        payment_count: Number(p.payment_count),
        total_amount: Number(p.total_amount),
      })),
      currentMonthTotal: {
        count: Number(currentMonthTotal[0]?.payment_count || 0),
        amount: Number(currentMonthTotal[0]?.total_amount || 0),
      },
    }

    console.log("🔍 RESULTADO DEBUG:", {
      todayPaymentsCount: responseData.todayPayments.length,
      todayTotal: responseData.todayTotal,
      currentMonthTotal: responseData.currentMonthTotal,
    })

    console.log("🔍 === DEBUG PAYMENTS TODAY - FIN ===")

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("❌ ERROR en debug payments today:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error desconocido",
        debug: {
          error: true,
          message: "Error al obtener datos de debug",
        },
      },
      { status: 500 },
    )
  }
}
