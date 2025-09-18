import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const actionType = searchParams.get("actionType")
    const tableName = searchParams.get("tableName")
    const userEmail = searchParams.get("userEmail")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const offset = (page - 1) * limit

    console.log("Total de registros en audit_logs:", (await sql`SELECT COUNT(*) as count FROM audit_logs`)[0]?.count)

    // Verificar qué columnas existen en la tabla
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'audit_logs'
    `

    const columnNames = columns.map((col) => col.column_name)
    const hasUserName = columnNames.includes("user_name")

    console.log("Columnas disponibles:", columnNames)
    console.log("Tiene user_name:", hasUserName)

    // Construir la consulta base con las columnas disponibles
    const selectColumns = hasUserName
      ? `id, user_email, user_name, action_type, table_name, record_id, description, ip_address, created_at`
      : `id, user_email, user_email as user_name, action_type, table_name, record_id, description, ip_address, created_at`

    // Construir condiciones WHERE
    const whereConditions = []
    const queryParams = []
    let paramIndex = 1

    if (actionType) {
      whereConditions.push(`action_type = $${paramIndex}`)
      queryParams.push(actionType)
      paramIndex++
    }

    if (tableName) {
      whereConditions.push(`table_name = $${paramIndex}`)
      queryParams.push(tableName)
      paramIndex++
    }

    if (userEmail) {
      whereConditions.push(`user_email ILIKE $${paramIndex}`)
      queryParams.push(`%${userEmail}%`)
      paramIndex++
    }

    if (startDate) {
      whereConditions.push(`created_at >= $${paramIndex}`)
      queryParams.push(startDate)
      paramIndex++
    }

    if (endDate) {
      whereConditions.push(`created_at <= $${paramIndex}`)
      queryParams.push(endDate)
      paramIndex++
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : ""

    console.log("Ejecutando consulta de logs...")

    // Consulta principal con paginación
    const logsQuery = `
      SELECT ${selectColumns}
      FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    // Consulta de conteo
    const countQuery = `
      SELECT COUNT(*) as total
      FROM audit_logs
      ${whereClause}
    `

    // Ejecutar ambas consultas
    const [logsResult, countResult] = await Promise.all([
      sql.unsafe(logsQuery, [...queryParams, limit, offset]),
      sql.unsafe(countQuery, queryParams),
    ])

    const total = Number.parseInt(countResult[0]?.total || "0")
    const hasMore = offset + limit < total

    // Procesar los resultados para asegurar que user_name tenga un valor
    const processedLogs = logsResult.map((log) => ({
      ...log,
      user_name: log.user_name || log.user_email || "Usuario desconocido",
      description: log.description || "Sin descripción",
    }))

    return NextResponse.json({
      logs: processedLogs,
      total,
      page,
      hasMore,
      limit,
    })
  } catch (error) {
    console.error("Error en consulta de base de datos:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
