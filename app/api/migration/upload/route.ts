import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import * as XLSX from "xlsx"

export async function POST(request: NextRequest) {
  console.log("🔍 [MIGRATION] Iniciando validación...")

  try {
    // Verificar autenticación
    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value

    if (!token?.trim()) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    if (decoded.role !== "admin") {
      return NextResponse.json({ error: "Se requieren permisos de administrador" }, { status: 403 })
    }

    // Procesar archivos
    const formData = await request.formData()
    const membersFile = formData.get("membersFile") as File
    const paymentsFile = formData.get("paymentsFile") as File

    if (!membersFile || !paymentsFile) {
      return NextResponse.json({ error: "Faltan archivos requeridos" }, { status: 400 })
    }

    console.log("📁 Procesando archivos:")
    console.log("  - Socios:", membersFile.name)
    console.log("  - Pagos:", paymentsFile.name)

    // ========== PROCESAR SOCIOS ==========
    const membersBuffer = await membersFile.arrayBuffer()
    const membersWorkbook = XLSX.read(membersBuffer, { type: "array" })
    const membersData = XLSX.utils.sheet_to_json(membersWorkbook.Sheets[membersWorkbook.SheetNames[0]], {
      header: 1,
    })

    const membersHeaders = membersData[0] as string[]
    const membersRows = membersData.slice(1).filter((row: any) => row && row.length > 0)

    console.log("👥 Headers de socios:", membersHeaders)
    console.log("👥 Total filas:", membersRows.length)

    // Encontrar índices de las columnas que nos importan
    const findColumn = (keywords: string[]) => {
      return membersHeaders.findIndex((header) =>
        keywords.some((keyword) => header?.toString().toLowerCase().includes(keyword.toLowerCase())),
      )
    }

    const indices = {
      nombre: findColumn(["nombre", "name"]),
      email: findColumn(["email", "correo"]),
      celular: findColumn(["teléfono", "telefono", "celular", "phone"]),
      genero: findColumn(["género", "genero", "gender"]),
      estado: findColumn(["estado", "status"]),
      fechaAlta: findColumn(["fecha de alta", "alta", "created"]),
      cltv: findColumn(["cltv"]),
    }

    console.log("📋 Columnas encontradas:")
    Object.entries(indices).forEach(([key, index]) => {
      console.log(`  - ${key}: ${index >= 0 ? `${index} (${membersHeaders[index]})` : "NO ENCONTRADA"}`)
    })

    // Analizar socios
    let activeMembers = 0
    let inactiveMembers = 0
    let membersWithEmail = 0
    let totalCLTV = 0

    console.log("🔍 Analizando primeras 5 filas:")

    membersRows.forEach((row: any[], index) => {
      // Estado
      const estado = indices.estado >= 0 ? row[indices.estado]?.toString().toLowerCase().trim() : ""
      const isActive = estado === "activo"

      if (isActive) {
        activeMembers++
      } else {
        inactiveMembers++
      }

      // Email
      const email = indices.email >= 0 ? row[indices.email]?.toString().trim() : ""
      if (email && email.includes("@")) {
        membersWithEmail++
      }

      // CLTV
      const cltv = indices.cltv >= 0 ? row[indices.cltv] : 0
      const cltvValue = Number.parseFloat(cltv?.toString().replace(/[^\d.-]/g, "") || "0")
      if (!isNaN(cltvValue) && cltvValue > 0) {
        totalCLTV += cltvValue
      }

      // Debug primeras 5 filas
      if (index < 5) {
        const nombre = indices.nombre >= 0 ? row[indices.nombre] : "N/A"
        const celular = indices.celular >= 0 ? row[indices.celular] : "N/A"
        const genero = indices.genero >= 0 ? row[indices.genero] : "N/A"

        console.log(
          `  ${index + 1}. ${nombre} | ${email} | ${celular} | ${genero} | ${estado} -> ${isActive ? "ACTIVO" : "INACTIVO"}`,
        )
      }
    })

    // ========== PROCESAR PAGOS ==========
    const paymentsBuffer = await paymentsFile.arrayBuffer()
    const paymentsWorkbook = XLSX.read(paymentsBuffer, { type: "array" })
    const paymentsData = XLSX.utils.sheet_to_json(paymentsWorkbook.Sheets[paymentsWorkbook.SheetNames[0]], {
      header: 1,
    })

    const paymentsHeaders = paymentsData[0] as string[]
    const paymentsRows = paymentsData.slice(1).filter((row: any) => row && row.length > 0)

    console.log("💰 Headers de pagos:", paymentsHeaders)
    console.log("💰 Total filas:", paymentsRows.length)

    // Encontrar columnas de pagos
    const paymentIndices = {
      cliente: findColumn(["cliente", "client", "nombre"]),
      total:
        paymentsHeaders.findIndex((h) => h?.toString().toLowerCase() === "total") >= 0
          ? paymentsHeaders.findIndex((h) => h?.toString().toLowerCase() === "total")
          : findColumn(["subtotal", "monto", "amount"]),
      fecha: findColumn(["fecha", "date"]),
    }

    console.log("💰 Columnas de pagos:")
    Object.entries(paymentIndices).forEach(([key, index]) => {
      console.log(`  - ${key}: ${index >= 0 ? `${index} (${paymentsHeaders[index]})` : "NO ENCONTRADA"}`)
    })

    // Analizar pagos
    let validPayments = 0
    let totalAmount = 0
    let membership1300 = 0
    let membership1200 = 0
    let otherPayments = 0

    console.log("💰 Analizando primeras 5 filas de pagos:")

    paymentsRows.forEach((row: any[], index) => {
      const total = paymentIndices.total >= 0 ? row[paymentIndices.total] : 0
      const amount = Number.parseFloat(total?.toString().replace(/[^\d.-]/g, "") || "0")

      if (!isNaN(amount) && amount > 0) {
        validPayments++
        totalAmount += amount

        // Clasificar pagos
        if (amount === 1300) {
          membership1300++
        } else if (amount === 1200) {
          membership1200++
        } else {
          otherPayments++
        }

        // Debug primeras 5 filas
        if (index < 5) {
          const cliente = paymentIndices.cliente >= 0 ? row[paymentIndices.cliente] : "N/A"
          const fecha = paymentIndices.fecha >= 0 ? row[paymentIndices.fecha] : "N/A"
          let tipo = "OTRO"
          if (amount === 1300) tipo = "$1300"
          else if (amount === 1200) tipo = "$1200"

          console.log(`  ${index + 1}. ${cliente} | $${amount} | ${fecha} -> ${tipo}`)
        }
      }
    })

    // Crear respuesta
    const sessionId = `migration_${Date.now()}`

    const response = {
      isValid: true,
      sessionId,
      summary: {
        // Socios
        totalMembers: membersRows.length,
        activeMembers,
        inactiveMembers,
        membersWithEmail,
        totalCLTV: Math.round(totalCLTV),

        // Pagos
        totalPayments: validPayments,
        totalAmount: Math.round(totalAmount),
        membership1300,
        membership1200,
        otherPayments,
      },
      warnings: [],
    }

    // Generar warnings
    if (activeMembers === 0) {
      response.warnings.push("⚠️ No se encontraron socios activos")
    }

    if (membersWithEmail < membersRows.length * 0.8) {
      response.warnings.push(`⚠️ Solo ${membersWithEmail} de ${membersRows.length} socios tienen email`)
    }

    if (otherPayments > validPayments * 0.3) {
      response.warnings.push(`⚠️ ${otherPayments} pagos no son de $1200 o $1300`)
    }

    console.log("✅ RESUMEN FINAL:")
    console.log(`📊 Socios: ${membersRows.length} total (${activeMembers} activos, ${inactiveMembers} inactivos)`)
    console.log(`💰 Pagos: ${validPayments} total ($${Math.round(totalAmount).toLocaleString()})`)
    console.log(`💳 Membresías: ${membership1300} de $1300, ${membership1200} de $1200, ${otherPayments} otros`)

    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ Error:", error)
    return NextResponse.json(
      { error: "Error procesando archivos: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 },
    )
  }
}
