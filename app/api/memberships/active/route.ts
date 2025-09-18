import { NextResponse } from "next/server"
import { getAllMemberships } from "@/lib/database"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener solo membresías activas
    const memberships = await getAllMemberships()
    const activeMemberships = memberships.filter((m) => m.is_active)

    console.log("Active memberships fetched for filters:", activeMemberships.length)

    return NextResponse.json(activeMemberships)
  } catch (error) {
    console.error("Error fetching active memberships:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
