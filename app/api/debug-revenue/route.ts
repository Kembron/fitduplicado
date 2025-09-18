import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { sql } = await import("@/lib/database")

    // Debug completo de la situación de pagos
    const debugQueries = await Promise.all([
      // 1. Total de pagos
      sql`
        SELECT 
          COUNT(*) as total_payments,
          COALESCE(SUM(amount), 0) as total_amount,
          MIN(payment_date) as earliest_payment,
          MAX(payment_date) as latest_payment
        FROM payments
      `,

      // 2. Pagos del mes actual - CONSULTA EXACTA
      sql`
        SELECT 
          COUNT(*) as payments_this_month,
          COALESCE(SUM(amount), 0) as revenue_this_month,
          date_trunc('month', CURRENT_DATE) as current_month_start,
          CURRENT_DATE as today
        FROM payments 
        WHERE payment_date >= date_trunc('month', CURRENT_DATE)
      `,

      // 3. Pagos por mes (últimos 6 meses)
      sql`
        SELECT 
          date_trunc('month', payment_date) as month,
          COUNT(*) as payment_count,
          COALESCE(SUM(amount), 0) as total_revenue
        FROM payments 
        WHERE payment_date >= CURRENT_DATE - interval '6 months'
        GROUP BY date_trunc('month', payment_date)
        ORDER BY month DESC
      `,

      // 4. Últimos 10 pagos
      sql`
        SELECT 
          id, 
          member_id, 
          amount, 
          payment_date,
          payment_method,
          description
        FROM payments 
        ORDER BY payment_date DESC 
        LIMIT 10
      `,
    ])

    const [totalStats, currentMonthStats, monthlyBreakdown, recentPayments] = debugQueries

    const debugInfo = {
      totalStats: totalStats[0] || {},
      currentMonthStats: currentMonthStats[0] || {},
      monthlyBreakdown: monthlyBreakdown || [],
      recentPayments: recentPayments || [],
      timestamp: new Date().toISOString(),
    }

    console.log("🔍 Revenue Debug Info:", JSON.stringify(debugInfo, null, 2))

    return NextResponse.json(debugInfo)
  } catch (error) {
    console.error("Debug revenue error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
