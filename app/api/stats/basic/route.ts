import { NextResponse } from "next/server"
import { sql } from "@/lib/database"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    console.log("Fetching basic member statistics...")

    // Obtener estadísticas básicas de miembros
    const memberStats = await sql`
      SELECT 
        COUNT(*) as total_members,
        COUNT(*) FILTER (WHERE status = 'active') as active_members,
        COUNT(*) FILTER (WHERE status = 'expired') as expired_members,
        COUNT(*) FILTER (WHERE status = 'suspended') as suspended_members,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive_members,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_members
      FROM members
    `

    const stats = memberStats[0] || {}

    const result = {
      totalMembers: Number(stats.total_members || 0),
      activeMembers: Number(stats.active_members || 0),
      expiredMembers: Number(stats.expired_members || 0),
      suspendedMembers: Number(stats.suspended_members || 0),
      inactiveMembers: Number(stats.inactive_members || 0),
      cancelledMembers: Number(stats.cancelled_members || 0),
    }

    console.log("Basic stats result:", result)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching basic stats:", error)
    return NextResponse.json(
      { 
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    )
  }
}
