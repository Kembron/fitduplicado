// Utilidades para migración de datos desde Excel
import { sql } from "@/lib/database"

// Interfaces para los datos de origen (Excel) - Basado en tu estructura real
export interface ExcelMember {
  Nombre?: string
  Email?: string
  Teléfono?: string
  CI?: string
  "Fecha de nacimiento"?: string
  Género?: string
  Dirección?: string
  "Código postal"?: string
  Ciudad?: string
  Provincia?: string
  País?: string
  IBAN?: string
  Estado?: string
  "ID Cliente"?: string | number
  "Actualización de estado"?: string
  "Fecha de alta"?: string
  Notas?: string
  MRR?: string | number
  CLTV?: string | number
  "Última reserva"?: string
}

export interface ExcelSubscription {
  Cliente?: string
  Email?: string
  Teléfono?: string
  Cuota?: string
  Dependiente?: string
  "Renovación automática"?: string
  "Fecha de inicio"?: string
  "Fecha de finalización"?: string
  Subtotal?: string | number
  Total?: string | number
  Estado?: string
  Notas?: string
  "Creado por"?: string
  "Actualizado por"?: string
  "Cancelada por"?: string
}

// Mapeo de datos de Excel a formato de la aplicación
export function mapMemberData(excelMember: ExcelMember): any {
  return {
    name: excelMember.Nombre || "",
    email: excelMember.Email || "",
    phone: cleanPhoneNumber(excelMember.Teléfono),
    document_id: excelMember.CI || "",
    gender: mapGender(excelMember.Género),
    birth_date: formatDate(excelMember["Fecha de nacimiento"]),
    address: buildFullAddress(excelMember),
    emergency_contact: "", // No viene en Excel, se deja vacío
    notes: buildNotesFromExcel(excelMember),
    membership_id: 1, // Solo hay membresía mensual por ahora
    status: mapMemberStatus(excelMember.Estado),
    join_date: formatDate(excelMember["Fecha de alta"]) || new Date().toISOString().split("T")[0],
    expiry_date: calculateExpiryFromLastReservation(excelMember["Última reserva"]),
    // Campos adicionales para tracking de migración
    migrated_from_id: excelMember["ID Cliente"]?.toString(),
    migrated_at: new Date().toISOString(),
  }
}

export function mapPaymentData(excelSubscription: ExcelSubscription, memberIdMap: Map<string, number>): any {
  // Buscar el ID del miembro por nombre o email
  const memberName = excelSubscription.Cliente?.trim()
  const memberEmail = excelSubscription.Email?.trim()

  let memberId: number | undefined

  // Buscar por email primero (más confiable)
  if (memberEmail) {
    for (const [originalId, newId] of memberIdMap.entries()) {
      // Necesitaremos crear un mapa adicional por email
      // Por ahora, buscaremos por nombre
    }
  }

  // Si no encontramos por email, buscar por nombre
  if (!memberId && memberName) {
    // Esto requerirá una consulta a la base de datos o un mapa adicional
    // Por simplicidad, asumiremos que el mapeo se hace correctamente
  }

  if (!memberId) {
    throw new Error(`No se encontró el socio: ${memberName} (${memberEmail})`)
  }

  const amount = Number.parseFloat(excelSubscription.Total?.toString() || "0")
  const paymentType = determinePaymentType(amount, excelSubscription.Cuota, excelSubscription["Fecha de inicio"])

  return {
    member_id: memberId,
    amount: amount,
    payment_date: formatDate(excelSubscription["Fecha de inicio"]) || new Date().toISOString().split("T")[0],
    payment_method: "efectivo", // Valor por defecto, se puede ajustar
    description: buildPaymentDescription(excelSubscription, paymentType),
    membership_id: paymentType.membershipId,
    start_date: formatDate(excelSubscription["Fecha de inicio"]) || new Date().toISOString().split("T")[0],
    end_date:
      formatDate(excelSubscription["Fecha de finalización"]) ||
      calculateEndDateFromStart(excelSubscription["Fecha de inicio"]),
    created_by: 1, // ID del usuario admin
    // Campos adicionales para tracking
    migrated_from_subscription: true,
    migrated_at: new Date().toISOString(),
  }
}

// Funciones auxiliares específicas para tu estructura de datos

function cleanPhoneNumber(phone?: string): string {
  if (!phone) return ""
  return phone.toString().replace(/[^\d+]/g, "")
}

