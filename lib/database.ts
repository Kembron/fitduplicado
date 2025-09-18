import postgres from "postgres"
import {
  getCurrentMonthStart,
  getPreviousMonthStart,
  getPreviousMonthEnd,
  debugDate,
  getTodayLocalDate,
} from "@/lib/date-utils"

// Configuración optimizada de la conexión a PostgreSQL
const sql = postgres(process.env.DATABASE_URL || "", {
  ssl: { rejectUnauthorized: false },
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
})

// Exportar la instancia sql para uso directo
export { sql }

// Interfaces para los tipos de datos
export interface User {
  id: number
  email: string
  username: string
  name: string
  password: string
  role: string
  created_at: string
}

export interface Member {
  id: number
  name: string
  email: string
  phone: string
  document_id: string
  gender: string // Agregar esta línea
  birth_date: string
  address: string
  emergency_contact: string
  notes: string
  membership_id: number
  membership_name: string
  status: "active" | "expired" | "suspended" | "inactive" | "cancelled"
  join_date: string
  expiry_date: string
  monthly_fee: number
  last_payment_date: string | null
  inactive_since: string | null
  auto_suspended: boolean
}

export interface Membership {
  id: number
  name: string
  description: string
  price: number
  duration_days: number
  is_active: boolean
  members_count?: number
}

export interface Payment {
  id: number
  member_id: number
  amount: number
  payment_date: string
  payment_method: string
  description: string
  membership_id: number
  start_date: string
  end_date: string
  created_by: number
}

export interface DashboardStats {
  activeMembers: number
  newMembersThisMonth: number
  monthlyRevenue: number
  revenueGrowth: number
  pendingPayments: number
  pendingPaymentsCount: number
  expiringMemberships: number
  suspendedMembers: number
  inactiveMembers: number
  realDebtAmount: number // Solo deudas de socios que realmente pueden pagar
}

export interface Attendance {
  id: number
  member_id: number
  check_in: string
  check_out: string | null
  created_at: string
}

export interface PendingPayment {
  member_id: number
  member_name: string
  email: string | null
  phone: string | null
  status: string
  expiry_date: string
  last_payment_date: string | null
  membership_name: string
  amount_due: number
  days_overdue: number
}

// Cache simple en memoria para consultas frecuentes
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 30 * 1000 // Reducido a 30 segundos para mayor consistencia

function getCached<T>(key: string): T | null {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  cache.delete(key)
  return null
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() })
}

// Función para limpiar cache específico de membresías
export function clearMembershipsCache(): void {
  const keysToDelete = Array.from(cache.keys()).filter(
    (key) => key.includes("memberships") || key.includes("membership"),
  )
  keysToDelete.forEach((key) => cache.delete(key))
  console.log("Memberships cache cleared:", keysToDelete)
}

// Función helper para queries
export async function query(text: string, params: any[] = []) {
  try {
    const result = await sql.unsafe(text, params)
    return { rows: result }
  } catch (error) {
    console.error("Database query error:", error)
    throw error
  }
}

// Usuarios - ACTUALIZADO para usar username
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const result = await sql`SELECT * FROM users WHERE LOWER(email) = LOWER(${email}) LIMIT 1`
    return result[0] || null
  } catch (error) {
    console.error("Error getting user by email:", error)
    return null
  }
}

// Nueva función para buscar por username
export async function getUserByUsername(username: string): Promise<User | null> {
  try {
    const result = await sql`SELECT * FROM users WHERE LOWER(username) = LOWER(${username}) LIMIT 1`
    return result[0] || null
  } catch (error) {
    console.error("Error getting user by username:", error)
    return null
  }
}

export async function createUser(userData: {
  email: string
  username: string
  name: string
  password: string
  role?: string
}): Promise<User | null> {
  try {
    const result = await sql`
      INSERT INTO users (email, username, name, password, role)
      VALUES (${userData.email.toLowerCase()}, ${userData.username.toLowerCase()}, ${userData.name}, ${userData.password}, ${userData.role || "admin"})
      RETURNING *
    `
    return result[0] || null
  } catch (error) {
    console.error("Error creating user:", error)
    return null
  }
}

