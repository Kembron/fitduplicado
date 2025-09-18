import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import postgres from "postgres"
import { getCurrentMonthStart, getPreviousMonthStart, getPreviousMonthEnd, debugDate } from "@/lib/date-utils"

const sql = postgres(process.env.DATABASE_URL || "", {
  ssl: { rejectUnauthorized: false },
  max: 10,
  idle_timeout: 20,
  connect_timeout: 30,
})

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "6months"

    console.log("🚀 Fetching reports data for period:", period)

    // Debug de fechas
    debugDate("Reports API")

    // Calcular fechas según el período usando zona horaria consistente
    const now = new Date()
    const uruguayTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Montevideo" }))
    const startDate = new Date(uruguayTime)

    switch (period) {
      case "3months":
        startDate.setMonth(uruguayTime.getMonth() - 3)
        break
      case "12months":
        startDate.setFullYear(uruguayTime.getFullYear() - 1)
        break
      case "24months":
        startDate.setFullYear(uruguayTime.getFullYear() - 2)
        break
      case "lifetime":
        // Set to April 2023 when real data starts
        startDate.setFullYear(2023, 3, 1) // April 1, 2023 (month is 0-indexed)
        break
      default: // 6months
        startDate.setMonth(uruguayTime.getMonth() - 6)
        break
    }

    // Determinar si necesitamos mostrar años en las etiquetas
    const showYears = period === "24months" || period === "lifetime" || period === "12months"

    // Usar fechas consistentes para el mes actual
    const currentMonthStart = getCurrentMonthStart()
    const previousMonthStart = getPreviousMonthStart()
    const previousMonthEnd = getPreviousMonthEnd()

    console.log("📊 Reports - Fechas calculadas:", {
      period,
      startDate: startDate.toISOString().split("T")[0],
      currentMonthStart,
      previousMonthStart,
      previousMonthEnd,
      showYears,
    })

    // Obtener ingresos totales del período
    const totalRevenueResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_revenue
      FROM payments 
      WHERE payment_date >= ${startDate.toISOString().split("T")[0]}
    `

    // Obtener ingresos del mes actual usando fechas consistentes
    const monthlyRevenueResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as monthly_revenue
      FROM payments 
      WHERE payment_date >= ${currentMonthStart}
    `

    // Obtener ingresos del mes anterior para calcular crecimiento
    const lastMonthRevenueResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as last_month_revenue
      FROM payments 
      WHERE payment_date >= ${previousMonthStart} 
      AND payment_date <= ${previousMonthEnd}
    `

    // Calcular crecimiento de ingresos
    const currentRevenue = Number.parseFloat(monthlyRevenueResult[0]?.monthly_revenue || 0)
    const lastRevenue = Number.parseFloat(lastMonthRevenueResult[0]?.last_month_revenue || 0)
    const revenueGrowth = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0

    // Obtener estadísticas de socios usando fechas consistentes
    const memberStats = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'active') as active_members,
        COUNT(*) FILTER (WHERE join_date >= ${currentMonthStart}) as new_members,
        COUNT(*) FILTER (WHERE join_date >= ${previousMonthStart} AND join_date <= ${previousMonthEnd}) as last_month_new_members
      FROM members
    `

    const memberStatsData = memberStats[0] || {}
    const activeMembers = Number.parseInt(memberStatsData.active_members || 0)
    const newMembers = Number.parseInt(memberStatsData.new_members || 0)
    const lastMonthNewMembers = Number.parseInt(memberStatsData.last_month_new_members || 0)

    // Calcular crecimiento de socios
    const memberGrowth = lastMonthNewMembers > 0 ? ((newMembers - lastMonthNewMembers) / lastMonthNewMembers) * 100 : 0

    // Obtener datos mensuales de ingresos - MODIFICADO para incluir años
    const monthlyRevenueData = await sql`
      WITH month_series AS (
        SELECT generate_series(
          date_trunc('month', ${startDate.toISOString()}::date),
          date_trunc('month', CURRENT_DATE),
          interval '1 month'
        ) as month_start
      )
      SELECT 
        month_start,
        CASE 
          WHEN ${showYears} THEN to_char(month_start, 'Mon YYYY')
          ELSE to_char(month_start, 'Mon')
        END as month,
        COALESCE(SUM(p.amount), 0)::numeric as revenue
      FROM month_series ms
      LEFT JOIN payments p ON 
        p.payment_date >= ms.month_start AND 
        p.payment_date < ms.month_start + interval '1 month'
      GROUP BY ms.month_start
      ORDER BY ms.month_start
    `

    // Obtener distribución de membresías
    const membershipDistribution = await sql`
      SELECT 
        ms.name as type,
        COUNT(m.id) as count,
        COALESCE(SUM(ms.price), 0) as revenue
      FROM memberships ms
      LEFT JOIN members m ON m.membership_id = ms.id AND m.status = 'active'
      WHERE ms.is_active = true
      GROUP BY ms.name, ms.price
      ORDER BY ms.price DESC
    `

    // CONSULTA CORREGIDA: Contar socios que tenían membresía VIGENTE al último día de cada mes - MODIFICADO para incluir años
    const activeMembersMonthlyData = await sql`
      WITH month_series AS (
        SELECT 
          generate_series(
            date_trunc('month', ${startDate.toISOString()}::date),
            date_trunc('month', CURRENT_DATE),
            interval '1 month'
          ) as month_start,
          generate_series(
            date_trunc('month', ${startDate.toISOString()}::date) + interval '1 month' - interval '1 day',
            date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day',
            interval '1 month'
          ) as month_end
      ),
      monthly_active_members AS (
        SELECT 
          ms.month_start,
          ms.month_end,
          CASE 
            WHEN ${showYears} THEN to_char(ms.month_start, 'Mon YYYY')
            ELSE to_char(ms.month_start, 'Mon')
          END as month,
          -- Para el mes actual, usar la fecha actual en lugar del último día del mes
          CASE 
            WHEN ms.month_start = date_trunc('month', CURRENT_DATE) 
            THEN CURRENT_DATE::date
            ELSE ms.month_end::date
          END as reference_date,
          -- Contar socios únicos que tenían membresía vigente en la fecha de referencia
          COALESCE((
            SELECT COUNT(DISTINCT subq.member_id)
            FROM (
              SELECT DISTINCT ON (p.member_id) 
                p.member_id,
                p.start_date,
                p.end_date,
                p.payment_date
              FROM payments p
              WHERE p.payment_date <= (
                CASE 
                  WHEN ms.month_start = date_trunc('month', CURRENT_DATE) 
                  THEN CURRENT_DATE::date
                  ELSE ms.month_end::date
                END
              )
              ORDER BY p.member_id, p.payment_date DESC
            ) subq
            WHERE 
              -- La membresía más reciente del socio debe estar vigente en la fecha de referencia
              subq.end_date >= (
                CASE 
                  WHEN ms.month_start = date_trunc('month', CURRENT_DATE) 
                  THEN CURRENT_DATE::date
                  ELSE ms.month_end::date
                END
              )
              AND subq.start_date <= (
                CASE 
                  WHEN ms.month_start = date_trunc('month', CURRENT_DATE) 
                  THEN CURRENT_DATE::date
                  ELSE ms.month_end::date
                END
              )
          ), 0) as active_members_count
        FROM month_series ms
      )
      SELECT 
        month,
        reference_date,
        active_members_count::integer as active_members
      FROM monthly_active_members
      ORDER BY month_start
    `

    // Debug: Verificar la consulta basada en pagos históricos
    console.log("=== DEBUG PAYMENTS-BASED ACTIVE MEMBERS (CORRECTED) ===")

    // Verificar socios activos HOY usando la misma lógica
    const todayActiveMembers = await sql`
      SELECT COUNT(DISTINCT subq.member_id) as today_active
      FROM (
        SELECT DISTINCT ON (p.member_id) 
          p.member_id,
          p.start_date,
          p.end_date,
          p.payment_date
        FROM payments p
        WHERE p.payment_date <= CURRENT_DATE
        ORDER BY p.member_id, p.payment_date DESC
      ) subq
      WHERE 
        subq.end_date >= CURRENT_DATE
        AND subq.start_date <= CURRENT_DATE
    `

    // Verificar algunos ejemplos de socios y sus últimos pagos
    const sampleMembersPayments = await sql`
      SELECT 
        p.member_id,
        m.name,
        p.payment_date,
        p.start_date,
        p.end_date,
        p.amount,
        CASE 
          WHEN p.end_date >= CURRENT_DATE AND p.start_date <= CURRENT_DATE 
          THEN 'ACTIVE' 
          ELSE 'INACTIVE' 
        END as status_by_payment
      FROM (
        SELECT DISTINCT ON (member_id) 
          member_id,
          payment_date,
          start_date,
          end_date,
          amount
        FROM payments
        WHERE payment_date <= CURRENT_DATE
        ORDER BY member_id, payment_date DESC
        LIMIT 10
      ) p
      JOIN members m ON m.id = p.member_id
      ORDER BY p.payment_date DESC
    `

    console.log("Today active members (payments-based, should be ~167):", todayActiveMembers[0])
    console.log("Sample members with their latest payments:", sampleMembersPayments)
    console.log("Active members monthly data (corrected):", activeMembersMonthlyData)
    console.log("=== END DEBUG ===")

    // Obtener datos de crecimiento de socios por mes - CORREGIDO y MODIFICADO para incluir años
    const memberGrowthData = await sql`
      WITH month_series AS (
        SELECT generate_series(
          date_trunc('month', ${startDate.toISOString()}::date),
          date_trunc('month', CURRENT_DATE),
          interval '1 month'
        ) as month_start
      ),
      monthly_data AS (
        SELECT 
          ms.month_start,
          CASE 
            WHEN ${showYears} THEN to_char(ms.month_start, 'Mon YYYY')
            ELSE to_char(ms.month_start, 'Mon')
          END as month,
          -- Nuevos socios en ese mes específico
          COALESCE(COUNT(m.id) FILTER (WHERE 
            m.join_date >= ms.month_start AND 
            m.join_date < ms.month_start + interval '1 month'
          ), 0) as new_members,
          -- Total acumulado hasta el final de ese mes
          COALESCE((
            SELECT COUNT(*) 
            FROM members m2 
            WHERE m2.join_date <= ms.month_start + interval '1 month' - interval '1 day'
          ), 0) as total_members
        FROM month_series ms
        LEFT JOIN members m ON 
          m.join_date >= ms.month_start AND 
          m.join_date < ms.month_start + interval '1 month'
        GROUP BY ms.month_start
      )
      SELECT 
        month,
        new_members::integer as new_members,
        total_members::integer as total_members
      FROM monthly_data
      ORDER BY month_start
    `

    // Obtener pagos pendientes
    const pendingPaymentsResult = await sql`
      SELECT COALESCE(SUM(ms.price), 0) as pending_payments
      FROM members m
      JOIN memberships ms ON m.membership_id = ms.id
      WHERE m.status IN ('expired', 'pending')
    `

    // Obtener socios que vencen esta semana
    const expiringThisWeekResult = await sql`
      SELECT COUNT(*) as expiring_count
      FROM members 
      WHERE status = 'active' 
      AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '7 days'
    `

    // Calcular valor promedio por socio
    const avgMemberValueResult = await sql`
      SELECT 
        CASE 
          WHEN COUNT(DISTINCT member_id) > 0 
          THEN COALESCE(SUM(amount), 0) / COUNT(DISTINCT member_id)
          ELSE 0 
        END as avg_value
      FROM payments 
      WHERE payment_date >= ${currentMonthStart}
    `

    // Calcular tasa de retención (socios que renovaron en los últimos 3 meses)
    const retentionRateResult = await sql`
      WITH renewal_data AS (
        SELECT 
          member_id,
          COUNT(*) as payment_count
        FROM payments 
        WHERE payment_date >= CURRENT_DATE - interval '3 months'
        GROUP BY member_id
      )
      SELECT 
        CASE 
          WHEN COUNT(*) > 0 
          THEN (COUNT(*) FILTER (WHERE payment_count > 1) * 100.0 / COUNT(*))
          ELSE 0 
        END as retention_rate
      FROM renewal_data
    `

    // Calcular duración promedio de permanencia
    const avgStayDurationResult = await sql`
      SELECT 
        CASE 
          WHEN COUNT(*) > 0 
          THEN AVG(EXTRACT(DAY FROM (COALESCE(expiry_date, CURRENT_DATE)::timestamp - join_date::timestamp)) / 30.44)
        ELSE 0 
      END as avg_stay_months
    FROM members
    WHERE join_date IS NOT NULL
    `

    // Calcular tasa de renovación
    const renewalRateResult = await sql`
  WITH expired_members AS (
    -- Socios cuya membresía expiró en el último mes
    SELECT COUNT(DISTINCT subq.member_id) as expired_count
    FROM (
      SELECT DISTINCT ON (p.member_id) 
        p.member_id,
        p.end_date
      FROM payments p
      WHERE p.payment_date <= CURRENT_DATE - interval '1 month'
      ORDER BY p.member_id, p.payment_date DESC
    ) subq
    WHERE subq.end_date >= CURRENT_DATE - interval '1 month'
      AND subq.end_date < CURRENT_DATE
  ),
  renewed_members AS (
    -- Socios que renovaron (hicieron un nuevo pago) después de que su membresía anterior expirara
    SELECT COUNT(DISTINCT p.member_id) as renewed_count
    FROM payments p
    WHERE p.payment_date >= CURRENT_DATE - interval '1 month'
      AND EXISTS (
        -- Verificar que tenían una membresía anterior que expiró
        SELECT 1 FROM payments p2 
        WHERE p2.member_id = p.member_id 
          AND p2.end_date < p.start_date
          AND p2.end_date >= CURRENT_DATE - interval '2 months'
      )
  )
  SELECT 
    CASE 
      WHEN e.expired_count > 0 
      THEN LEAST((r.renewed_count * 100.0 / e.expired_count), 100.0)
      ELSE 0 
    END as renewal_rate,
    e.expired_count,
    r.renewed_count
  FROM expired_members e, renewed_members r
`

    // Debug para tasa de renovación
    console.log("=== DEBUG RENEWAL RATE ===")
    console.log("Renewal rate result:", renewalRateResult[0])

    // Consulta más simple para verificar
    const simpleRenewalCheck = await sql`
  WITH recent_payments AS (
    SELECT 
      member_id,
      COUNT(*) as payment_count,
      MIN(payment_date) as first_payment,
      MAX(payment_date) as last_payment
    FROM payments 
    WHERE payment_date >= CURRENT_DATE - interval '3 months'
    GROUP BY member_id
  )
  SELECT 
    COUNT(*) as total_members_with_recent_payments,
    COUNT(*) FILTER (WHERE payment_count > 1) as members_with_multiple_payments,
    CASE 
      WHEN COUNT(*) > 0 
      THEN (COUNT(*) FILTER (WHERE payment_count > 1) * 100.0 / COUNT(*))
      ELSE 0 
    END as simple_renewal_rate
  FROM recent_payments
`

    console.log("Simple renewal check:", simpleRenewalCheck[0])
    console.log("=== END DEBUG RENEWAL RATE ===")

    const reportsData = {
      totalRevenue: Number.parseFloat(totalRevenueResult[0]?.total_revenue || 0),
      monthlyRevenue: currentRevenue,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      activeMembers: activeMembers,
      newMembers: newMembers,
      memberGrowth: Math.round(memberGrowth * 10) / 10,
      avgMemberValue: Math.round(Number.parseFloat(avgMemberValueResult[0]?.avg_value || 0) * 10) / 10,
      retentionRate: Math.round(Number.parseFloat(retentionRateResult[0]?.retention_rate || 0) * 10) / 10,
      monthlyRevenueData: monthlyRevenueData.map((row) => ({
        month: row.month,
        revenue: Number.parseFloat(row.revenue),
      })),
      membershipDistribution: membershipDistribution.map((row) => ({
        type: row.type,
        count: Number.parseInt(row.count),
        revenue: Number.parseFloat(row.revenue),
      })),
      // DATOS CORREGIDOS: Usar el último pago de cada socio para determinar si estaba activo
      activeMembersMonthlyData: activeMembersMonthlyData.map((row) => ({
        month: row.month,
        active: Number(row.active_members || 0),
      })),
      memberGrowthData: memberGrowthData.map((row) => ({
        month: row.month,
        new: Number(row.new_members || 0),
        total: Number(row.total_members || 0),
      })),
      pendingPayments: Number.parseFloat(pendingPaymentsResult[0]?.pending_payments || 0),
      expiringThisWeek: Number.parseInt(expiringThisWeekResult[0]?.expiring_count || 0),
      avgStayDuration: Math.round(Number.parseFloat(avgStayDurationResult[0]?.avg_stay_months || 0) * 10) / 10,
      renewalRate: Math.round(Number.parseFloat(renewalRateResult[0]?.renewal_rate || 0) * 10) / 10,
    }

    console.log("📊 Reports data calculated:", reportsData)

    // Add cache headers for better performance
    const response = NextResponse.json(reportsData, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600", // Cache for 5 minutes
      },
    })

    return response
  } catch (error) {
    console.error("❌ Error fetching reports data:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
