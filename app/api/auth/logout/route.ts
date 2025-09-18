import { NextResponse } from "next/server"
import { destroySession, getSession } from "@/lib/auth"
import { logAuditEvent } from "@/lib/audit"

export async function POST(request: Request) {
  try {
    // Obtener información del usuario antes de cerrar sesión
    const session = await getSession()

    // Obtener IP y User Agent para auditoría
    const ip_address = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    const user_agent = request.headers.get("user-agent") || "unknown"

    if (session?.user) {
      // Registrar logout
      await logAuditEvent({
        user_id: session.user.userId,
        user_email: session.user.email,
        action_type: "LOGOUT",
        description: `Logout de ${session.user.name}`,
        ip_address,
        user_agent,
      })
    }

    // Destruir la sesión
    await destroySession()

    // Obtener el host correcto del request
    const host = request.headers.get("host")
    const protocol = request.headers.get("x-forwarded-proto") || "https"

    // Construir URL absoluta correcta
    const loginUrl = `${protocol}://${host}/login`

    return NextResponse.redirect(loginUrl)
  } catch (error) {
    console.error("Logout error:", error)

    // En caso de error, también redirigir correctamente
    const host = request.headers.get("host")
    const protocol = request.headers.get("x-forwarded-proto") || "https"
    const loginUrl = `${protocol}://${host}/login`

    return NextResponse.redirect(loginUrl)
  }
}