// Socios con gestión inteligente de estados basada en PAGOS
interface GetMembersOptions {
  query?: string
  status?: string
  includeInactive?: boolean
  onlySuspended?: boolean
  limit?: number
}

export async function getMembers({
  query = "",
  status,
  includeInactive = false,
  onlySuspended = false,
  limit,
}: GetMembersOptions = {}): Promise<Member[]> {
  try {
    const cacheKey = `members_${query}_${status}_${includeInactive}_${onlySuspended}_${limit || "all"}`
    const cached = getCached<Member[]>(cacheKey)
    if (cached) return cached

    // Actualizar estados antes de consultar
    await updateMembershipStatuses()

    let whereClause = "WHERE 1=1"

    // Filtro por búsqueda
    if (query) {
      whereClause += ` AND (m.name ILIKE '%${query}%' OR m.email ILIKE '%${query}%' OR m.phone ILIKE '%${query}%')`
    }

    // Filtro por estado
    if (status) {
      whereClause += ` AND m.status = '${status}'`
    } else if (onlySuspended) {
      whereClause += " AND (m.status = 'suspended' OR m.status = 'inactive')"
    } else if (!includeInactive) {
      whereClause += " AND m.status NOT IN ('inactive', 'suspended')"
    }

    let limitClause = ""
    if (limit) {
      limitClause = `LIMIT ${limit}`
    }

    const sqlQuery = `
      SELECT 
        m.id, 
        m.name, 
        m.email, 
        m.phone, 
        m.document_id,
        m.gender,  -- Agregar esta línea
        m.birth_date,
        m.address,
        m.emergency_contact,
        m.notes,
        m.membership_id,
        m.status, 
        m.join_date,
        m.expiry_date, 
        m.last_payment_date,
        m.inactive_since,
        m.auto_suspended,
        ms.name as membership_name, 
        ms.price as monthly_fee
      FROM 
        members m
      LEFT JOIN 
        memberships ms ON m.membership_id = ms.id
      ${whereClause}
      ORDER BY 
        CASE 
          WHEN m.status = 'active' THEN 1
          WHEN m.status = 'expired' THEN 2
          WHEN m.status = 'suspended' THEN 3
          WHEN m.status = 'inactive' THEN 4
          WHEN m.status = 'cancelled' THEN 5
          ELSE 6
        END,
        m.name
      ${limitClause}
    `

    const result = await sql.unsafe(sqlQuery)

    setCache(cacheKey, result)
    return result
  } catch (error) {
    console.error("Error al obtener miembros:", error)
    throw error
  }
}

// FUNCIÓN UNIFICADA para obtener pagos pendientes - usada tanto por dashboard como por modal
export async function getPendingPayments(): Promise<{
  payments: PendingPayment[]
  stats: { expiredCount: number; expiredAmount: number }
}> {
  try {
    console.log("Getting pending payments...")

    // Actualizar estados antes de consultar
    await updateMembershipStatuses()

    // Obtener fecha actual de Uruguay para cálculos consistentes
    const todayUruguay = getTodayLocalDate()

    console.log("🗓️ Pending Payments - Fecha actual Uruguay:", todayUruguay)

    // CONSULTA CORREGIDA: Incluir socios 'active' que ya vencieron Y socios 'expired'
    // Esto hace que sea consistente con "Vencimientos Próximos"
    const pendingPayments = await sql`
      SELECT 
        m.id as member_id,
        m.name as member_name,
        m.email,
        m.phone,
        m.status,
        m.expiry_date,
        m.last_payment_date,
        ms.name as membership_name,
        ms.price as amount_due,
        CASE 
          WHEN m.expiry_date::date < ${todayUruguay}::date THEN 
            (${todayUruguay}::date - m.expiry_date::date)
          ELSE 0
        END as days_overdue
      FROM members m
      LEFT JOIN memberships ms ON m.membership_id = ms.id
      WHERE (
        -- Socios expired (ya procesados por updateMembershipStatuses)
        m.status = 'expired' 
        OR 
        -- Socios active pero que ya vencieron (misma lógica que vencimientos próximos)
        (m.status = 'active' AND m.expiry_date::date < ${todayUruguay}::date)
      )
      AND m.expiry_date IS NOT NULL
      ORDER BY m.expiry_date ASC
    `

    console.log("Pending payments query result:", pendingPayments)

    // Filtrar solo los que realmente están vencidos (days_overdue > 0)
    const actuallyOverdue = pendingPayments.filter((payment) => Number(payment.days_overdue) > 0)

    // Calcular estadísticas usando los datos filtrados
    const expiredCount = actuallyOverdue.length
    const expiredAmount = actuallyOverdue.reduce((sum, payment) => sum + Number(payment.amount_due || 0), 0)

    console.log("Calculated stats:", {
      expiredCount,
      expiredAmount,
      totalFound: pendingPayments.length,
      actuallyOverdue: actuallyOverdue.length,
    })

    const result = {
      payments: actuallyOverdue as PendingPayment[],
      stats: {
        expiredCount,
        expiredAmount,
      },
    }

    // Cache por menos tiempo para datos críticos
    setCache("pending_payments", result)
    return result
  } catch (error) {
    console.error("Error getting pending payments:", error)
    return {
      payments: [],
      stats: { expiredCount: 0, expiredAmount: 0 },
    }
  }
}