function mapGender(gender?: string): string {
  if (!gender) return "no_especificado"
  const g = gender.toLowerCase()
  if (g.includes("femenino") || g.includes("f")) return "femenino"
  if (g.includes("masculino") || g.includes("m")) return "masculino"
  return "no_especificado"
}

function buildFullAddress(member: ExcelMember): string {
  const parts = [member.Dirección, member["Código postal"], member.Ciudad, member.Provincia, member.País].filter(
    Boolean,
  )
  return parts.join(", ")
}

function buildNotesFromExcel(member: ExcelMember): string {
  const notes = []

  if (member.Notas) {
    notes.push(`Notas originales: ${member.Notas}`)
  }

  if (member.MRR) {
    notes.push(`MRR original: $${member.MRR}`)
  }

  if (member.CLTV) {
    notes.push(`CLTV (Total pagado): $${member.CLTV}`)
  }

  notes.push(`Migrado desde sistema anterior el ${new Date().toLocaleDateString()}`)

  if (member["Actualización de estado"]) {
    notes.push(`Última actualización: ${member["Actualización de estado"]}`)
  }

  return notes.join(" | ")
}

// Función actualizada para determinar el tipo de pago basado en monto y fecha
function determinePaymentType(
  amount: number,
  cuota?: string,
  fechaInicio?: string,
): { type: string; membershipId: number; description: string } {
  // Obtener año de la fecha de inicio para determinar la tarifa histórica
  let year = new Date().getFullYear()
  if (fechaInicio) {
    const date = formatDate(fechaInicio)
    if (date) {
      year = new Date(date).getFullYear()
    }
  }

  // Rangos de precios históricos para membresías mensuales
  // Ajustar según los rangos exactos de precios históricos
  if (
    (year <= 2021 && amount >= 850 && amount <= 950) || // ~$900 en 2021 o antes
    (year === 2022 && amount >= 1150 && amount <= 1250) || // ~$1200 en 2022
    (year >= 2023 && amount >= 1250 && amount <= 1350) // ~$1300 en 2023 en adelante
  ) {
    return {
      type: "membership",
      membershipId: 1,
      description: `Membresía Mensual (${year})`,
    }
  }

  // Entrenamiento personal (puede variar por año también)
  if (amount >= 3800 && amount <= 4200) {
    return {
      type: "personal_training",
      membershipId: 1, // Usar la misma membresía por ahora
      description: "Entrenamiento Personal",
    }
  }

  // Otros montos - determinar por cuota si está disponible
  if (cuota?.toLowerCase().includes("personal") || cuota?.toLowerCase().includes("entrenamiento")) {
    return {
      type: "personal_training",
      membershipId: 1,
      description: `Entrenamiento Personal - ${cuota}`,
    }
  }

  // Membresías con descuento o promociones especiales
  if (amount > 0 && amount < 850) {
    return {
      type: "membership_discount",
      membershipId: 1,
      description: `Membresía con Descuento - $${amount}`,
    }
  }

  // Caso por defecto - cualquier otro pago
  return {
    type: "other_payment",
    membershipId: 1,
    description: `Pago - $${amount}`,
  }
}

function buildPaymentDescription(subscription: ExcelSubscription, paymentType: any): string {
  const parts = [paymentType.description]

  if (subscription.Cuota && subscription.Cuota !== "Cliente normal") {
    parts.push(`Tipo: ${subscription.Cuota}`)
  }

  if (subscription.Dependiente === "Sí") {
    parts.push("Dependiente")
  }

  if (subscription["Renovación automática"] === "Sí") {
    parts.push("Renovación automática")
  }

  if (subscription.Notas) {
    parts.push(`Notas: ${subscription.Notas}`)
  }

  if (subscription["Creado por"]) {
    parts.push(`Creado por: ${subscription["Creado por"]}`)
  }

  parts.push("Migrado desde Excel")

  return parts.join(" | ")
}

function calculateEndDateFromStart(startDate?: string): string {
  const start = formatDate(startDate)
  if (start) {
    const date = new Date(start)
    date.setMonth(date.getMonth() + 1) // Agregar 1 mes
    return date.toISOString().split("T")[0]
  }

  const date = new Date()
  date.setMonth(date.getMonth() + 1)
  return date.toISOString().split("T")[0]
}

