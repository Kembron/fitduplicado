import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/database"
import {
  getLast30DaysStart,
  getLast60To30DaysStart,
  getLast60To30DaysEnd,
  getTodayLocalDate,
  debugDate,
} from "@/lib/date-utils"

export async function GET() {
  try {
    console.log("🚀 Dashboard stats API called")

    // Verificar autenticación usando getSession
    const session = await getSession()
    if (!session) {
      console.log("❌ No valid session found")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    console.log("✅ Valid session found, getting stats...")

    // Debug de fechas
    debugDate("Dashboard Stats API")

    // NUEVA LÓGICA: Usar últimos 30 días en lugar del mes calendario
    const last30DaysStart = getLast30DaysStart()
    const today = getTodayLocalDate()
    const previous30DaysStart = getLast60To30DaysStart()
    const previous30DaysEnd = getLast60To30DaysEnd()

    console.log("📊 Dashboard Stats - Fechas calculadas (ÚLTIMOS 30 DÍAS):", {
      last30DaysStart,
      today,
      previous30DaysStart,
      previous30DaysEnd,
    })

    // CONSULTA CORREGIDA: Usar la misma lógica que getPendingPayments()
    const [memberStats, revenueStats, pendingPaymentsStats] = await Promise.all([
      // Estadísticas de socios (mantener como está)
      sql`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'active') as active_members,
          COUNT(*) FILTER (WHERE join_date >= ${last30DaysStart}) as new_members_last_30_days,
          COUNT(*) FILTER (WHERE status = 'active' AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '7 days') as expiring_memberships,
          COUNT(*) FILTER (WHERE status = 'suspended') as suspended_members,
          COUNT(*) FILTER (WHERE status = 'inactive') as inactive_members
        FROM members
      `,
      // NUEVA LÓGICA: Ingresos de últimos 30 días vs 30 días anteriores
      sql`
        SELECT 
          COALESCE(SUM(amount) FILTER (WHERE payment_date >= ${last30DaysStart} AND payment_date <= ${today}), 0) as last_30_days_revenue,
          COALESCE(SUM(amount) FILTER (WHERE payment_date >= ${previous30DaysStart} AND payment_date <= ${previous30DaysEnd}), 0) as previous_30_days_revenue
        FROM payments
      `,
      // CONSULTA CORREGIDA: Usar la misma lógica que getPendingPayments()
      // Incluir socios 'active' que ya vencieron Y socios 'expired'
      sql`
        WITH overdue_members AS (
          SELECT 
            m.id,
            m.status,
            m.expiry_date,
            ms.price,
            CASE 
              WHEN m.expiry_date::date < ${today}::date THEN 
                (${today}::date - m.expiry_date::date)
              ELSE 0
            END as days_overdue
          FROM members m
          LEFT JOIN memberships ms ON m.membership_id = ms.id
          WHERE (
            -- Socios expired (ya procesados por updateMembershipStatuses)
            m.status = 'expired' 
            OR 
            -- Socios active pero que ya vencieron (misma lógica que vencimientos próximos)
            (m.status = 'active' AND m.expiry_date::date < ${today}::date)
          )
          AND m.expiry_date IS NOT NULL
        )
        SELECT 
          COUNT(*) FILTER (WHERE days_overdue > 0) as expired_count,
          COALESCE(SUM(price) FILTER (WHERE days_overdue > 0), 0) as expired_amount
        FROM overdue_members
      `,
    ])

    const memberStatsRow = memberStats[0] || {}
    const revenueStatsRow = revenueStats[0] || {}
    const pendingStatsRow = pendingPaymentsStats[0] || {}

    // Calcular crecimiento de ingresos usando la nueva lógica de 30 días
    const currentRevenue = Math.max(0, Number(revenueStatsRow.last_30_days_revenue || 0))
    const previousRevenue = Math.max(0, Number(revenueStatsRow.previous_30_days_revenue || 0))
    const revenueGrowth =
      previousRevenue > 0 ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100 * 10) / 10 : 0

    const stats = {
      activeMembers: Math.max(0, Number(memberStatsRow.active_members || 0)),
      newMembersThisMonth: Math.max(0, Number(memberStatsRow.new_members_last_30_days || 0)), // Ahora son últimos 30 días
      monthlyRevenue: currentRevenue, // Ahora son ingresos de últimos 30 días
      revenueGrowth: Math.max(-100, Math.min(1000, revenueGrowth)),
      pendingPayments: Math.max(0, Number(pendingStatsRow.expired_amount || 0)), // CORREGIDO
      pendingPaymentsCount: Math.max(0, Number(pendingStatsRow.expired_count || 0)), // CORREGIDO
      expiringMemberships: Math.max(0, Number(memberStatsRow.expiring_memberships || 0)),
      suspendedMembers: Math.max(0, Number(memberStatsRow.suspended_members || 0)),
      inactiveMembers: Math.max(0, Number(memberStatsRow.inactive_members || 0)),
      realDebtAmount: Math.max(0, Number(pendingStatsRow.expired_amount || 0)), // CORREGIDO
    }

    console.log("📊 Dashboard Stats calculated (ÚLTIMOS 30 DÍAS):", stats)
    console.log(
      "💰 Revenue comparison - Últimos 30 días:",
      currentRevenue,
      "30 días anteriores:",
      previousRevenue,
      "Growth:",
      revenueGrowth,
    )
    console.log("💳 Pending Payments - Count:", stats.pendingPaymentsCount, "Amount:", stats.pendingPayments)

    return NextResponse.json(stats)
  } catch (error) {
    console.error("❌ Dashboard stats API error:", error)

    // Retornar datos por defecto en lugar de error
    const defaultStats = {
      activeMembers: 0,
      newMembersThisMonth: 0,
      monthlyRevenue: 0,
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