export async function getMemberById(id: number): Promise<Member | null> {
  try {
    const result = await sql`
      SELECT 
        m.id, m.name, m.email, m.phone, m.document_id, m.gender, m.birth_date,
        m.address, m.emergency_contact, m.notes, m.membership_id,
        m.status, m.join_date, m.expiry_date, m.last_payment_date,
        m.inactive_since, m.auto_suspended,
        ms.name as membership_name, ms.price as monthly_fee
      FROM members m
      LEFT JOIN memberships ms ON m.membership_id = ms.id
      WHERE m.id = ${id}
      LIMIT 1
    `
    return result[0] || null
  } catch (error) {
    console.error("Error getting member by id:", error)
    return null
  }
}

export async function createMember(
  memberData: Omit<Member, "id" | "membership_name" | "monthly_fee" | "inactive_since" | "auto_suspended">,
): Promise<Member> {
  try {
    // Validaciones robustas
    if (!memberData.name?.trim()) {
      throw new Error("El nombre del socio es obligatorio")
    }

    if (!memberData.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(memberData.email)) {
      throw new Error("Email inválido")
    }

    if (!memberData.membership_id || memberData.membership_id <= 0) {
      throw new Error("Debe seleccionar una membresía válida")
    }

    if (!memberData.join_date || !memberData.expiry_date) {
      throw new Error("Las fechas de inicio y vencimiento son obligatorias")
    }

    // Verificar que la membresía existe y está activa - CORREGIDO
    console.log(`Verificando membresía ID: ${memberData.membership_id}`)

    const membershipExists = await sql`
      SELECT id, name, price, duration_days, is_active 
      FROM memberships 
      WHERE id = ${memberData.membership_id}
    `

    console.log(`Resultado de verificación de membresía:`, membershipExists)

    if (membershipExists.length === 0) {
      throw new Error(`La membresía con ID ${memberData.membership_id} no existe`)
    }

    const membership = membershipExists[0]
    if (!membership.is_active) {
      throw new Error(`La membresía "${membership.name}" está inactiva`)
    }

    // Verificar email duplicado
    const emailExists = await sql`
      SELECT id FROM members WHERE LOWER(email) = LOWER(${memberData.email}) AND id != ${memberData.id || 0}
    `

    if (emailExists.length > 0) {
      throw new Error("Ya existe un socio con este email")
    }

    const result = await sql`
      INSERT INTO members (
        name, email, phone, document_id, gender, birth_date, address, 
        emergency_contact, notes, membership_id, status, join_date, expiry_date
      ) VALUES (
        ${memberData.name.trim()}, ${memberData.email.toLowerCase().trim()}, ${memberData.phone?.trim() || ""}, 
        ${memberData.document_id?.trim() || ""}, ${memberData.gender || "no_especificado"}, ${memberData.birth_date}, ${memberData.address?.trim() || ""},
        ${memberData.emergency_contact?.trim() || ""}, ${memberData.notes?.trim() || ""}, ${memberData.membership_id},
        ${memberData.status || "active"}, ${memberData.join_date}, ${memberData.expiry_date}
      )
      RETURNING *
    `

    if (!result[0]) {
      throw new Error("No se pudo crear el socio")
    }

    cache.clear()
    return result[0]
  } catch (error) {
    console.error("Error creating member:", error)
    throw error
  }
}

