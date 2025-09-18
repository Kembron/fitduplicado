import { NextResponse } from "next/server"
import { suspendMember, getMemberById } from "@/lib/database"
import { getSession } from "@/lib/auth"
import { logAuditEvent } from "@/lib/audit"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const memberId = Number.parseInt(id)
    const { reason } = await request.json()

    // Obtener datos del socio antes de suspender
    const member = await getMemberById(memberId)
    if (!member) {
      return NextResponse.json({ error: "Socio no encontrado" }, { status: 404 })
    }

    const success = await suspendMember(memberId, reason)

    if (success) {
      // Registrar evento de auditoría
      await logAuditEvent({
        userId: session.user.userId,
        action: "SUSPEND",
        tableName: "members",
        recordId: memberId,
        details: `Socio suspendido: ${member.name}. Motivo: ${reason}`,
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      })

      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: "Error al suspender socio" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error suspending member:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
