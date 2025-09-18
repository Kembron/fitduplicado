import { NextResponse } from "next/server"
import { recordAttendance } from "@/lib/database"
import { getSession } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { memberId } = await request.json()

    if (!memberId) {
      return NextResponse.json({ error: "ID de socio requerido" }, { status: 400 })
    }

    const attendance = await recordAttendance(memberId)

    if (!attendance) {
      return NextResponse.json({ error: "Socio no encontrado o inactivo" }, { status: 404 })
    }

    return NextResponse.json(attendance, { status: 201 })
  } catch (error) {
    console.error("Error recording attendance:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
