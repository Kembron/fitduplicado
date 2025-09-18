import { neon } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set")
}

const sql = neon(process.env.DATABASE_URL)

// Cache simple en memoria (en producción usar Redis)
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 2 * 60 * 1000 // 2 minutos

function getCachedData(key: string) {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  return null
}

function setCachedData(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() })
}

// Función optimizada para obtener estadísticas del dashboard
export async function getDashboardStatsOptimized() {
  const cacheKey = "dashboard_stats"
  const cached = getCachedData(cacheKey)
  if (cached) return cached

  try {
    // Una sola consulta optimizada que obtiene todas las estadísticas necesarias
    const result = await sql`
      WITH stats AS (
        SELECT 
          -- Conteo de miembros por estado
          COUNT(*) FILTER (WHERE status = 'active') as active_members,
          COUNT(*) FILTER (WHERE status = 'expired') as expired_members,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_members,
          COUNT(*) FILTER (WHERE status = 'suspended') as suspended_members,
          COUNT(*) as total_members,
          
          -- Membresías que expiran en los próximos 7 días
          COUNT(*) FILTER (
            WHERE status = 'active' 
            AND expiry_date IS NOT NULL 
            AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
          ) as expiring_soon,
          
          -- Nuevos miembros este mes
          COUNT(*) FILTER (
            WHERE join_date >= date_trunc('month', CURRENT_DATE)
          ) as new_members_this_month
        FROM members
      ),
      revenue_stats AS (
        SELECT 
          -- Ingresos del mes actual
          COALESCE(SUM(amount) FILTER (
            WHERE payment_date >= date_trunc('month', CURRENT_DATE)
          ), 0) as monthly_revenue,
          
          -- Ingresos del mes anterior
          COALESCE(SUM(amount) FILTER (
            WHERE payment_date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
            AND payment_date < date_trunc('month', CURRENT_DATE)
          ), 0) as previous_month_revenue,
          
          -- Total de ingresos
          COALESCE(SUM(amount), 0) as total_revenue,
          
          -- Pagos pendientes (estimación basada en membresías vencidas)
          COUNT(DISTINCT m.id) FILTER (
            WHERE m.status = 'expired' 
            AND m.expiry_date >= CURRENT_DATE - INTERVAL '30 days'
          ) as pending_payments_count
        FROM payments p
        RIGHT JOIN members m ON p.member_id = m.id
      ),
      attendance_stats AS (
        SELECT 
          COUNT(*) FILTER (
            WHERE check_in >= CURRENT_DATE
          ) as today_attendance,
          COUNT(*) FILTER (
            WHERE check_in >= date_trunc('week', CURRENT_DATE)
          ) as week_attendance
        FROM attendance
      )
      SELECT 
        s.*,
        r.monthly_revenue,
        r.previous_month_revenue,
        r.total_revenue,
        r.pending_payments_count,
        a.today_attendance,
        a.week_attendance,
        -- Calcular crecimiento mensual
        CASE 
          WHEN r.previous_month_revenue > 0 
          THEN ROUND(((r.monthly_revenue - r.previous_month_revenue) / r.previous_month_revenue * 100)::numeric, 2)
          ELSE 0 
        END as revenue_growth_percentage
      FROM stats s, revenue_stats r, attendance_stats a;
    `

    const stats = result[0] || {}

    // Formatear los datos para el frontend
    const formattedStats = {
      totalMembers: Number.parseInt(stats.total_members) || 0,
      activeMembers: Number.parseInt(stats.active_members) || 0,
      expiredMembers: Number.parseInt(stats.expired_members) || 0,
      pendingMembers: Number.parseInt(stats.pending_members) || 0,
      suspendedMembers: Number.parseInt(stats.suspended_members) || 0,
      expiringMemberships: Number.parseInt(stats.expiring_soon) || 0,
      newMembersThisMonth: Number.parseInt(stats.new_members_this_month) || 0,
      monthlyRevenue: Number.parseFloat(stats.monthly_revenue) || 0,
      previousMonthRevenue: Number.parseFloat(stats.previous_month_revenue) || 0,
      totalRevenue: Number.parseFloat(stats.total_revenue) || 0,
      pendingPayments: Number.parseInt(stats.pending_payments_count) || 0,
      todayAttendance: Number.parseInt(stats.today_attendance) || 0,
      weekAttendance: Number.parseInt(stats.week_attendance) || 0,
      revenueGrowth: Number.parseFloat(stats.revenue_growth_percentage) || 0,
    }

    setCachedData(cacheKey, formattedStats)
    return formattedStats
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    throw error
  }
}

// Función optimizada para obtener membresías que expiran
export async function getExpiringMembershipsOptimized(days = 7) {
  const cacheKey = `expiring_memberships_${days}`
  const cached = getCachedData(cacheKey)
  if (cached) return cached

  try {
    const result = await sql`
      SELECT 
        m.id,
        m.name,
        m.email,
        m.phone,
        m.expiry_date,
        m.status,
        mb.name as membership_name,
        mb.price as membership_price,
        EXTRACT(days FROM (m.expiry_date - CURRENT_DATE)) as days_until_expiry
      FROM members m
      LEFT JOIN memberships mb ON m.membership_id = mb.id
      WHERE m.status = 'active'
        AND m.expiry_date IS NOT NULL
        AND m.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${days} days'
      ORDER BY m.expiry_date ASC
      LIMIT 50;
    `

    setCachedData(cacheKey, result)
    return result
  } catch (error) {
    console.error("Error fetching expiring memberships:", error)
    throw error
  }
}

// Función optimizada para obtener ingresos mensuales
export async function getMonthlyRevenueOptimized(months = 12) {
  const cacheKey = `monthly_revenue_${months}`
  const cached = getCachedData(cacheKey)
  if (cached) return cached

  try {
    const result = await sql`
      SELECT 
        date_trunc('month', payment_date) as month,
        SUM(amount) as revenue,
        COUNT(*) as payment_count,
        COUNT(DISTINCT member_id) as unique_members
      FROM payments
      WHERE payment_date >= CURRENT_DATE - INTERVAL '${months} months'
      GROUP BY date_trunc('month', payment_date)
      ORDER BY month DESC;
    `

    setCachedData(cacheKey, result)
    return result
  } catch (error) {
    console.error("Error fetching monthly revenue:", error)
    throw error
  }
}

// Función para limpiar cache (útil para desarrollo)
export function clearCache() {
  cache.clear()
}

// Función para obtener el tamaño del cache
export function getCacheSize() {
  return cache.size
}
