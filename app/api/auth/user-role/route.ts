import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth-optimized"

export async function GET() {
  try {
    console.log("API user-role: Starting request...")

    const role = await getUserRole()
    console.log("API user-role: Role fetched:", role)

    if (!role) {
      console.log("API user-role: No role found, returning 401")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    console.log("API user-role: Returning role:", role)
    return NextResponse.json({ role })
  } catch (error) {
    console.error("API user-role: Error fetching user role:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
