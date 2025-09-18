import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database"
import bcrypt from "bcryptjs"
import { getSession } from "@/lib/auth"
import { logAuditEvent } from "@/lib/audit"

// Obtener todos los usuarios
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("query") || ""
    const role = searchParams.get("role") || ""

    let whereClause = ""
    const params: any[] = []

    if (query) {
      whereClause = "WHERE (name ILIKE $1 OR email ILIKE $1 OR username ILIKE $1)"
      params.push(`%${query}%`)
    }

    if (role) {
      if (whereClause) {
        whereClause += " AND role = $2"
        params.push(role)
      } else {
        whereClause = "WHERE role = $1"
        params.push(role)
      }
    }

    const users = await sql.unsafe(
      `
      SELECT 
        id, 
        name, 
        email, 
        username,
        role, 
        created_at,
        last_login,
        is_active
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
    `,
      params,
    )

    // Obtener estadísticas de actividad para cada usuario
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const activityStats = await sql`
          SELECT 
            COUNT(*) as total_actions,
            MAX(created_at) as last_activity,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as recent_actions
          FROM audit_logs
          WHERE user_id = ${user.id}
        `

        return {
          ...user,
          stats: activityStats[0] || { total_actions: 0, last_activity: null, recent_actions: 0 },
        }
      }),
    )

    return NextResponse.json(usersWithStats)
  } catch (error) {
    console.error("Error getting users:", error)
    return NextResponse.json({ error: "Error al obtener usuarios" }, { status: 500 })
  }
}

// Crear un nuevo usuario
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, username, password, role } = body

    // Validaciones
    if (!name || !email || !username || !password) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    if (!["admin", "manager"].includes(role)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 })
    }

    // Validar formato de username
    if (username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        {
          error:
            "El nombre de usuario debe tener al menos 3 caracteres y solo contener letras, números y guiones bajos",
        },
        { status: 400 },
      )
    }

    // Verificar si el email ya existe
    const existingEmail = await sql`SELECT id FROM users WHERE LOWER(email) = LOWER(${email})`
    if (existingEmail.length > 0) {
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 400 })
    }

    // Verificar si el username ya existe
    const existingUsername = await sql`SELECT id FROM users WHERE LOWER(username) = LOWER(${username})`
    if (existingUsername.length > 0) {
      return NextResponse.json({ error: "El nombre de usuario ya está en uso" }, { status: 400 })
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10)

    // Crear usuario
    const result = await sql`
      INSERT INTO users (name, email, username, password, role, is_active)
      VALUES (${name}, ${email.toLowerCase()}, ${username.toLowerCase()}, ${hashedPassword}, ${role}, true)
      RETURNING id, name, email, username, role, created_at, is_active
    `

    // Registrar en audit log
    await logAuditEvent({
      user_id: session.user.userId,
      user_email: session.user.email,
      action_type: "CREATE",
      table_name: "users",
      record_id: result[0].id,
      description: `Usuario creado: ${name} (@${username}) con rol ${role}`,
    })

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Error al crear usuario" }, { status: 500 })
  }
}