export async function updateMember(id: number, memberData: Partial<Member>): Promise<Member | null> {
  try {
    const validFields = [
      "name",
      "email",
      "phone",
      "document_id",
      "gender", // Agregar esta línea
      "birth_date",
      "address",
      "emergency_contact",
      "notes",
      "membership_id",
      "status",
      "expiry_date",
      "last_payment_date",
      "inactive_since",
      "auto_suspended",
    ]

    const updates: any = {}
    Object.entries(memberData).forEach(([key, value]) => {
      if (validFields.includes(key)) {
        updates[key] = value
      }
    })

    if (Object.keys(updates).length === 0) return null

    const result = await sql`
      UPDATE members 
      SET ${sql(updates)}
      WHERE id = ${id}
      RETURNING *
    `

    cache.clear()
    return result[0] || null
  } catch (error) {
    console.error("Error updating member:", error)
    return null
  }
}

export async function deleteMember(id: number): Promise<boolean> {
  try {
    const result = await sql`DELETE FROM members WHERE id = ${id}`
    cache.clear()
    return result.count > 0
  } catch (error) {
    console.error("Error deleting member:", error)
    return false
  }
}

// Función para suspender/reactivar socios
export async function suspendMember(id: number, reason: string): Promise<boolean> {
  try {
    await sql`
      UPDATE members 
      SET status = 'suspended', 
          inactive_since = CURRENT_DATE,
          notes = CONCAT(COALESCE(notes, ''), '\n[', CURRENT_DATE, '] Suspendido: ', ${reason})
      WHERE id = ${id}
    `
    cache.clear()
    return true
  } catch (error) {
    console.error("Error suspending member:", error)
    return false
  }
}

export async function reactivateMember(id: number): Promise<boolean> {
  try {
    await sql`
      UPDATE members 
      SET status = 'expired', 
          inactive_since = NULL,
          auto_suspended = FALSE
      WHERE id = ${id}
    `
    cache.clear()
    return true
  } catch (error) {
    console.error("Error reactivating member:", error)
    return false
  }
}

// FUNCIÓN UNIFICADA: Membresías - Ahora todas las funciones usan la misma lógica
async function fetchMembershipsFromDB(includeInactive = false): Promise<Membership[]> {
  try {
    console.log(`Fetching memberships from database (includeInactive: ${includeInactive})...`)

    const whereClause = includeInactive ? "" : "WHERE is_active = true"

    const result = await sql.unsafe(`
      SELECT 
        id, 
        name, 
        description, 
        price, 
        duration_days, 
        is_active,
        (SELECT COUNT(*) FROM members WHERE membership_id = memberships.id) as members_count
      FROM memberships 
      ${whereClause}
      ORDER BY price ASC, name ASC
    `)

    console.log("Raw memberships result:", result)

    // Convertir y validar datos
    const validatedResult = result
      .filter((membership) => {
        const hasRequiredFields =
          membership && membership.id && membership.name && membership.price && membership.duration_days

        if (!hasRequiredFields) {
          console.warn("Membership missing required fields:", membership)
          return false
        }

        const price =
          typeof membership.price === "string" ? Number.parseFloat(membership.price) : Number(membership.price)
        const durationDays =
          typeof membership.duration_days === "string"
            ? Number.parseInt(membership.duration_days, 10)
            : Number(membership.duration_days)

        const isValid = Number.isFinite(price) && price > 0 && Number.isInteger(durationDays) && durationDays > 0

        if (!isValid) {
          console.warn("Invalid membership filtered out:", {
            ...membership,
            price_parsed: price,
            duration_days_parsed: durationDays,
          })
        }

        return isValid
      })
      .map((membership) => ({
        id: Number(membership.id),
        name: String(membership.name),
        description: String(membership.description || ""),
        price: typeof membership.price === "string" ? Number.parseFloat(membership.price) : Number(membership.price),
        duration_days:
          typeof membership.duration_days === "string"
            ? Number.parseInt(membership.duration_days, 10)
            : Number(membership.duration_days),
        is_active: Boolean(membership.is_active),
        members_count: Number(membership.members_count || 0),
      }))

    console.log("Validated memberships:", validatedResult)
    return validatedResult
  } catch (error) {
    console.error("Error fetching memberships from DB:", error)
    throw error
  }
}