function calculateExpiryFromLastReservation(lastReservation?: string): string {
  if (lastReservation) {
    const lastDate = formatDate(lastReservation)
    if (lastDate) {
      const date = new Date(lastDate)
      const now = new Date()
      const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

      if (daysDiff > 30) {
        return lastDate
      } else {
        date.setDate(date.getDate() + 30)
        return date.toISOString().split("T")[0]
      }
    }
  }

  const date = new Date()
  date.setMonth(date.getMonth() + 1)
  return date.toISOString().split("T")[0]
}

function mapMemberStatus(originalStatus?: string): string {
  if (!originalStatus) return "inactive"

  const status = originalStatus.toLowerCase()
  if (status.includes("activ")) return "active"
  if (status.includes("inactiv")) return "inactive"
  if (status.includes("vencid") || status.includes("expirad")) return "expired"
  if (status.includes("suspend")) return "suspended"
  if (status.includes("cancel")) return "cancelled"
  return "inactive"
}

function formatDate(dateString?: string): string | null {
  if (!dateString) return null

  try {
    let date: Date

    if (!isNaN(Number(dateString))) {
      const excelEpoch = new Date(1900, 0, 1)
      date = new Date(excelEpoch.getTime() + (Number(dateString) - 2) * 24 * 60 * 60 * 1000)
    } else {
      if (dateString.includes("/")) {
        const parts = dateString.split("/")
        if (parts.length === 3) {
          date = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]))
        } else {
          date = new Date(dateString)
        }
      } else {
        date = new Date(dateString)
      }
    }

    if (isNaN(date.getTime())) return null
    return date.toISOString().split("T")[0]
  } catch (error) {
    console.warn("Error parsing date:", dateString, error)
    return null
  }
}

// Función principal de migración actualizada
export async function migrateMembersFromExcel(members: ExcelMember[]): Promise<Map<string, number>> {
  const memberIdMap = new Map<string, number>()
  const memberEmailMap = new Map<string, number>()
  const memberNameMap = new Map<string, number>()
  const errors: string[] = []
  let paymentsCreated = 0

  console.log(`Iniciando migración de ${members.length} socios...`)

  for (let i = 0; i < members.length; i++) {
    const excelMember = members[i]

    try {
      const memberData = mapMemberData(excelMember)

      // Verificar si el socio ya existe
      const existingMember = await sql`
        SELECT id FROM members 
        WHERE (email = ${memberData.email} AND email != '') 
        OR (document_id = ${memberData.document_id} AND document_id != '')
        OR (name = ${memberData.name} AND name != '')
        LIMIT 1
      `

      let memberId: number

      if (existingMember.length > 0) {
        console.log(`Socio ya existe: ${memberData.name}`)
        memberId = existingMember[0].id
      } else {
        const result = await sql`
          INSERT INTO members (
            name, email, phone, document_id, gender, birth_date, address,
            emergency_contact, notes, membership_id, status, join_date, expiry_date
          ) VALUES (
            ${memberData.name}, ${memberData.email}, ${memberData.phone}, 
            ${memberData.document_id}, ${memberData.gender}, ${memberData.birth_date},
            ${memberData.address}, ${memberData.emergency_contact}, ${memberData.notes},
            ${memberData.membership_id}, ${memberData.status}, ${memberData.join_date},
            ${memberData.expiry_date}
          )
          RETURNING id
        `

        memberId = result[0].id
        console.log(`✅ Socio migrado: ${memberData.name} (ID: ${memberId})`)
      }

      // Crear mapas para búsqueda posterior
      if (excelMember["ID Cliente"]) {
        memberIdMap.set(excelMember["ID Cliente"].toString(), memberId)
      }
      if (memberData.email) {
        memberEmailMap.set(memberData.email.toLowerCase(), memberId)
      }
      if (memberData.name) {
        memberNameMap.set(memberData.name.toLowerCase(), memberId)
      }

      // Crear pago inicial basado en CLTV si existe
      if (excelMember.CLTV) {
        const cltv = Number.parseFloat(excelMember.CLTV.toString())
        if (cltv > 0) {
          const existingPayment = await sql`
            SELECT id FROM payments 
            WHERE member_id = ${memberId}
            AND description LIKE '%CLTV%'
            LIMIT 1
          `

          if (existingPayment.length === 0) {
            await sql`
              INSERT INTO payments (
                member_id, amount, payment_date, payment_method, description,
                membership_id, start_date, end_date, created_by
              ) VALUES (
                ${memberId}, ${cltv}, ${memberData.join_date},
                'transferencia', ${`Pago histórico migrado - Total acumulado (CLTV): $${cltv}`},
                1, ${memberData.join_date}, ${memberData.expiry_date}, 1
              )
            `
            paymentsCreated++
            console.log(`💰 Pago CLTV creado: $${cltv} para ${memberData.name}`)
          }
        }
      }
    } catch (error) {
      const errorMsg = `Error migrando socio ${excelMember.Nombre}: ${error.message}`
      console.error(errorMsg)
      errors.push(errorMsg)
    }
  }

  console.log(
    `Migración de socios completada. ${memberIdMap.size} socios procesados, ${paymentsCreated} pagos CLTV creados.`,
  )

  // Retornar todos los mapas para usar en migración de pagos
  return new Map([...memberIdMap, ...memberEmailMap, ...memberNameMap])
}

