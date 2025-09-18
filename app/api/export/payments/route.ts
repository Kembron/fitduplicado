import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/database"
import { logAuditEvent } from "@/lib/audit"

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")
    const limit = searchParams.get("limit")

    // Construir query con filtros opcionales
    let whereClause = "WHERE 1=1"
    const queryParams: any[] = []

    if (startDate) {
      whereClause += " AND p.payment_date >= $" + (queryParams.length + 1)
      queryParams.push(startDate)
    }

    if (endDate) {
      whereClause += " AND p.payment_date <= $" + (queryParams.length + 1)
      queryParams.push(endDate)
    }

    let limitClause = ""
    if (limit && !isNaN(Number(limit))) {
      limitClause = " LIMIT $" + (queryParams.length + 1)
      queryParams.push(Number(limit))
    }

    // Obtener pagos con información relacionada
    const paymentsQuery = `
      SELECT 
        p.id,
        p.amount,
        p.payment_date,
        p.payment_method,
        p.description,
        p.start_date,
        p.end_date,
        p.created_at,
        m.name as member_name,
        m.email as member_email,
        m.phone as member_phone,
        m.document_id as member_document,
        ms.name as membership_name,
        ms.price as membership_price,
        u.name as created_by_name
      FROM payments p
      LEFT JOIN members m ON p.member_id = m.id
      LEFT JOIN memberships ms ON p.membership_id = ms.id
      LEFT JOIN users u ON p.created_by = u.id
      ${whereClause}
      ORDER BY p.payment_date DESC, p.created_at DESC
      ${limitClause}
    `

    const payments = await sql.unsafe(paymentsQuery, queryParams)

    // Preparar datos para Excel
    const excelData = payments.map((payment) => ({
      "ID Pago": payment.id,
      Socio: payment.member_name || "",
      "Email Socio": payment.member_email || "",
      "Teléfono Socio": payment.member_phone || "",
      "Documento Socio": payment.member_document || "",
      Monto: payment.amount,
      "Fecha Pago": payment.payment_date,
      "Método Pago": payment.payment_method,
      Descripción: payment.description || "",
      Membresía: payment.membership_name || "",
      "Precio Membresía": payment.membership_price || 0,
      "Fecha Inicio": payment.start_date || "",
      "Fecha Fin": payment.end_date || "",
      "Creado Por": payment.created_by_name || "",
      "Fecha Creación": payment.created_at,
    }))

    // Calcular estadísticas
    const totalAmount = payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
    const paymentMethods = payments.reduce(
      (acc, payment) => {
        acc[payment.payment_method] = (acc[payment.payment_method] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    // Registrar evento de auditoría
    await logAuditEvent({
      user_id: session.user.userId,
      user_email: session.user.email,
      action_type: "EXPORT",
      table_name: "payments",
      record_id: null,
      new_values: {
        export_type: "payments",
        count: payments.length,
        total_amount: totalAmount,
        date_range: { start_date: startDate, end_date: endDate },
      },
      description: `Exportación de ${payments.length} pagos a Excel (Total: $${totalAmount.toLocaleString()})`,
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
      user_agent: request.headers.get("user-agent") || "unknown",
    })

    return NextResponse.json({
      success: true,
      data: excelData,
      filename: `pagos_${startDate || "todos"}_${endDate || new Date().toISOString().split("T")[0]}.xlsx`,
      count: payments.length,
      statistics: {
        total_amount: totalAmount,
        payment_methods: paymentMethods,
        date_range: {
          start: startDate,
          end: endDate,
        },
      },
    })
  } catch (error) {
    console.error("Error exporting payments:", error)
    return NextResponse.json({ error: "Error al exportar pagos" }, { status: 500 })
  }
}
