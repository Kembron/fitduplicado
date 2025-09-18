import { NextResponse } from "next/server"
import { getPendingPayments } from "@/lib/database"
import { getSession } from "@/lib/auth"
import { getTodayLocalDate, getCurrentMonthStart } from "@/lib/date-utils"

export async function GET() {
  try {
    console.log("Dashboard optimized stats API called")

    const session = await getSession()
    if (!session) {
      console.log("No valid session found")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    console.log("Valid session found, getting optimized stats...")

    // USAR LA FUNCIÓN UNIFICADA para todos los datos
    const pendingData = await getPendingPayments()

    // Obtener otras estadísticas
    const { sql } = await import("@/lib/database")

    // Obtener fechas correctas usando las funciones que SÍ existen
    const todayUruguay = getTodayLocalDate()
    const monthStart = getCurrentMonthStart()

    console.log("📊 Dashboard Stats - Fechas Uruguay:", {
      todayUruguay,
      monthStart,
      currentTime: new Date().toLocaleString("es-UY", { timeZone: "America/Montevideo" }),
    })

    const [memberStats, revenueStats] = await Promise.all([
      sql`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'active') as active_members,
          COUNT(*) FILTER (WHERE join_date >= date_trunc('month', CURRENT_DATE)) as new_members_this_month,
          COUNT(*) FILTER (WHERE status = 'active' AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '7 days') as expiring_memberships,
          COUNT(*) FILTER (WHERE status = 'suspended') as suspended_members,
          COUNT(*) FILTER (WHERE status = 'inactive') as inactive_members
        FROM members
      `,
      sql`
        SELECT 
          -- Ingresos del mes actual usando la misma lógica que daily-payments-detailed
          COALESCE(SUM(amount) FILTER (WHERE 
            CASE 
              WHEN payment_date::text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN payment_date::date
              ELSE DATE(payment_date AT TIME ZONE 'America/Montevideo')
            END >= ${monthStart}::date
            AND 
            CASE 
              WHEN payment_date::text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN payment_date::date
              ELSE DATE(payment_date AT TIME ZONE 'America/Montevideo')
            END <= ${todayUruguay}::date
          ), 0) as monthly_revenue,
          
          -- Ingresos del día actual
          COALESCE(SUM(amount) FILTER (WHERE 
            CASE 
              WHEN payment_date::text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN payment_date::date
              ELSE DATE(payment_date AT TIME ZONE 'America/Montevideo')
            END = ${todayUruguay}::date
          ), 0) as daily_revenue,
          
          -- Ingresos del mes anterior para comparación
          COALESCE(SUM(amount) FILTER (WHERE 
            payment_date >= date_trunc('month', CURRENT_DATE - interval '1 month') 
            AND payment_date < date_trunc('month', CURRENT_DATE)
          ), 0) as previous_month_revenue
        FROM payments
      `,
    ])

    const memberStatsRow = memberStats[0] || {}
    const revenueStatsRow = revenueStats[0] || {}

    const currentRevenue = Math.max(0, Number(revenueStatsRow.monthly_revenue || 0))
    const dailyRevenue = Math.max(0, Number(revenueStatsRow.daily_revenue || 0))
    const previousRevenue = Math.max(0, Number(revenueStatsRow.previous_month_revenue || 0))
    const revenueGrowth =
      previousRevenue > 0 ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100 * 10) / 10 : 0

    console.log("📊 Dashboard Stats - Ingresos calculados:", {
      monthlyRevenue: currentRevenue,
      dailyRevenue: dailyRevenue,
      previousRevenue: previousRevenue,
      revenueGrowth: revenueGrowth,
      monthStart: monthStart,
      today: todayUruguay,
    })

    const stats = {
      activeMembers: Math.max(0, Number(memberStatsRow.active_members || 0)),
      newMembersThisMonth: Math.max(0, Number(memberStatsRow.new_members_this_month || 0)),
      monthlyRevenue: currentRevenue,
      dailyRevenue: dailyRevenue,
      revenueGrowth: Math.max(-100, Math.min(1000, revenueGrowth)),
      // USAR LOS DATOS UNIFICADOS DE PAGOS PENDIENTES
      pendingPayments: pendingData.stats.expiredAmount,
      pendingPaymentsCount: pendingData.stats.expiredCount,
      expiringMemberships: Math.max(0, Number(memberStatsRow.expiring_memberships || 0)),
      suspendedMembers: Math.max(0, Number(memberStatsRow.suspended_members || 0)),
      inactiveMembers: Math.max(0, Number(memberStatsRow.inactive_members || 0)),
      realDebtAmount: pendingData.stats.expiredAmount,
    }

    console.log("✅ Dashboard Stats - Respuesta final:", stats)
    return NextResponse.json(stats)
  } catch (error) {
    console.error("❌ Dashboard optimized stats API error:", error)

    // Retornar datos por defecto en lugar de error
    const defaultStats = {
      activeMembers: 0,
      newMembersThisMonth: 0,
      monthlyRevenue: 0,
      dailyRevenue: 0,
      revenueGrowth: 0,
      pendingPayments: 0,
      pendingPaymentsCount: 0,
      expiringMemberships: 0,
      suspendedMembers: 0,
      inactiveMembers: 0,
      realDebtAmount: 0,
    }

    return NextResponse.json(defaultStats)
  }
}