// Función para obtener solo membresías activas (para formularios)
export async function getMemberships(): Promise<Membership[]> {
  try {
    // NO usar cache para esta función crítica
    console.log("getMemberships() called - fetching active memberships only")
    return await fetchMembershipsFromDB(false)
  } catch (error) {
    console.error("Error getting active memberships:", error)
    // Fallback en caso de error
    return []
  }
}

// Función para obtener todas las membresías (para administración)
export async function getAllMemberships(): Promise<Membership[]> {
  try {
    const cacheKey = "all_memberships"
    const cached = getCached<Membership[]>(cacheKey)
    if (cached) {
      console.log("Returning cached all memberships")
      return cached
    }

    console.log("getAllMemberships() called - fetching all memberships")
    const result = await fetchMembershipsFromDB(true)

    setCache(cacheKey, result)
    return result
  } catch (error) {
    console.error("Error getting all memberships:", error)
    return []
  }
}

// Función para crear membresías por defecto
async function createDefaultMemberships(): Promise<void> {
  try {
    console.log("Creating default memberships...")

    const defaultMemberships = [
      { name: "Básico", description: "Membresía básica mensual", price: 1200, duration_days: 30 },
      { name: "Estudiante", description: "Membresía especial para estudiantes", price: 1500, duration_days: 30 },
      { name: "Premium", description: "Membresía premium con beneficios", price: 2500, duration_days: 30 },
      { name: "VIP", description: "Membresía VIP con acceso completo", price: 4500, duration_days: 30 },
      { name: "Anual Premium", description: "Membresía anual con descuento", price: 24000, duration_days: 365 },
    ]

    for (const membership of defaultMemberships) {
      await sql`
        INSERT INTO memberships (name, description, price, duration_days, is_active)
        VALUES (${membership.name}, ${membership.description}, ${membership.price}, ${membership.duration_days}, true)
        ON CONFLICT (name) DO NOTHING
      `
    }

    console.log("Default memberships created successfully")
    clearMembershipsCache() // Limpiar cache después de crear
  } catch (error) {
    console.error("Error creating default memberships:", error)
  }
}

// Pagos
export async function createPayment(paymentData: Omit<Payment, "id">): Promise<Payment> {
  try {
    const result = await sql`
      INSERT INTO payments (
        member_id, amount, payment_date, payment_method, 
        description, membership_id, start_date, end_date, created_by
      ) VALUES (
        ${paymentData.member_id}, ${paymentData.amount}, ${paymentData.payment_date},
        ${paymentData.payment_method}, ${paymentData.description}, ${paymentData.membership_id},
        ${paymentData.start_date}, ${paymentData.end_date}, ${paymentData.created_by}
      )
      RETURNING *
    `

    // Actualizar la fecha de vencimiento del socio y reactivarlo si estaba suspendido
    await sql`
      UPDATE members 
      SET expiry_date = ${paymentData.end_date}, 
          status = 'active', 
          last_payment_date = ${paymentData.payment_date},
          inactive_since = NULL,
          auto_suspended = FALSE
      WHERE id = ${paymentData.member_id}
    `

    cache.clear()
    return result[0]
  } catch (error) {
    console.error("Error creating payment:", error)
    throw error
  }
}

