import { NextResponse } from "next/server"
import { sql, clearMembershipsCache } from "@/lib/database"
import { getSession } from "@/lib/auth"
import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, price, duration_days } = body

    // Validaciones robustas
    if (!name || typeof name !== "string" || name.trim().length < 3) {
      return NextResponse.json({ error: "El nombre debe tener al menos 3 caracteres" }, { status: 400 })
    }

    if (!price || typeof price !== "number" || price <= 0 || price > 1000000) {
      return NextResponse.json({ error: "El precio debe ser un número entre 1 y 1,000,000" }, { status: 400 })
    }

    if (!duration_days || typeof duration_days !== "number" || duration_days <= 0 || duration_days > 3650) {
      return NextResponse.json({ error: "La duración debe ser entre 1 y 3650 días" }, { status: 400 })
    }

    // Verificar si ya existe una membresía con el mismo nombre
    const existingMembership = await sql`
      SELECT id FROM memberships WHERE LOWER(name) = LOWER(${name.trim()})
    `

    if (existingMembership.length > 0) {
      return NextResponse.json({ error: "Ya existe una membresía con ese nombre" }, { status: 409 })
    }

    // Crear la membresía
    const result = await sql`
      INSERT INTO memberships (name, description, price, duration_days, is_active)
      VALUES (${name.trim()}, ${description?.trim() || ""}, ${price}, ${duration_days}, true)
      RETURNING *
    `

    console.log("Membresía creada:", result[0])

    // IMPORTANTE: Limpiar cache después de crear
    clearMembershipsCache()

    // Formatear la respuesta
    const formattedMembership = {
      id: Number(result[0].id),
      name: String(result[0].name),
      description: String(result[0].description || ""),
      price: Number(result[0].price),
      duration_days: Number(result[0].duration_days),
      is_active: Boolean(result[0].is_active),
      members_count: 0,
    }

    // Incluir evento en la respuesta para que el cliente pueda manejarlo
    return NextResponse.json(
      {
        ...formattedMembership,
        _event: "membership_created",
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error creating membership:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    console.log("API: Fetching memberships...")

    // Obtener membresías con conteo de socios, ordenadas por precio
    const memberships = await sql`
      SELECT 
        m.id,
        m.name,
        m.description,
        m.price,
        m.duration_days,
        m.is_active,
        COUNT(mem.id) as members_count
      FROM memberships m
      LEFT JOIN members mem ON m.id = mem.membership_id
      GROUP BY m.id, m.name, m.description, m.price, m.duration_days, m.is_active
      ORDER BY m.price ASC, m.name ASC
    `

    console.log("API: Memberships fetched:", memberships.length)

    // Validar y formatear los datos
    const formattedMemberships = memberships.map((membership) => ({
      id: Number(membership.id),
      name: String(membership.name),
      description: String(membership.description || ""),
      price: typeof membership.price === "string" ? Number.parseFloat(membership.price) : Number(membership.price),
      duration_days:
        typeof membership.duration_days === "string"
          ? Number.parseInt(membership.duration_days, 10)
          : Number(membership.duration_days),
      is_active: Boolean(membership.is_active),
      members_count: Number(membership.members_count || 0),
    }))

    return NextResponse.json(formattedMemberships)
  } catch (error) {
    console.error("Error fetching memberships:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
