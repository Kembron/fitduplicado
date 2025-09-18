import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// Cache simple para consultas frecuentes
const queryCache = new Map<string, { data: any; expires: number }>()
const CACHE_DURATION = 2 * 60 * 1000 // 2 minutos

/**
 * Función helper para cache de consultas
 */
function getCachedQuery<T>(key: string): T | null {
  const cached = queryCache.get(key)
  if (cached && cached.expires > Date.now()) {
    return cached.data as T
  }
  return null
}

function setCachedQuery<T>(key: string, data: T): void {
  queryCache.set(key, {
    data,
    expires: Date.now() + CACHE_DURATION,
  })
}

/**
 * Versión optimizada de getDashboardStats con consultas más eficientes
 */
export async function getDashboardStatsOptimized() {
  const cacheKey = "dashboard-stats"
  const cached = getCachedQuery(cacheKey)
  if (cached) {
    return cached
  }

  try {
    // Usar una sola consulta con CTEs para mejor rendimiento
    const result = await sql`
      WITH member_stats AS (
        SELECT 
          COUNT(*) FILTER (WHERE status = 'active') as active_members,
          COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)) as new_members_this_month,
          COUNT(*) FILTER (WHERE status IN ('expired', 'suspended') AND 
            COALESCE(last_payment_date, created_at) < CURRENT_DATE - INTERVAL '30 days') as pending_payments_count
        FROM members
      ),
      revenue_stats AS (
        SELECT 
          COALESCE(SUM(amount) FILTER (WHERE payment_date >= date_trunc('month', CURRENT_DATE)), 0) as monthly_revenue,
          COALESCE(SUM(amount) FILTER (WHERE payment_date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') 
            AND payment_date < date_trunc('month', CURRENT_DATE)), 0) as previous_month_revenue,
          COALESCE(SUM(amount) FILTER (WHERE status = 'pending' AND due_date < CURRENT_DATE), 0) as pending_payments
        FROM payments
      ),
      expiring_stats AS (
        SELECT COUNT(*) as expiring_memberships
        FROM members m
        JOIN memberships ms ON m.membership_id = ms.id
        WHERE m.status = 'active' 
        AND (m.last_payment_date + INTERVAL '1 day' * ms.duration_days) <= CURRENT_DATE + INTERVAL '30 days'
        AND (m.last_payment_date + INTERVAL '1 day' * ms.duration_days) > CURRENT_DATE
      )
      SELECT 
        ms.active_members,
        ms.new_members_this_month,
        ms.pending_payments_count,
        rs.monthly_revenue,
        rs.previous_month_revenue,
        rs.pending_payments,
        es.expiring_memberships,
        CASE 
          WHEN rs.previous_month_revenue > 0 
          THEN ROUND(((rs.monthly_revenue - rs.previous_month_revenue) / rs.previous_month_revenue * 100)::numeric, 1)
          ELSE 0 
        END as revenue_growth
      FROM member_stats ms, revenue_stats rs, expiring_stats es
    `

    const stats = {
      activeMembers: Number(result[0]?.active_members || 0),
      newMembersThisMonth: Number(result[0]?.new_members_this_month || 0),
      monthlyRevenue: Number(result[0]?.monthly_revenue || 0),
      revenueGrowth: Number(result[0]?.revenue_growth || 0),
      pendingPayments: Number(result[0]?.pending_payments || 0),
      pendingPaymentsCount: Number(result[0]?.pending_payments_count || 0),
      expiringMemberships: Number(result[0]?.expiring_memberships || 0),
    }

    setCachedQuery(cacheKey, stats)
    return stats
  } catch (error) {
    console.error("Error fetching optimized dashboard stats:", error)

    // Retornar datos por defecto en caso de error
    return {
      activeMembers: 0,
      newMembersThisMonth: 0,
      monthlyRevenue: 0,
      revenueGrowth: 0,
      pendingPayments: 0,
      pendingPaymentsCount: 0,
      expiringMemberships: 0,
    }
  }
}

/**
 * Función optimizada para obtener solo el rol del usuario
 */
export async function getUserRoleFromDB(userId: number): Promise<string | null> {
  const cacheKey = `user-role-${userId}`
  const cached = getCachedQuery<string>(cacheKey)
  if (cached) {
    return cached
  }

  try {
    const result = await sql`
      SELECT role FROM users WHERE id = ${userId} LIMIT 1
    `

    const role = result[0]?.role || null
    if (role) {
      setCachedQuery(cacheKey, role)
    }

    return role
  } catch (error) {
    console.error("Error fetching user role:", error)
    return null
  }
}

/**
 * Función para limpiar cache de consultas
 */
export function clearQueryCache(): void {
  queryCache.clear()
}

/**
 * Función optimizada para verificar membresías que expiran pronto
 */
export async function getExpiringMembershipsCount(): Promise<number> {
  const cacheKey = "expiring-memberships-count"
  const cached = getCachedQuery<number>(cacheKey)
  if (cached !== null) {
    return cached
  }

  try {
    const result = await sql`
      SELECT COUNT(*) as count
      FROM members m
      JOIN memberships ms ON m.membership_id = ms.id
      WHERE m.status = 'active' 
      AND (m.last_payment_date + INTERVAL '1 day' * ms.duration_days) <= CURRENT_DATE + INTERVAL '30 days'
      AND (m.last_payment_date + INTERVAL '1 day' * ms.duration_days) > CURRENT_DATE
    `

    const count = Number(result[0]?.count || 0)
    setCachedQuery(cacheKey, count)
    return count
  } catch (error) {
    console.error("Error fetching expiring memberships count:", error)
    return 0
  }
}