export async function getMemberPayments(memberId: number): Promise<Payment[]> {
  try {
    const result = await sql`
      SELECT p.*, u.name as created_by_name, m.name as membership_name
      FROM payments p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN memberships m ON p.membership_id = m.id
      WHERE p.member_id = ${memberId}
      ORDER BY p.payment_date DESC
      LIMIT 50
    `
    return result
  } catch (error) {
    console.error("Error getting member payments:", error)
    return []
  }
}

// Función MEJORADA para obtener estadísticas del Dashboard - AHORA USA FECHAS CONSISTENTES
export async function getDashboardStats(): Promise<DashboardStats> {
  const maxRetries = 2
  let retryCount = 0

  while (retryCount < maxRetries) {
    try {
      console.log("🚀 Getting dashboard stats...")

      const cached = getCached<DashboardStats>("dashboard_stats")
      if (cached) {
        console.log("📊 Returning cached dashboard stats")
        return cached
      }

      // Debug de fechas
      debugDate("Dashboard Stats")

      // Obtener fechas consistentes usando las mismas utilidades que el modal
      const currentMonthStart = getCurrentMonthStart()
      const previousMonthStart = getPreviousMonthStart()
      const previousMonthEnd = getPreviousMonthEnd()

      console.log("📊 Dashboard Stats - Fechas calculadas:", {
        currentMonthStart,
        previousMonthStart,
        previousMonthEnd,
      })

      // Actualizar estados de membresías primero con timeout
      const updatePromise = updateMembershipStatuses()
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout updating membership statuses")), 10000),
      )

      try {
        await Promise.race([updatePromise, timeoutPromise])
      } catch (error) {
        console.warn("⚠️ Warning: Could not update membership statuses:", error)
      }

      // USAR LA MISMA FUNCIÓN que usa el modal para consistencia
      const pendingData = await getPendingPayments()

      // Obtener estadísticas con queries más robustas usando fechas consistentes - MISMA LÓGICA QUE EL MODAL
      const [memberStats, revenueStats] = await Promise.allSettled([
        sql`
          SELECT 
            COUNT(*) FILTER (WHERE status = 'active') as active_members,
            COUNT(*) FILTER (WHERE join_date >= ${currentMonthStart}) as new_members_this_month,
            COUNT(*) FILTER (WHERE status = 'active' AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '7 days') as expiring_memberships,
            COUNT(*) FILTER (WHERE status = 'suspended') as suspended_members,
            COUNT(*) FILTER (WHERE status = 'inactive') as inactive_members
          FROM members
        `,
        // USAR EXACTAMENTE LA MISMA CONSULTA QUE EL MODAL DE INGRESOS MENSUALES
        sql`
          SELECT 
            COALESCE(SUM(amount) FILTER (WHERE payment_date >= ${currentMonthStart}), 0) as monthly_revenue,
            COALESCE(SUM(amount) FILTER (WHERE payment_date >= ${previousMonthStart} AND payment_date <= ${previousMonthEnd}), 0) as previous_month_revenue
          FROM payments
        `,
      ])

      // Procesar resultados con valores por defecto
      const memberStatsRow = memberStats.status === "fulfilled" ? memberStats.value[0] || {} : {}
      const revenueStatsRow = revenueStats.status === "fulfilled" ? revenueStats.value[0] || {} : {}

      // Calcular crecimiento de ingresos con validación - MISMA LÓGICA QUE EL MODAL
      const currentRevenue = Math.max(0, Number(revenueStatsRow.monthly_revenue || 0))
      const previousRevenue = Math.max(0, Number(revenueStatsRow.previous_month_revenue || 0))
      const revenueGrowth =
        previousRevenue > 0 ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100 * 10) / 10 : 0

      const stats = {
        activeMembers: Math.max(0, Number(memberStatsRow.active_members || 0)),
        newMembersThisMonth: Math.max(0, Number(memberStatsRow.new_members_this_month || 0)),
        monthlyRevenue: currentRevenue, // USAR EL MISMO CÁLCULO QUE EL MODAL
        revenueGrowth: Math.max(-100, Math.min(1000, revenueGrowth)),
        pendingPayments: pendingData.stats.expiredAmount,
        pendingPaymentsCount: pendingData.stats.expiredCount,
        expiringMemberships: Math.max(0, Number(memberStatsRow.expiring_memberships || 0)),
        suspendedMembers: Math.max(0, Number(memberStatsRow.suspended_members || 0)),
        inactiveMembers: Math.max(0, Number(memberStatsRow.inactive_members || 0)),
        realDebtAmount: pendingData.stats.expiredAmount,
      }

      console.log("💰 Dashboard stats calculated:", stats)
      console.log(
        "💰 Revenue comparison - Current:",
        currentRevenue,
        "Previous:",
        previousRevenue,
        "Growth:",
        revenueGrowth,
      )

      setCache("dashboard_stats", stats)
      return stats
    } catch (error) {
      retryCount++
      console.error(`❌ Error getting dashboard stats (attempt ${retryCount}/${maxRetries}):`, error)

      if (retryCount >= maxRetries) {
        console.warn("⚠️ Returning default dashboard stats due to persistent errors")
        return {
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
      }

      await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount))
    }
  }

  // Fallback
  return {
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
}

