import { sql } from "@/lib/database"

export type AuditActionType =
  | "LOGIN"
  | "LOGOUT"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "VIEW"
  | "PAYMENT"
  | "SUSPEND"
  | "REACTIVATE"
  | "all"

export interface AuditLog {
  id: number
  user_id?: number
  user_email?: string
  user_name?: string
  action_type: AuditActionType
  table_name?: string
  record_id?: number
  old_values?: any
  new_values?: any
  description: string
  ip_address?: string
  user_agent?: string
  created_at: string
}

export interface AuditStats {
  total_logs: number
  today_logs: number
  login_count: number
  payment_count: number
}

// Función para registrar un evento de auditoría
export async function logAuditEvent({
  user_id,
  user_email,
  action_type,
  table_name,
  record_id,
  old_values,
  new_values,
  description,
  ip_address,
  user_agent,
}: {
  user_id?: number
  user_email?: string
  action_type: AuditActionType
  table_name?: string
  record_id?: number
  old_values?: any
  new_values?: any
  description: string
  ip_address?: string
  user_agent?: string
}) {
  try {
    await sql`
      INSERT INTO audit_logs (
        user_id, user_email, action_type, table_name, record_id,
        old_values, new_values, description, ip_address, user_agent
      ) VALUES (
        ${user_id || null},
        ${user_email || null},
        ${action_type},
        ${table_name || null},
        ${record_id || null},
        ${old_values ? JSON.stringify(old_values) : null},
        ${new_values ? JSON.stringify(new_values) : null},
        ${description},
        ${ip_address || null},
        ${user_agent || null}
      )
    `
    console.log("Audit event logged:", { action_type, description, user_email })
  } catch (error) {
    console.error("Error logging audit event:", error)
  }
}

// Función para obtener logs de auditoría con filtros
export async function getAuditLogs(options: {
  limit?: number
  offset?: number
  user_id?: number
  action_type?: AuditActionType
  table_name?: string
  date_from?: string
  date_to?: string
}): Promise<{ logs: AuditLog[]; total: number }> {
  try {
    const { limit = 50, offset = 0, user_id, action_type, table_name, date_from, date_to } = options

    const whereConditions = []
    const params: any[] = []

    if (user_id) {
      whereConditions.push(`user_id = $${params.length + 1}`)
      params.push(user_id)
    }

    if (action_type && action_type !== "all") {
      whereConditions.push(`action_type = $${params.length + 1}`)
      params.push(action_type)
    }

    if (table_name && table_name !== "all") {
      whereConditions.push(`table_name = $${params.length + 1}`)
      params.push(table_name)
    }

    if (date_from) {
      whereConditions.push(`created_at >= $${params.length + 1}`)
      params.push(date_from)
    }

    if (date_to) {
      whereConditions.push(`created_at <= $${params.length + 1}`)
      params.push(date_to)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : ""

    // Obtener el total de registros
    const totalResult = await sql.unsafe(`SELECT COUNT(*) as total FROM audit_logs ${whereClause}`, params)

    // Obtener los logs paginados
    const logsResult = await sql.unsafe(
      `
      SELECT 
        al.*,
        COALESCE(u.name, al.user_email, 'Sistema') as user_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `,
      [...params, limit, offset],
    )

    return {
      logs: logsResult || [],
      total: Number.parseInt(totalResult[0]?.total || "0"),
    }
  } catch (error) {
    console.error("Error getting audit logs:", error)
    return { logs: [], total: 0 }
  }
}

// Función para obtener estadísticas de auditoría
export async function getAuditStats(): Promise<AuditStats> {
  try {
    const [totalResult, todayResult, loginResult, paymentResult] = await Promise.all([
      sql`SELECT COUNT(*) as total FROM audit_logs`,
      sql`SELECT COUNT(*) as total FROM audit_logs WHERE created_at >= CURRENT_DATE`,
      sql`SELECT COUNT(*) as total FROM audit_logs WHERE action_type = 'LOGIN' AND created_at >= CURRENT_DATE - INTERVAL '7 days'`,
      sql`SELECT COUNT(*) as total FROM audit_logs WHERE action_type = 'PAYMENT' AND created_at >= CURRENT_DATE - INTERVAL '7 days'`,
    ])

    return {
      total_logs: Number.parseInt(totalResult[0]?.total || "0"),
      today_logs: Number.parseInt(todayResult[0]?.total || "0"),
      login_count: Number.parseInt(loginResult[0]?.total || "0"),
      payment_count: Number.parseInt(paymentResult[0]?.total || "0"),
    }
  } catch (error) {
    console.error("Error getting audit stats:", error)
    return {
      total_logs: 0,
      today_logs: 0,
      login_count: 0,
      payment_count: 0,
    }
  }
}
