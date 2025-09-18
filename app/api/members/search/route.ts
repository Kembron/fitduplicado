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
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const query = searchParams.get("query")?.trim() || ""
    const status = searchParams.get("status")?.trim() || "all"
    const membership = searchParams.get("membership")?.trim() || "all"

    const offset = (page - 1) * limit

    // Construir condiciones WHERE
    const whereConditions = ["1=1"]
    const queryParams: any[] = []
    let paramIndex = 1

    // Filtro de búsqueda
    if (query) {
      whereConditions.push(`(
        m.name ILIKE $${paramIndex} OR 
        m.email ILIKE $${paramIndex} OR 
        m.phone ILIKE $${paramIndex} OR 
        m.document_id ILIKE $${paramIndex}
      )`)
      queryParams.push(`%${query}%`)
      paramIndex++
    }

    // Filtro de estado
    if (status !== "all") {
      whereConditions.push(`m.status = $${paramIndex}`)
      queryParams.push(status)
      paramIndex++
    }

    // Filtro de membresía
    if (membership !== "all") {
      whereConditions.push(`ms.name = $${paramIndex}`)
      queryParams.push(membership)
      paramIndex++
    }

    const whereClause = whereConditions.join(" AND ")

    // Consulta principal con paginación
    const membersQuery = `
      SELECT 
        m.id, m.name, m.email, m.phone, m.document_id, m.gender, m.birth_date,
        m.address, m.emergency_contact, m.notes, m.membership_id,
        m.status, m.join_date, m.expiry_date, m.last_payment_date,
        m.inactive_since, m.auto_suspended,
        ms.name as membership_name, ms.price as monthly_fee
      FROM members m
      LEFT JOIN memberships ms ON m.membership_id = ms.id
      WHERE ${whereClause}
      ORDER BY 
        CASE 
          WHEN m.status = 'active' THEN 1
          WHEN m.status = 'expired' THEN 2
          WHEN m.status = 'suspended' THEN 3
          WHEN m.status = 'inactive' THEN 4
          ELSE 5
        END,
        m.name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    // Consulta de conteo total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM members m
      LEFT JOIN memberships ms ON m.membership_id = ms.id
      WHERE ${whereClause}
    `

    // Ejecutar ambas consultas
    const [membersResult, countResult] = await Promise.all([
      sql.unsafe(membersQuery, [...queryParams, limit, offset]),
      sql.unsafe(countQuery, queryParams),
    ])

    const total = Number.parseInt(countResult[0]?.total || "0")
    const hasMore = offset + limit < total

    return NextResponse.json({
      members: membersResult,
      total,
      page,
      hasMore,
      limit,
    })
  } catch (error) {
    console.error("Error in members search:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
