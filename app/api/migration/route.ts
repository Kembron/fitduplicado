import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { logAuditEvent } from "@/lib/audit"
import { sql } from "@/lib/database"
import { mapMemberData, mapPaymentData, validateMigrationData } from "@/lib/migration-utils"
import jwt from "jsonwebtoken"

// Función para obtener la sesión desde las cookies
async function getSession() {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get("auth-token")?.value

    if (!token) {
      console.log("No se encontró token de autenticación")
      return null
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret") as any

    if (!decoded || !decoded.userId) {
      console.log("Token inválido o sin userId")
      return null
    }

    // Obtener datos del usuario desde la base de datos
    const users = await sql`
      SELECT id, email, role, name 
      FROM users 
      WHERE id = ${decoded.userId} AND is_active = true
      LIMIT 1
    `

    if (users.length === 0) {
      console.log("Usuario no encontrado o inactivo")
      return null
    }

    const user = users[0]

    return {
      user: {
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
    }
  } catch (error) {
    console.error("Error obteniendo sesión:", error)
    return null
  }
}

// Función para crear respaldo de las tablas
async function createBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "_").replace("T", "_").split("Z")[0]

    console.log("Creando respaldo con timestamp:", timestamp)

    // Respaldar tabla de miembros
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS members_backup_${timestamp} AS
      SELECT * FROM members
    `)

    // Respaldar tabla de pagos
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS payments_backup_${timestamp} AS
      SELECT * FROM payments
    `)

    console.log("Respaldo creado exitosamente")
    return timestamp
  } catch (error) {
    console.error("Error creando respaldo:", error)
    throw new Error(`No se pudo crear respaldo: ${error.message}`)
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== INICIO DEBUG MIGRACIÓN ===")

    // Debug: Verificar cookies
    const cookieStore = cookies()
    const authToken = cookieStore.get("auth-token")
    console.log("Token encontrado:", !!authToken?.value)
    console.log("Valor del token (primeros 20 chars):", authToken?.value?.substring(0, 20))

    // Verificar autenticación
    const session = await getSession()
    console.log("Sesión obtenida:", !!session)
    console.log("Usuario en sesión:", session?.user?.email)
    console.log("Rol del usuario:", session?.user?.role)

    if (!session || !session.user) {
      console.log("ERROR: No hay sesión válida")
      return NextResponse.json({ error: "No autorizado - Sin sesión válida" }, { status: 401 })
    }

    // Verificar si es administrador
    if (session.user.role !== "admin") {
      console.log("ERROR: Usuario no es admin, rol actual:", session.user.role)
      return NextResponse.json({ error: "Se requieren permisos de administrador" }, { status: 403 })
    }

    console.log("✅ Autenticación exitosa")

    const { action, members, payments } = await request.json()
    console.log("Acción solicitada:", action)

    if (action === "validate") {
      // Validar datos usando la función de migration-utils
      const validation = validateMigrationData(members || [], payments || [])

      console.log("Validación completada:", validation.stats)

      // Registrar en auditoría
      try {
        await logAuditEvent({
          user_id: session.user.userId,
          user_email: session.user.email,
          action_type: "VIEW",
          table_name: "migration",
          description: `Validación de migración por ${session.user.email}`,
        })
        console.log("✅ Log de auditoría creado")
      } catch (auditError) {
        console.error("Error creando log de auditoría:", auditError)
      }

      return NextResponse.json(validation)
    }

    if (action === "migrate") {
      console.log("Iniciando migración...")

      // Crear respaldo antes de migrar
      const backupTimestamp = await createBackup()
      console.log("✅ Respaldo creado:", backupTimestamp)

      let membersMigrated = 0
      let paymentsProcessed = 0

      try {
        // Migrar socios
        console.log("Migrando socios...")
        for (const memberData of members) {
          try {
            const mappedMember = mapMemberData(memberData)

            // Verificar si el socio ya existe
            const existingMember = await sql`
              SELECT id FROM members 
              WHERE email = ${mappedMember.email} OR document_id = ${mappedMember.document_id}
              LIMIT 1
            `

            if (existingMember.length === 0) {
              await sql`
                INSERT INTO members (
                  name, email, phone, document_id, birth_date, gender, address,
                  emergency_contact, notes, status, join_date, expiry_date, membership_id
                ) VALUES (
                  ${mappedMember.name}, ${mappedMember.email}, ${mappedMember.phone},
                  ${mappedMember.document_id}, ${mappedMember.birth_date}, ${mappedMember.gender},
                  ${mappedMember.address}, ${mappedMember.emergency_contact}, ${mappedMember.notes},
                  ${mappedMember.status}, ${mappedMember.join_date}, ${mappedMember.expiry_date},
                  ${mappedMember.membership_id}
                )
              `
              membersMigrated++
            }
          } catch (error) {
            console.error("Error migrando socio:", error)
          }
        }

        console.log(`✅ Socios migrados: ${membersMigrated}`)

        // Migrar pagos
        console.log("Migrando pagos...")
        for (const paymentData of payments) {
          try {
            const mappedPayment = mapPaymentData(paymentData, new Map())

            if (mappedPayment.member_id) {
              await sql`
                INSERT INTO payments (
                  member_id, amount, payment_date, payment_method, description,
                  start_date, end_date, membership_id
                ) VALUES (
                  ${mappedPayment.member_id}, ${mappedPayment.amount}, ${mappedPayment.payment_date},
                  ${mappedPayment.payment_method}, ${mappedPayment.description},
                  ${mappedPayment.start_date}, ${mappedPayment.end_date}, ${mappedPayment.membership_id}
                )
              `
              paymentsProcessed++
            }
          } catch (error) {
            console.error("Error migrando pago:", error)
          }
        }

        console.log(`✅ Pagos procesados: ${paymentsProcessed}`)

        // Registrar en auditoría
        await logAuditEvent({
          user_id: session.user.userId,
          user_email: session.user.email,
          action_type: "CREATE",
          table_name: "migration",
          description: `Migración completada por ${session.user.email}`,
        })

        console.log("✅ Migración completada exitosamente")

        return NextResponse.json({
          membersMigrated,
          paymentsProcessed,
          backupTimestamp,
        })
      } catch (error) {
        console.error("Error en migración:", error)
        return NextResponse.json({ error: "Error durante la migración: " + error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
  } catch (error) {
    console.error("Error general en migración:", error)
    return NextResponse.json(
      { error: "Error procesando la migración: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 },
    )
  }
}
