import { NextResponse } from "next/server"
import { sql, clearMembershipsCache } from "@/lib/database"
import { getSession } from "@/lib/auth"
import type { NextRequest } from "next/server"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id: idParam } = await params
    const id = Number.parseInt(idParam, 10)
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const body = await request.json()
    const { name, description, price, duration_days, is_active } = body

    // Validaciones
    if (name !== undefined) {
      if (!name || typeof name !== "string" || name.trim().length < 3) {
        return NextResponse.json({ error: "El nombre debe tener al menos 3 caracteres" }, { status: 400 })
      }
    }

    if (price !== undefined) {
      if (!price || typeof price !== "number" || price <= 0 || price > 1000000) {
        return NextResponse.json({ error: "El precio debe ser un número entre 1 y 1,000,000" }, { status: 400 })
      }
    }

    if (duration_days !== undefined) {
      if (!duration_days || typeof duration_days !== "number" || duration_days <= 0 || duration_days > 3650) {
        return NextResponse.json({ error: "La duración debe ser entre 1 y 3650 días" }, { status: 400 })
      }
    }

    // Verificar que la membresía existe
    const existingMembership = await sql`
      SELECT * FROM memberships WHERE id = ${id}
    `

    if (existingMembership.length === 0) {
      return NextResponse.json({ error: "Membresía no encontrada" }, { status: 404 })
    }

    // Verificar nombre duplicado (si se está cambiando el nombre)
    if (name && name.trim() !== existingMembership[0].name) {
      const duplicateName = await sql`
        SELECT id FROM memberships WHERE LOWER(name) = LOWER(${name.trim()}) AND id != ${id}
      `

      if (duplicateName.length > 0) {
        return NextResponse.json({ error: "Ya existe una membresía con ese nombre" }, { status: 409 })
      }
    }

    // Construir objeto de actualización
    const updates: any = {}
    if (name !== undefined) updates.name = name.trim()
    if (description !== undefined) updates.description = description?.trim() || ""
    if (price !== undefined) updates.price = price
    if (duration_days !== undefined) updates.duration_days = duration_days
    if (is_active !== undefined) updates.is_active = Boolean(is_active)

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 })
    }

    // Actualizar la membresía
    const result = await sql`
      UPDATE memberships 
      SET ${sql(updates)}
      WHERE id = ${id}
      RETURNING *
    `

    console.log("Membresía actualizada:", result[0])

    // IMPORTANTE: Limpiar cache después de actualizar
    clearMembershipsCache()

    // Formatear la respuesta
    const formattedMembership = {
      id: Number(result[0].id),
      name: String(result[0].name),
      description: String(result[0].description || ""),
      price: Number(result[0].price),
      duration_days: Number(result[0].duration_days),
      is_active: Boolean(result[0].is_active),
    }

    // Incluir evento en la respuesta
    return NextResponse.json({
      ...formattedMembership,
      _event: is_active !== undefined ? "membership_status_changed" : "membership_updated",
    })
  } catch (error) {
    console.error("Error updating membership:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id: idParam } = await params
    const id = Number.parseInt(idParam, 10)
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    // Verificar que la membresía existe
    const existingMembership = await sql`
      SELECT * FROM memberships WHERE id = ${id}
    `

    if (existingMembership.length === 0) {
      return NextResponse.json({ error: "Membresía no encontrada" }, { status: 404 })
    }

    // Verificar si hay socios asociados
    const associatedMembers = await sql`
      SELECT COUNT(*) as count FROM members WHERE membership_id = ${id}
    `

    if (Number(associatedMembers[0].count) > 0) {
      return NextResponse.json(
        {
          error: `No se puede eliminar la membresía porque tiene ${associatedMembers[0].count} socios asociados. Desactívala en su lugar.`,
        },
        { status: 409 },
      )
    }

    // Eliminar la membresía
    await sql`
      DELETE FROM memberships WHERE id = ${id}
    `

    console.log("Membresía eliminada:", id)

    // IMPORTANTE: Limpiar cache después de eliminar
    clearMembershipsCache()

    // Incluir evento en la respuesta
    return NextResponse.json({
      message: "Membresía eliminada exitosamente",
      _event: "membership_deleted",
      _membershipId: id,
    })
  } catch (error) {
    console.error("Error deleting membership:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