export async function migratePaymentsFromExcel(
  payments: ExcelSubscription[],
  memberIdMap: Map<string, number>,
): Promise<{ paymentsCreated: number; errors: string[] }> {
  const errors: string[] = []
  let paymentsCreated = 0

  console.log(`Iniciando migración de ${payments.length} pagos/suscripciones...`)

  for (let i = 0; i < payments.length; i++) {
    const excelSubscription = payments[i]

    try {
      // Buscar el socio por email o nombre
      let memberId: number | undefined

      if (excelSubscription.Email) {
        const emailKey = excelSubscription.Email.toLowerCase()
        memberId = memberIdMap.get(emailKey)
      }

      if (!memberId && excelSubscription.Cliente) {
        const nameKey = excelSubscription.Cliente.toLowerCase()
        memberId = memberIdMap.get(nameKey)
      }

      if (!memberId) {
        // Buscar en la base de datos directamente
        const memberSearch = await sql`
          SELECT id FROM members 
          WHERE (email = ${excelSubscription.Email || ""} AND email != '')
          OR (name = ${excelSubscription.Cliente || ""} AND name != '')
          LIMIT 1
        `

        if (memberSearch.length > 0) {
          memberId = memberSearch[0].id
        }
      }

      if (!memberId) {
        const errorMsg = `No se encontró el socio: ${excelSubscription.Cliente} (${excelSubscription.Email})`
        console.warn(errorMsg)
        errors.push(errorMsg)
        continue
      }

      const amount = Number.parseFloat(excelSubscription.Total?.toString() || "0")
      const paymentType = determinePaymentType(amount, excelSubscription.Cuota, excelSubscription["Fecha de inicio"])

      // Verificar si ya existe un pago similar
      const existingPayment = await sql`
        SELECT id FROM payments 
        WHERE member_id = ${memberId}
        AND amount = ${amount}
        AND payment_date = ${formatDate(excelSubscription["Fecha de inicio"]) || new Date().toISOString().split("T")[0]}
        LIMIT 1
      `

      if (existingPayment.length === 0) {
        await sql`
          INSERT INTO payments (
            member_id, amount, payment_date, payment_method, description,
            membership_id, start_date, end_date, created_by
          ) VALUES (
            ${memberId}, ${amount}, 
            ${formatDate(excelSubscription["Fecha de inicio"]) || new Date().toISOString().split("T")[0]},
            'efectivo', ${buildPaymentDescription(excelSubscription, paymentType)},
            ${paymentType.membershipId},
            ${formatDate(excelSubscription["Fecha de inicio"]) || new Date().toISOString().split("T")[0]},
            ${formatDate(excelSubscription["Fecha de finalización"]) || calculateEndDateFromStart(excelSubscription["Fecha de inicio"])},
            1
          )
        `
        paymentsCreated++
        console.log(`✅ Pago migrado: $${amount} (${paymentType.description}) para socio ${memberId}`)
      } else {
        console.log(`💰 Pago ya existe: $${amount} para socio ${memberId}`)
      }
    } catch (error) {
      const errorMsg = `Error migrando pago para ${excelSubscription.Cliente}: ${error.message}`
      console.error(errorMsg)
      errors.push(errorMsg)
    }
  }

  console.log(`Migración de pagos completada. ${paymentsCreated} pagos migrados, ${errors.length} errores.`)
  return { paymentsCreated, errors }
}

