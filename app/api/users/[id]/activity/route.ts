import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const userId = Number.parseInt(id)
    if (isNaN(userId)) {
      return NextResponse.json({ error: "ID de usuario inválido" }, { status: 400 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const offset = Number.parseInt(searchParams.get("offset") || "0")
    const actionType = searchParams.get("action_type") || ""

    // Obtener información del usuario
    const user = await sql`
      SELECT id, name, email, username, role, created_at, last_login, is_active
      FROM users
      WHERE id = ${userId}
    `

    if (user.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Construir filtro de tipo de acción
    let actionFilter = ""
    if (actionType && actionType !== "all") {
      actionFilter = `AND action_type = '${actionType}'`
    }

    // Obtener actividad del usuario
    const activity = await sql.unsafe(`
      SELECT 
        id,
        action_type,
        table_name,
        record_id,
        description,
        ip_address,
        user_agent,
        created_at
      FROM audit_logs
      WHERE user_id = ${userId} ${actionFilter}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `)

    // Obtener total de registros para paginación
    const totalResult = await sql.unsafe(`
      SELECT COUNT(*) as total
      FROM audit_logs
      WHERE user_id = ${userId} ${actionFilter}
    `)

    // Obtener estadísticas del usuario
    const stats = await sql`
      SELECT 
        COUNT(*) as total_actions,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as recent_actions,
        COUNT(*) FILTER (WHERE action_type = 'LOGIN') as login_count,
        COUNT(*) FILTER (WHERE action_type = 'CREATE') as create_count,
        COUNT(*) FILTER (WHERE action_type = 'UPDATE') as update_count,
        COUNT(*) FILTER (WHERE action_type = 'DELETE') as delete_count,
        MAX(created_at) as last_activity
      FROM audit_logs
      WHERE user_id = ${userId}
    `

    const response = {
      user: user[0],
      activity: activity,
      stats: stats[0] || {
        total_actions: 0,
        recent_actions: 0,
        login_count: 0,
        create_count: 0,
        update_count: 0,
        delete_count: 0,
        last_activity: null,
      },
      pagination: {
        total: Number(totalResult[0]?.total || 0),
        limit: limit,
        offset: offset,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error getting user activity:", error)
    return NextResponse.json({ error: "Error al obtener actividad del usuario" }, { status: 500 })
  }
}
