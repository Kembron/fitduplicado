import { NextResponse } from "next/server"
import { getMemberAttendance } from "@/lib/database"
import { getSession } from "@/lib/auth"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const id = Number.parseInt(params.id)
    const attendance = await getMemberAttendance(id)

    return NextResponse.json(attendance)
  } catch (error) {
    console.error("Error fetching member attendance:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
