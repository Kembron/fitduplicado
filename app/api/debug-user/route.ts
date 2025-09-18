import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    console.log("🔍 Debug-user API: Starting request...")

    const session = await getSession()
    console.log("🔍 Debug-user API: Session retrieved:", JSON.stringify(session, null, 2))

    if (!session) {
      console.log("❌ Debug-user API: No session found")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    console.log("✅ Debug-user API: Session found")
    console.log("🔍 Debug-user API: User object:", JSON.stringify(session.user, null, 2))
    console.log("🔍 Debug-user API: User role specifically:", session.user.role)
    console.log("🔍 Debug-user API: User role type:", typeof session.user.role)

    const response = {
      user: session.user,
      timestamp: new Date().toISOString(),
      debug: {
        hasUser: !!session.user,
        userKeys: Object.keys(session.user || {}),
        role: session.user?.role,
        roleType: typeof session.user?.role,
        email: session.user?.email,
      },
    }

    console.log("🔍 Debug-user API: Returning response:", JSON.stringify(response, null, 2))
    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ Debug-user API: Error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
