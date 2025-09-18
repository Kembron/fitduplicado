import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/database"
import { logAuditEvent } from "@/lib/audit"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const memberId = Number.parseInt(id)
    if (isNaN(memberId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const member = await sql`
      SELECT m.*, ms.name as membership_name, ms.price as membership_price
      FROM members m
      LEFT JOIN memberships ms ON m.membership_id = ms.id
      WHERE m.id = ${memberId}
    `

    if (member.length === 0) {
      return NextResponse.json({ error: "Socio no encontrado" }, { status: 404 })
    }

    return NextResponse.json(member[0])
  } catch (error) {
    console.error("Error getting member:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const memberId = Number.parseInt(id)
    if (isNaN(memberId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const data = await request.json()
    const { name, email, phone, membership_id, status } = data

    // Validaciones básicas
    if (!name?.trim()) {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 })
    }

    if (!email?.trim()) {
      return NextResponse.json({ error: "El email es requerido" }, { status: 400 })
    }

    // Obtener datos anteriores para auditoría
    const oldMember = await sql`
      SELECT * FROM members WHERE id = ${memberId}
    `

    if (oldMember.length === 0) {
      return NextResponse.json({ error: "Socio no encontrado" }, { status: 404 })
    }

    // Actualizar socio (sin updated_at porque no existe en tu esquema)
    const updatedMember = await sql`
      UPDATE members 
      SET 
        name = ${name.trim()},
        email = ${email.trim()},
        phone = ${phone || null},
        membership_id = ${membership_id || null},
        status = ${status || "active"}
      WHERE id = ${memberId}
      RETURNING *
    `

    // Registrar auditoría
    try {
      await logAuditEvent({
        user_id: session.user.userId,
        user_email: session.user.email,
        action_type: "UPDATE",
        table_name: "members",
        record_id: memberId,
        old_values: oldMember[0],
        new_values: updatedMember[0],
        description: `Socio actualizado: ${name}`,
        ip_address: request.headers.get("x-forwarded-for") || "unknown",
        user_agent: request.headers.get("user-agent") || "unknown",
      })
    } catch (auditError) {
      console.warn("Error logging audit:", auditError)
    }

    return NextResponse.json({
      success: true,
      member: updatedMember[0],
      message: "Socio actualizado exitosamente",
    })
  } catch (error) {
    console.error("Error updating member:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const memberId = Number.parseInt(id)
    if (isNaN(memberId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    // Obtener datos del socio antes de eliminar
    const member = await sql`
      SELECT * FROM members WHERE id = ${memberId}
    `

    if (member.length === 0) {
      return NextResponse.json({ error: "Socio no encontrado" }, { status: 404 })
    }

    // Marcar como inactivo en lugar de eliminar
    await sql`
      UPDATE members 
      SET status = 'inactive'
      WHERE id = ${memberId}
    `

    // Registrar auditoría
    try {
      await logAuditEvent({
        user_id: session.user.userId,
        user_email: session.user.email,
        action_type: "DELETE",
        table_name: "members",
        record_id: memberId,
        old_values: member[0],
        description: `Socio eliminado: ${member[0].name}`,
        ip_address: request.headers.get("x-forwarded-for") || "unknown",
        user_agent: request.headers.get("user-agent") || "unknown",
      })
    } catch (auditError) {
      console.warn("Error logging audit:", auditError)
    }

    return NextResponse.json({
      success: true,
      message: "Socio eliminado exitosamente",
    })
  } catch (error) {
    console.error("Error deleting member:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
