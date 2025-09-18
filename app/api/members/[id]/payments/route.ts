import { NextResponse } from "next/server"
import { getMemberPayments } from "@/lib/database"
import { getSession } from "@/lib/auth"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const memberId = Number.parseInt(id)
    const payments = await getMemberPayments(memberId)

    return NextResponse.json(payments)
  } catch (error) {
    console.error("Error fetching member payments:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
