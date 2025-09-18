import { NextResponse } from "next/server"
import { createPayment } from "@/lib/database"
import { getSession } from "@/lib/auth"
import { logAuditEvent } from "@/lib/audit"

export async function POST(request: Request) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const paymentData = await request.json()

    // Asegurarse de que el pago incluya el ID del usuario que lo creó
    paymentData.created_by = session.user.userId

    const newPayment = await createPayment(paymentData)

    // Registrar evento de auditoría
    await logAuditEvent({
      user_id: session.user.userId,
      user_email: session.user.email,
      action_type: "PAYMENT",
      table_name: "payments",
      record_id: newPayment.id,
      new_values: paymentData,
      description: `Pago registrado: $${paymentData.amount} - Socio ID: ${paymentData.member_id} - Método: ${paymentData.payment_method}`,
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
      user_agent: request.headers.get("user-agent") || "unknown",
    })

    return NextResponse.json(newPayment, { status: 201 })
  } catch (error) {
    console.error("Error creating payment:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
