import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getMembers } from "@/lib/database"
import { logAuditEvent } from "@/lib/audit"

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener todos los socios (incluyendo inactivos para el export completo)
    const members = await getMembers({ includeInactive: true })

    // Preparar datos para Excel
    const excelData = members.map((member) => ({
      ID: member.id,
      Nombre: member.name,
      Email: member.email || "",
      Teléfono: member.phone || "",
      "Documento ID": member.document_id || "",
      "Fecha Nacimiento": member.birth_date || "",
      Dirección: member.address || "",
      "Contacto Emergencia": member.emergency_contact || "",
      Notas: member.notes || "",
      Membresía: member.membership_name || "",
      Estado: member.status,
      "Fecha Ingreso": member.join_date,
      "Fecha Vencimiento": member.expiry_date || "",
      "Último Pago": member.last_payment_date || "",
      "Cuota Mensual": member.monthly_fee || 0,
      "Inactivo Desde": member.inactive_since || "",
      "Auto Suspendido": member.auto_suspended ? "Sí" : "No",
    }))

    // Registrar evento de auditoría
    await logAuditEvent({
      user_id: session.user.userId,
      user_email: session.user.email,
      action_type: "EXPORT",
      table_name: "members",
      record_id: null,
      new_values: { export_type: "members", count: members.length },
      description: `Exportación de ${members.length} socios a Excel`,
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
      user_agent: request.headers.get("user-agent") || "unknown",
    })

    return NextResponse.json({
      success: true,
      data: excelData,
      filename: `socios_${new Date().toISOString().split("T")[0]}.xlsx`,
      count: members.length,
    })
  } catch (error) {
    console.error("Error exporting members:", error)
    return NextResponse.json({ error: "Error al exportar socios" }, { status: 500 })
  }
}
