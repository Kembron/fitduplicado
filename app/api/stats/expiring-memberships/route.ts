import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { neon } from "@neondatabase/serverless"
import { getTodayLocalDate } from "@/lib/date-utils"

// Initialize database connection with proper error handling
let sql: ReturnType<typeof neon>

try {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set")
  }
  sql = neon(process.env.DATABASE_URL)
} catch (error) {
  console.error("Failed to initialize database connection:", error)
}

export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Check if database connection is available
    if (!sql) {
      console.error("Database connection not available")
      return NextResponse.json({ error: "Error de conexión a la base de datos" }, { status: 500 })
    }

    // Obtener la fecha actual en zona horaria de Uruguay
    const todayUruguay = getTodayLocalDate()

    console.log("🗓️ Expiring Memberships - Fecha actual Uruguay:", todayUruguay)

    // Obtener lista detallada de membresías próximas a vencer
    // Usando la fecha de Uruguay para cálculos precisos
    const expiringMemberships = await sql`
      SELECT 
        m.id as member_id,
        m.name as member_name,
        m.email,
        m.phone,
        m.status,
        m.expiry_date,
        m.last_payment_date,
        ms.name as membership_name,
        ms.price as renewal_amount,
        -- Calcular días hasta vencimiento usando fecha de Uruguay
        (m.expiry_date::date - ${todayUruguay}::date) as days_until_expiry,
        CASE 
          WHEN m.expiry_date::date = ${todayUruguay}::date THEN 'Vence hoy'
          WHEN m.expiry_date::date = (${todayUruguay}::date + interval '1 day')::date THEN 'Vence mañana'
          WHEN (m.expiry_date::date - ${todayUruguay}::date) <= 3 AND (m.expiry_date::date - ${todayUruguay}::date) > 0 
            THEN 'Vence en ' || (m.expiry_date::date - ${todayUruguay}::date) || ' días'
          WHEN (m.expiry_date::date - ${todayUruguay}::date) < 0 
            THEN 'Venció hace ' || ABS(m.expiry_date::date - ${todayUruguay}::date) || ' días'
          ELSE 'Vence en ' || (m.expiry_date::date - ${todayUruguay}::date) || ' días'
        END as expiry_label
      FROM members m
      JOIN memberships ms ON m.membership_id = ms.id
      WHERE m.status = 'active' 
      AND m.expiry_date::date BETWEEN (${todayUruguay}::date - interval '7 days') AND (${todayUruguay}::date + interval '30 days')
      ORDER BY m.expiry_date ASC
    `

    // Calcular estadísticas por períodos usando fecha de Uruguay
    const expiringStats = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE expiry_date::date = ${todayUruguay}::date) as expiring_today,
        COUNT(*) FILTER (WHERE expiry_date::date BETWEEN (${todayUruguay}::date + interval '1 day') AND (${todayUruguay}::date + interval '3 days')) as expiring_3_days,
        COUNT(*) FILTER (WHERE expiry_date::date BETWEEN (${todayUruguay}::date + interval '4 days') AND (${todayUruguay}::date + interval '7 days')) as expiring_week,
        COUNT(*) FILTER (WHERE expiry_date::date BETWEEN (${todayUruguay}::date + interval '8 days') AND (${todayUruguay}::date + interval '30 days')) as expiring_month,
        COUNT(*) FILTER (WHERE expiry_date::date < ${todayUruguay}::date AND expiry_date::date >= (${todayUruguay}::date - interval '7 days')) as expired_recent,
        COALESCE(SUM(ms.price) FILTER (WHERE expiry_date::date BETWEEN ${todayUruguay}::date AND (${todayUruguay}::date + interval '7 days')), 0) as potential_revenue_week,
        COALESCE(SUM(ms.price) FILTER (WHERE expiry_date::date BETWEEN ${todayUruguay}::date AND (${todayUruguay}::date + interval '30 days')), 0) as potential_revenue_month
      FROM members m
      JOIN memberships ms ON m.membership_id = ms.id
      WHERE m.status = 'active' 
      AND m.expiry_date::date BETWEEN (${todayUruguay}::date - interval '7 days') AND (${todayUruguay}::date + interval '30 days')
    `

    const stats = expiringStats[0] || {
      expiring_today: 0,
      expiring_3_days: 0,
      expiring_week: 0,
      expiring_month: 0,
      expired_recent: 0,
      potential_revenue_week: 0,
      potential_revenue_month: 0,
    }

    console.log("📊 Expiring Stats:", {
      todayUruguay,
      expiringToday: Number(stats.expiring_today),
      expiredRecent: Number(stats.expired_recent),
      totalMemberships: expiringMemberships.length,
    })

    return NextResponse.json({
      memberships: expiringMemberships,
      stats: {
        expiringToday: Number(stats.expiring_today),
        expiring3Days: Number(stats.expiring_3_days),
        expiringWeek: Number(stats.expiring_week),
        expiringMonth: Number(stats.expiring_month),
        expiredRecent: Number(stats.expired_recent),
        totalExpiring:
          Number(stats.expiring_today) +
          Number(stats.expiring_3_days) +
          Number(stats.expiring_week) +
          Number(stats.expiring_month),
        potentialRevenueWeek: Number(stats.potential_revenue_week),
        potentialRevenueMonth: Number(stats.potential_revenue_month),
      },
      debugInfo: {
        todayUruguay,
        serverTime: new Date().toISOString(),
        uruguayTime: new Date().toLocaleString("es-UY", { timeZone: "America/Montevideo" }),
      },
    })
  } catch (error) {
    console.error("Error fetching expiring memberships:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
