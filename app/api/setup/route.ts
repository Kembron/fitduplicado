import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { createUser, getUserByEmail } from "@/lib/database"

export async function POST() {
  try {
    // Verificar si ya existe el usuario admin
    const existingUser = await getUserByEmail("admin@fithouse.com")

    if (existingUser) {
      return NextResponse.json({ message: "Usuario administrador ya existe" })
    }

    // Crear hash de la contraseña
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash("admin123", saltRounds)

    console.log("Creating admin user with password hash:", hashedPassword)

    // Crear usuario administrador
    const newUser = await createUser({
      email: "admin@fithouse.com",
      name: "Administrador",
      password: hashedPassword,
      role: "admin",
    })

    if (newUser) {
      return NextResponse.json({
        message: "Usuario administrador creado exitosamente",
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        },
      })
    } else {
      return NextResponse.json({ error: "Error al crear usuario administrador" }, { status: 500 })
    }
  } catch (error) {
    console.error("Setup error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
