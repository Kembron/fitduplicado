import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database"
import * as XLSX from "xlsx"

export async function POST(request: NextRequest) {
  console.log("🔍 [MIGRATION EXECUTE] Iniciando migración REAL de datos...")

  try {
    const formData = await request.formData()
    const membersFile = formData.get("membersFile") as File
    const paymentsFile = formData.get("paymentsFile") as File

    if (!membersFile || !paymentsFile) {
      return NextResponse.json({ error: "Faltan archivos para la migración" }, { status: 400 })
    }

    console.log("📁 Procesando archivos Excel...")

    // ========== PROCESAR ARCHIVO DE SOCIOS ==========
    const membersBuffer = await membersFile.arrayBuffer()
    const membersWorkbook = XLSX.read(membersBuffer, { type: "array" })
    const membersData = XLSX.utils.sheet_to_json(membersWorkbook.Sheets[membersWorkbook.SheetNames[0]])

    console.log(`📊 ${membersData.length} socios encontrados en Excel`)

    // ========== PROCESAR ARCHIVO DE PAGOS ==========
    const paymentsBuffer = await paymentsFile.arrayBuffer()
    const paymentsWorkbook = XLSX.read(paymentsBuffer, { type: "array" })
    const paymentsData = XLSX.utils.sheet_to_json(paymentsWorkbook.Sheets[paymentsWorkbook.SheetNames[0]])

    console.log(`💰 ${paymentsData.length} pagos encontrados en Excel`)

    // ========== VERIFICAR USUARIO ADMIN ==========
    console.log("👤 Verificando usuario admin...")
    let adminUser = await sql`SELECT id FROM users WHERE role = 'admin' LIMIT 1`

    if (adminUser.length === 0) {
      console.log("⚠️ No hay usuario admin. Creando usuario por defecto...")
      adminUser = await sql`
        INSERT INTO users (username, email, password_hash, role, is_active, created_at, updated_at)
        VALUES ('admin', 'admin@gym.com', '$2b$10$dummy.hash.for.migration', 'admin', true, NOW(), NOW())
        RETURNING id
      `
    }

    const adminUserId = adminUser[0].id
    console.log(`✅ Usuario admin ID: ${adminUserId}`)

    // ========== VERIFICAR Y CREAR MEMBRESÍAS SI ES NECESARIO ==========
    console.log("🔧 Verificando membresías existentes...")
    let memberships = await sql`SELECT id, name, price FROM memberships WHERE is_active = true`

    if (memberships.length === 0) {
      console.log("⚠️ No hay membresías activas. Creando membresías por defecto...")

      await sql`
        INSERT INTO memberships (name, price, duration_days, description, is_active, created_at, updated_at)
        VALUES 
          ('Membresía Mensual', 1300, 30, 'Membresía mensual estándar', true, NOW(), NOW()),
          ('Membresía Promocional', 1200, 30, 'Membresía mensual promocional', true, NOW(), NOW()),
          ('Otros Servicios', 500, 30, 'Otros servicios y actividades', true, NOW(), NOW())
      `

      memberships = await sql`SELECT id, name, price FROM memberships WHERE is_active = true`
      console.log("✅ Membresías creadas exitosamente")
    }

    console.log("📋 Membresías disponibles:", memberships)

    const membershipMap = new Map()
    memberships.forEach((m) => membershipMap.set(m.price, m.id))
    const defaultMembershipId = memberships[0].id

    // ========== FUNCIÓN PARA PARSEAR FECHAS ==========
    function parseExcelDate(dateValue) {
      if (!dateValue) return new Date().toISOString().split("T")[0]

      try {
        // Si es un número (fecha de Excel)
        if (!isNaN(Number(dateValue))) {
          const excelEpoch = new Date(1900, 0, 1)
          const date = new Date(excelEpoch.getTime() + (Number(dateValue) - 2) * 24 * 60 * 60 * 1000)
          return date.toISOString().split("T")[0]
        }

        // Si es una cadena de texto
        const dateStr = dateValue.toString()

        // Formato DD/MM/YYYY
        if (dateStr.includes("/")) {
          const parts = dateStr.split("/")
          if (parts.length === 3) {
            const day = Number.parseInt(parts[0])
            const month = Number.parseInt(parts[1]) - 1 // JavaScript months are 0-based
            const year = Number.parseInt(parts[2])
            const date = new Date(year, month, day)
            if (!isNaN(date.getTime())) {
              return date.toISOString().split("T")[0]
            }
          }
        }

        // Intentar parsear directamente
        const date = new Date(dateStr)
        if (!isNaN(date.getTime())) {
          return date.toISOString().split("T")[0]
        }

        // Si todo falla, usar fecha actual
        return new Date().toISOString().split("T")[0]
      } catch (error) {
        console.log(`⚠️ Error parseando fecha ${dateValue}, usando fecha actual`)
        return new Date().toISOString().split("T")[0]
      }
    }

    // ========== MIGRAR SOCIOS ==========
    console.log("👥 Migrando socios a la base de datos...")

    let sociosMigrados = 0
    const memberEmailMap = new Map()
    const memberNameMap = new Map()

    for (const socio of membersData) {
      try {
        const nombre = socio["Nombre"] || ""
        const email = socio["Email"] || ""
        const telefono = socio["Teléfono"] || ""
        const ci = socio["CI"] || ""
        const genero = socio["Género"] || "no_especificado"
        const estado = socio["Estado"]?.toLowerCase() === "activo" ? "active" : "expired"
        const fechaAlta = parseExcelDate(socio["Fecha de alta"])
        const cltv = Number.parseFloat(socio["CLTV"]?.toString().replace(/[^\d.-]/g, "") || "0")

        if (!nombre || !email) {
          console.log(`⚠️ Saltando socio sin nombre o email: ${nombre}`)
          continue
        }

        // Calcular fecha de vencimiento
        const fechaVencimiento =
          estado === "active"
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
            : new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

        const result = await sql`
          INSERT INTO members (
            name, email, phone, document_id, gender, status, 
            join_date, expiry_date, membership_id, notes
          )
          VALUES (
            ${nombre}, ${email.toLowerCase()}, ${telefono}, ${ci}, ${genero}, ${estado},
            ${fechaAlta}, ${fechaVencimiento}, ${defaultMembershipId}, 
            ${`CLTV: $${cltv} - Migrado desde Excel`}
          )
          RETURNING id, email, name
        `

        const memberId = result[0].id
        memberEmailMap.set(email.toLowerCase(), memberId)
        memberNameMap.set(nombre.toLowerCase(), memberId)
        sociosMigrados++

        if (sociosMigrados % 100 === 0) {
          console.log(`✅ ${sociosMigrados} socios migrados...`)
        }
      } catch (error) {
        console.log(`❌ Error migrando socio ${socio["Nombre"]}: ${error.message}`)
      }
    }

    console.log(`✅ ${sociosMigrados} socios migrados exitosamente`)

    // ========== MIGRAR PAGOS ==========
    console.log("💰 Migrando pagos a la base de datos...")

    let pagosMigrados = 0
    let pagosOmitidos = 0
    let montoTotal = 0

    for (const pago of paymentsData) {
      try {
        const cliente = pago["Cliente"] || ""
        const email = pago["Email"]?.toLowerCase() || ""
        const monto = Number.parseFloat(pago["Total"]?.toString().replace(/[^\d.-]/g, "") || "0")
        const fechaInicio = parseExcelDate(pago["Fecha de inicio"])
        const fechaFin =
          parseExcelDate(pago["Fecha de finalización"]) ||
          new Date(new Date(fechaInicio).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

        if (monto <= 0) {
          pagosOmitidos++
          continue
        }

        // Buscar el socio por email primero, luego por nombre
        let memberId = memberEmailMap.get(email)

        if (!memberId && cliente) {
          memberId = memberNameMap.get(cliente.toLowerCase())
        }

        if (!memberId) {
          console.log(`⚠️ No se encontró socio para pago: ${cliente} (${email})`)
          pagosOmitidos++
          continue
        }

        // Determinar tipo de membresía por monto
        let membershipId = defaultMembershipId
        if (membershipMap.has(monto)) {
          membershipId = membershipMap.get(monto)
        }

        await sql`
          INSERT INTO payments (
            member_id, membership_id, amount, payment_date, payment_method,
            start_date, end_date, description, created_by
          )
          VALUES (
            ${memberId}, ${membershipId}, ${monto}, ${fechaInicio}, 'efectivo',
            ${fechaInicio}, ${fechaFin}, 
            ${`Pago migrado - Cliente: ${cliente} - Monto: $${monto}`}, ${adminUserId}
          )
        `

        pagosMigrados++
        montoTotal += monto

        if (pagosMigrados % 500 === 0) {
          console.log(`✅ ${pagosMigrados} pagos migrados...`)
        }
      } catch (error) {
        console.log(`❌ Error migrando pago para ${pago["Cliente"]}: ${error.message}`)
        pagosOmitidos++
      }
    }

    console.log(`✅ ${pagosMigrados} pagos migrados exitosamente`)
    console.log(`⚠️ ${pagosOmitidos} pagos omitidos por errores`)

    // ========== ACTUALIZAR FECHAS DE VENCIMIENTO ==========
    console.log("📅 Actualizando fechas de vencimiento basadas en últimos pagos...")

    await sql`
      UPDATE members 
      SET expiry_date = (
        SELECT MAX(end_date) 
        FROM payments 
        WHERE payments.member_id = members.id
      ),
      last_payment_date = (
        SELECT MAX(payment_date) 
        FROM payments 
        WHERE payments.member_id = members.id
      )
      WHERE id IN (
        SELECT DISTINCT member_id FROM payments
      )
    `

    // ========== ESTADÍSTICAS FINALES ==========
    const finalStats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM members) as total_members,
        (SELECT COUNT(*) FROM members WHERE status = 'active') as active_members,
        (SELECT COUNT(*) FROM members WHERE status != 'active') as inactive_members,
        (SELECT COUNT(*) FROM payments) as total_payments,
        (SELECT COALESCE(SUM(amount), 0) FROM payments) as total_amount
    `

    const stats = finalStats[0]

    const result = {
      success: true,
      message: "Migración REAL completada exitosamente",
      timestamp: new Date().toISOString(),

      migrated: {
        socios: sociosMigrados,
        pagos: pagosMigrados,
        pagosOmitidos: pagosOmitidos,
        montoTotal: montoTotal,
      },

      finalStats: {
        totalMembers: Number(stats.total_members),
        activeMembers: Number(stats.active_members),
        inactiveMembers: Number(stats.inactive_members),
        totalPayments: Number(stats.total_payments),
        totalAmount: Number(stats.total_amount),
      },
    }

    console.log("🎉 MIGRACIÓN REAL COMPLETADA:")
    console.log(`📊 Socios migrados: ${sociosMigrados}`)
    console.log(`💰 Pagos migrados: ${pagosMigrados}`)
    console.log(`⚠️ Pagos omitidos: ${pagosOmitidos}`)
    console.log(`💵 Monto total: $${montoTotal.toLocaleString()}`)

    return NextResponse.json(result)
  } catch (error) {
    console.error("❌ Error en migración REAL:", error)
    return NextResponse.json(
      {
        error: "Error en migración real",
        details: error.message,
        success: false,
      },
      { status: 500 },
    )
  }
}