// Función para obtener datos de ingresos con fechas consistentes
export async function getRevenueData(months = 6): Promise<{ month: string; revenue: number }[]> {
  try {
    const cached = getCached<{ month: string; revenue: number }[]>(`revenue_${months}`)
    if (cached) return cached

    // Usar zona horaria de Uruguay para calcular los meses
    const now = new Date()
    const uruguayTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Montevideo" }))

    // Calcular el inicio del período (hace X meses)
    const startDate = new Date(uruguayTime)
    startDate.setMonth(startDate.getMonth() - (months - 1))
    startDate.setDate(1) // Primer día del mes

    const startDateStr = `${startDate.getFullYear()}-${(startDate.getMonth() + 1).toString().padStart(2, "0")}-01`

    console.log("📊 Revenue Data - Calculando desde:", startDateStr)

    const result = await sql`
      WITH month_series AS (
        SELECT generate_series(
          ${startDateStr}::date,
          date_trunc('month', CURRENT_DATE),
          interval '1 month'
        ) as month_start
      )
      SELECT 
        to_char(month_start, 'Mon') as month,
        COALESCE(SUM(p.amount), 0)::numeric as revenue
      FROM month_series ms
      LEFT JOIN payments p ON 
        p.payment_date >= ms.month_start AND 
        p.payment_date < ms.month_start + interval '1 month'
      GROUP BY ms.month_start
      ORDER BY ms.month_start
    `

    const data = result.map((row) => ({
      month: row.month,
      revenue: Number(row.revenue),
    }))

    console.log("📊 Revenue Data - Resultado:", data)

    setCache(`revenue_${months}`, data)
    return data
  } catch (error) {
    console.error("Error getting revenue data:", error)
    return []
  }
}

// Función CORREGIDA para actualizar el estado de las membresías basada en PAGOS
export async function updateMembershipStatuses(): Promise<void> {
  try {
    // Obtener configuración del sistema
    let systemConfig
    try {
      const configResult = await sql`
        SELECT grace_period_days, auto_suspend_days, auto_inactive_days 
        FROM system_config 
        ORDER BY id DESC 
        LIMIT 1
      `
      systemConfig = configResult[0] || {
        grace_period_days: 7,
        auto_suspend_days: 45,
        auto_inactive_days: 90,
      }
    } catch (error) {
      console.warn("Could not load system config, using defaults:", error)
      systemConfig = {
        grace_period_days: 7,
        auto_suspend_days: 45,
        auto_inactive_days: 90,
      }
    }

    console.log("Using system config for membership status updates:", systemConfig)

    // 1. Actualizar socios vencidos (después del período de gracia)
    await sql`
      UPDATE members
      SET status = 'expired'
      WHERE status = 'active' 
      AND expiry_date < CURRENT_DATE - INTERVAL '${sql.unsafe(systemConfig.grace_period_days.toString())} days'
    `

    // 2. Suspender automáticamente socios vencidos según configuración
    await sql`
      UPDATE members
      SET status = 'suspended', 
          auto_suspended = TRUE,
          inactive_since = expiry_date + INTERVAL '${sql.unsafe(systemConfig.auto_suspend_days.toString())} days'
      WHERE status = 'expired' 
      AND expiry_date < CURRENT_DATE - INTERVAL '${sql.unsafe(systemConfig.auto_suspend_days.toString())} days'
      AND auto_suspended = FALSE
    `

    // 3. Marcar como inactivos según configuración del sistema
    await sql`
      UPDATE members
      SET status = 'inactive',
          inactive_since = CASE 
            WHEN inactive_since IS NULL THEN last_payment_date + INTERVAL '${sql.unsafe(systemConfig.auto_inactive_days.toString())} days'
            ELSE inactive_since 
          END
      WHERE status IN ('suspended', 'expired')
      AND (
        last_payment_date IS NULL OR 
        last_payment_date < CURRENT_DATE - INTERVAL '${sql.unsafe(systemConfig.auto_inactive_days.toString())} days'
      )
    `

    console.log("Membership statuses updated successfully using system configuration")
  } catch (error) {
    console.error("Error updating membership statuses:", error)
    throw error
  }
}