// Función de validación actualizada
export function validateMigrationData(
  members: ExcelMember[],
  payments: ExcelSubscription[],
): {
  isValid: boolean
  errors: string[]
  warnings: string[]
  stats: any
} {
  const errors: string[] = []
  const warnings: string[] = []

  const stats = {
    totalMembers: members.length,
    totalPayments: payments.length,
    membersWithEmail: 0,
    membersWithCLTV: 0,
    totalCLTV: 0,
    paymentsByType: {
      membership: {
        total: 0,
        ranges: {
          "850-950": 0, // ~$900 (2021 o antes)
          "1150-1250": 0, // ~$1200 (2022)
          "1250-1350": 0, // ~$1300 (2023+)
          other: 0,
        },
      },
      personalTraining: 0,
      discounts: 0,
      other: 0,
    },
    paymentsByYear: {},
    totalPaymentAmount: 0,
    activeMembers: 0,
    inactiveMembers: 0,
  }

  // Validar socios
  const memberEmails = new Set()
  const memberNames = new Set()

  members.forEach((member, index) => {
    if (member.Email) {
      stats.membersWithEmail++
      if (memberEmails.has(member.Email.toLowerCase())) {
        warnings.push(`Socio fila ${index + 2}: Email duplicado ${member.Email}`)
      }
      memberEmails.add(member.Email.toLowerCase())
    }

    if (member.Nombre) {
      if (memberNames.has(member.Nombre.toLowerCase())) {
        warnings.push(`Socio fila ${index + 2}: Nombre duplicado ${member.Nombre}`)
      }
      memberNames.add(member.Nombre.toLowerCase())
    } else {
      errors.push(`Socio fila ${index + 2}: Falta el nombre`)
    }

    if (member.CLTV) {
      stats.membersWithCLTV++
      stats.totalCLTV += Number.parseFloat(member.CLTV.toString()) || 0
    }

    if (member.Estado?.toLowerCase().includes("activ")) {
      stats.activeMembers++
    } else {
      stats.inactiveMembers++
    }
  })

  // Validar pagos
  payments.forEach((payment, index) => {
    const amount = Number.parseFloat(payment.Total?.toString() || "0")

    if (amount <= 0) {
      errors.push(`Pago fila ${index + 2}: Monto inválido ${payment.Total}`)
    } else {
      stats.totalPaymentAmount += amount

      // Obtener año para estadísticas
      let year = "desconocido"
      if (payment["Fecha de inicio"]) {
        const date = formatDate(payment["Fecha de inicio"])
        if (date) {
          year = new Date(date).getFullYear().toString()

          // Inicializar contador por año si no existe
          if (!stats.paymentsByYear[year]) {
            stats.paymentsByYear[year] = {
              count: 0,
              amount: 0,
            }
          }

          stats.paymentsByYear[year].count++
          stats.paymentsByYear[year].amount += amount
        }
      }

      // Clasificar pagos por tipo y rango
      if (amount >= 850 && amount <= 950) {
        stats.paymentsByType.membership.total++
        stats.paymentsByType.membership.ranges["850-950"]++
      } else if (amount >= 1150 && amount <= 1250) {
        stats.paymentsByType.membership.total++
        stats.paymentsByType.membership.ranges["1150-1250"]++
      } else if (amount >= 1250 && amount <= 1350) {
        stats.paymentsByType.membership.total++
        stats.paymentsByType.membership.ranges["1250-1350"]++
      } else if (amount >= 3800 && amount <= 4200) {
        stats.paymentsByType.personalTraining++
      } else if (amount < 850 && amount > 0) {
        stats.paymentsByType.discounts++
      } else {
        stats.paymentsByType.other++
        stats.paymentsByType.membership.ranges["other"]++
      }
    }

    if (!payment.Cliente && !payment.Email) {
      errors.push(`Pago fila ${index + 2}: Falta identificación del cliente`)
    }

    if (!formatDate(payment["Fecha de inicio"])) {
      warnings.push(`Pago fila ${index + 2}: Fecha de inicio inválida ${payment["Fecha de inicio"]}`)
    }

    // Verificar si el cliente existe en la lista de socios
    if (payment.Email && !memberEmails.has(payment.Email.toLowerCase())) {
      warnings.push(`Pago fila ${index + 2}: Cliente ${payment.Email} no encontrado en lista de socios`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    stats,
  }
}

// Función para crear el componente de migración en el dashboard
export async function createMigrationComponent() {
  // Implementación del componente de migración
}
