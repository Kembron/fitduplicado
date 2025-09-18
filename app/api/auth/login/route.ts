import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getUserByUsername } from "@/lib/database"
import jwt from "jsonwebtoken"
import { logAuditEvent } from "@/lib/audit"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    console.log("Login attempt for username:", username)

    // Obtener IP y User Agent para auditoría
    const ip_address = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    const user_agent = request.headers.get("user-agent") || "unknown"

    // Validar que se proporcionen username y password
    if (!username || !password) {
      console.log("Missing username or password")

      // Registrar intento de login fallido
      await logAuditEvent({
        user_email: username || "unknown",
        action_type: "LOGIN",
        description: "Intento de login fallido: Usuario o contraseña faltante",
        ip_address,
        user_agent,
      })

      return NextResponse.json({ error: "Usuario y contraseña son requeridos" }, { status: 400 })
    }

    // Buscar usuario en la base de datos por username
    const user = await getUserByUsername(username.toLowerCase().trim())

    if (!user) {
      console.log("User not found for username:", username)

      // Registrar intento de login fallido
      await logAuditEvent({
        user_email: username,
        action_type: "LOGIN",
        description: "Intento de login fallido: Usuario no encontrado",
        ip_address,
        user_agent,
      })

      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 })
    }

    console.log("User found:", {
      id: user.id,
      username: user.username,
      email: user.email,
      hasPassword: !!user.password,
    })

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password)
    console.log("Password validation result:", isValidPassword)

    if (!isValidPassword) {
      console.log("Invalid password for user:", username)

      // Registrar intento de login fallido
      await logAuditEvent({
        user_id: user.id,
        user_email: user.email,
        action_type: "LOGIN",
        description: "Intento de login fallido: Contraseña incorrecta",
        ip_address,
        user_agent,
      })

      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 })
    }

    // Crear JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
      },
      process.env.JWT_SECRET || "fithouse-secret-key",
      { expiresIn: "7d" },
    )

    console.log("Login successful for user:", username)

    // Registrar login exitoso
    await logAuditEvent({
      user_id: user.id,
      user_email: user.email,
      action_type: "LOGIN",
      description: `Login exitoso para ${user.name} (${user.username})`,
      ip_address,
      user_agent,
    })

    // Crear respuesta con cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    })

    // Establecer cookie en la respuesta
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 días
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