// Función para obtener configuración del sistema
export async function getSystemConfig(): Promise<{
  grace_period_days: number
  auto_suspend_days: number
  auto_inactive_days: number
  enable_notifications: boolean
  enable_auto_reports: boolean
  allow_partial_payments: boolean
  require_member_photo: boolean
  theme_mode: string
}> {
  try {
    const result = await sql`
      SELECT * FROM system_config 
      ORDER BY id DESC 
      LIMIT 1
    `

    if (result.length === 0) {
      // Crear configuración por defecto si no existe
      const defaultConfig = await sql`
        INSERT INTO system_config (
          grace_period_days,
          auto_suspend_days,
          auto_inactive_days,
          enable_notifications,
          enable_auto_reports,
          allow_partial_payments,
          require_member_photo,
          theme_mode
        ) VALUES (7, 45, 90, true, false, false, true, 'system')
        RETURNING *
      `
      return defaultConfig[0]
    }

    return result[0]
  } catch (error) {
    console.error("Error getting system config:", error)
    // Retornar valores por defecto en caso de error
    return {
      grace_period_days: 7,
      auto_suspend_days: 45,
      auto_inactive_days: 90,
      enable_notifications: true,
      enable_auto_reports: false,
      allow_partial_payments: false,
      require_member_photo: true,
      theme_mode: "system",
    }
  }
}

// Función para registrar asistencia (mantenida para compatibilidad futura)
export async function recordAttendance(memberId: number): Promise<Attendance | null> {
  try {
    const memberResult = await sql`
      SELECT * FROM members WHERE id = ${memberId} AND status IN ('active', 'expired', 'suspended', 'inactive', 'cancelled')
    `

    if (memberResult.length === 0) {
      return null
    }

    const openAttendanceResult = await sql`
      SELECT * FROM attendance 
      WHERE member_id = ${memberId} AND check_out IS NULL
      ORDER BY check_in DESC LIMIT 1
    `

    if (openAttendanceResult.length > 0) {
      // Check-out
      const result = await sql`
        UPDATE attendance 
        SET check_out = NOW() 
        WHERE id = ${openAttendanceResult[0].id}
        RETURNING *
      `
      return result[0]
    } else {
      // Check-in
      const result = await sql`
        INSERT INTO attendance (member_id, check_in)
        VALUES (${memberId}, NOW())
        RETURNING *
      `
      return result[0]
    }
  } catch (error) {
    console.error("Error recording attendance:", error)
    return null
  }
}

export async function getMemberAttendance(memberId: number, limit = 10): Promise<Attendance[]> {
  try {
    const result = await sql`
      SELECT * FROM attendance
      WHERE member_id = ${memberId}
      ORDER BY check_in DESC
      LIMIT ${limit}
    `
    return result
  } catch (error) {
    console.error("Error getting member attendance:", error)
    return []
  }
}

export async function closeConnection() {
  await sql.end()
}
