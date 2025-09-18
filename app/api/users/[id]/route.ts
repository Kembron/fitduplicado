import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database"
import bcrypt from "bcryptjs"
import { getSession } from "@/lib/auth"
import { logAuditEvent } from "@/lib/audit"

// Obtener un usuario específico
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const userId = Number.parseInt(id)
    if (isNaN(userId)) {
      return NextResponse.json({ error: "ID de usuario inválido" }, { status: 400 })
    }

    const user = await sql`
      SELECT id, name, email, username, role, created_at, last_login, is_active
      FROM users
      WHERE id = ${userId}
    `

    if (user.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    return NextResponse.json(user[0])
  } catch (error) {
    console.error("Error getting user:", error)
    return NextResponse.json({ error: "Error al obtener usuario" }, { status: 500 })
  }
}

// Actualizar un usuario
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const userId = Number.parseInt(id)
    if (isNaN(userId)) {
      return NextResponse.json({ error: "ID de usuario inválido" }, { status: 400 })
    }

    const body = await request.json()
    const { name, email, username, password, role, is_active } = body

    // Obtener usuario actual para comparar cambios
    const currentUser = await sql`SELECT * FROM users WHERE id = ${userId}`
    if (currentUser.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Preparar campos a actualizar
    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (email !== undefined) {
      // Verificar si el email ya existe en otro usuario
      const existingEmail = await sql`SELECT id FROM users WHERE LOWER(email) = LOWER(${email}) AND id != ${userId}`
      if (existingEmail.length > 0) {
        return NextResponse.json({ error: "El email ya está registrado por otro usuario" }, { status: 400 })
      }
      updates.email = email.toLowerCase()
    }
    if (username !== undefined) {
      // Validar formato de username
      if (username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
        return NextResponse.json(
          {
            error:
              "El nombre de usuario debe tener al menos 3 caracteres y solo contener letras, números y guiones bajos",
          },
          { status: 400 },
        )
      }

      // Verificar si el username ya existe en otro usuario
      const existingUsername =
        await sql`SELECT id FROM users WHERE LOWER(username) = LOWER(${username}) AND id != ${userId}`
      if (existingUsername.length > 0) {
        return NextResponse.json({ error: "El nombre de usuario ya está en uso por otro usuario" }, { status: 400 })
      }
      updates.username = username.toLowerCase()
    }
    if (role !== undefined) {
      if (!["admin", "manager"].includes(role)) {
        return NextResponse.json({ error: "Rol inválido" }, { status: 400 })
      }
      updates.role = role
    }
    if (is_active !== undefined) updates.is_active = is_active

    // Si se proporciona una nueva contraseña, encriptarla
    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 })
      }
      updates.password = await bcrypt.hash(password, 10)
    }

    // Actualizar usuario
    const result = await sql`
      UPDATE users
      SET ${sql(updates)}
      WHERE id = ${userId}
      RETURNING id, name, email, username, role, created_at, is_active
    `

    // Registrar en audit log
    await logAuditEvent({
      user_id: session.user.userId,
      user_email: session.user.email,
      action_type: "UPDATE",
      table_name: "users",
      record_id: userId,
      old_values: {
        name: currentUser[0].name,
        email: currentUser[0].email,
        username: currentUser[0].username,
        role: currentUser[0].role,
        is_active: currentUser[0].is_active,
      },
      new_values: updates,
      description: `Usuario actualizado: ${result[0].name} (@${result[0].username})`,
    })

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Error al actualizar usuario" }, { status: 500 })
  }
}

// Eliminar un usuario
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const userId = Number.parseInt(id)
    if (isNaN(userId)) {
      return NextResponse.json({ error: "ID de usuario inválido" }, { status: 400 })
    }

    // Verificar que no se esté eliminando a sí mismo
    if (session.user.userId === userId) {
      return NextResponse.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 400 })
    }

    // Obtener información del usuario antes de eliminarlo
    const userToDelete = await sql`SELECT * FROM users WHERE id = ${userId}`
    if (userToDelete.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Primero actualizar los audit_logs para no referenciar al usuario eliminado
    await sql`UPDATE audit_logs SET user_id = NULL WHERE user_id = ${userId}`

    // También actualizar los pagos para no referenciar al usuario eliminado
    await sql`UPDATE payments SET created_by = NULL WHERE created_by = ${userId}`

    // Luego eliminar usuario
    await sql`DELETE FROM users WHERE id = ${userId}`

    // Registrar en audit log
    await logAuditEvent({
      user_id: session.user.userId,
      user_email: session.user.email,
      action_type: "DELETE",
      table_name: "users",
      record_id: userId,
      old_values: {
        name: userToDelete[0].name,
        email: userToDelete[0].email,
        username: userToDelete[0].username,
        role: userToDelete[0].role,
      },
      description: `Usuario eliminado: ${userToDelete[0].name} (@${userToDelete[0].username})`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json({ error: "Error al eliminar usuario" }, { status: 500 })
  }
}
