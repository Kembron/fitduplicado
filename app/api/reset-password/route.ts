import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import postgres from "postgres"

const sql = postgres(process.env.DATABASE_URL || "", {
  ssl: { rejectUnauthorized: false },
  max: 10,
  idle_timeout: 20,
  connect_timeout: 30,
})

export async function POST() {
  try {
    // Generar nuevo hash para la contraseña "admin123"
    const password = "admin123"
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    console.log("New password hash:", hashedPassword)

    // Actualizar la contraseña en la base de datos
    const result = await sql`
      UPDATE users 
      SET password = ${hashedPassword}
      WHERE email = 'admin@fithouse.com'
      RETURNING id, email, name, role
    `

    if (result.length > 0) {
      // Verificar que el hash funciona
      const isValid = await bcrypt.compare(password, hashedPassword)
      console.log("Hash verification:", isValid)

      return NextResponse.json({
        success: true,
        message: "Contraseña actualizada correctamente",
        user: result[0],
        hashVerification: isValid,
        newHash: hashedPassword,
      })
    } else {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }
  } catch (error) {
    console.error("Reset password error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
