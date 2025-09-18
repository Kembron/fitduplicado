import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database"
import { getSession } from "@/lib/auth"
import { emailService, type MemberEmailData } from "@/lib/email-service"

// Función para obtener socios por estados
const getMembersByStatuses = async (statuses: string[]): Promise<MemberEmailData[]> => {
  try {
    const members = await sql`
      SELECT 
        m.id,
        m.name,
        m.email,
        m.status,
        m.expiry_date,
        m.join_date,
        ms.name as membership_name,
        ms.price
      FROM members m
      LEFT JOIN memberships ms ON m.membership_id = ms.id
      WHERE m.status = ANY(${statuses})
      AND m.email IS NOT NULL
      AND m.email != ''
      AND m.email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
      ORDER BY m.name
    `

    return members as MemberEmailData[]
  } catch (error) {
    console.error("Error obteniendo socios por estados:", error)
    return []
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar configuración del servicio de email
    if (!emailService.isConfigured()) {
      return NextResponse.json(
        {
          error: "Servicio de email no configurado",
          details: "Verifica las variables de entorno EMAIL_USER y EMAIL_APP_PASSWORD",
        },
        { status: 500 },
      )
    }

    console.log("📧 Iniciando envío de emails personalizados...")

    const body = await request.json()
    const { subject, content, memberStatuses } = body

    // Validación de datos
    if (!subject?.trim()) {
      return NextResponse.json({ error: "El asunto es requerido" }, { status: 400 })
    }

    if (!content?.trim()) {
      return NextResponse.json({ error: "El contenido es requerido" }, { status: 400 })
    }

    if (!memberStatuses || !Array.isArray(memberStatuses) || memberStatuses.length === 0) {
      return NextResponse.json({ error: "Debe seleccionar al menos un estado de socio" }, { status: 400 })
    }

    // Validar estados permitidos
    const validStatuses = ["active", "expired", "suspended", "inactive", "cancelled"]
    const invalidStatuses = memberStatuses.filter((status) => !validStatuses.includes(status))
    if (invalidStatuses.length > 0) {
      return NextResponse.json({ error: `Estados inválidos: ${invalidStatuses.join(", ")}` }, { status: 400 })
    }

    console.log(`📋 Enviando a socios con estados: ${memberStatuses.join(", ")}`)

    // Obtener socios por estados
    const members = await getMembersByStatuses(memberStatuses)

    if (members.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No hay socios con los estados seleccionados que tengan email válido",
        emailsSent: 0,
        errors: 0,
        totalMembers: 0,
      })
    }

    console.log(`📋 Encontrados ${members.length} socios para enviar emails`)

    const results = []
    let successCount = 0
    let errorCount = 0

    // Enviar email a cada socio
    for (const member of members) {
      try {
        console.log(`📤 Enviando email a ${member.name} (${member.email})`)

        // Procesar contenido con variables
        const processedSubject = emailService.replaceTemplateVariables(subject, member)
        const processedContent = emailService.replaceTemplateVariables(content, member)

        // Enviar email
        const result = await emailService.sendEmail({
          to: member.email,
          subject: processedSubject,
          text: processedContent,
        })

        if (result.success) {
          // Registrar envío exitoso
          await emailService.logEmailSent(member.id, "custom", processedSubject, "sent")

          results.push({
            memberId: member.id,
            memberName: member.name,
            email: member.email,
            status: "success",
            messageId: result.messageId,
            provider: result.provider,
          })

          successCount++
          console.log(`✅ Email enviado exitosamente a ${member.name}`)
        } else {
          throw new Error(result.error || "Error desconocido al enviar email")
        }

        // Pausa entre envíos para evitar límites de rate
        await new Promise((resolve) => setTimeout(resolve, 200))
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error desconocido"
        console.error(`❌ Error enviando email a ${member.name}:`, errorMessage)

        // Registrar error en la base de datos
        await emailService.logEmailSent(member.id, "custom", subject, "failed", errorMessage)

        results.push({
          memberId: member.id,
          memberName: member.name,
          email: member.email,
          status: "error",
          error: errorMessage,
        })

        errorCount++
      }
    }

    console.log(`📊 Resumen: ${successCount} exitosos, ${errorCount} errores`)

    return NextResponse.json({
      success: true,
      message: `Proceso completado: ${successCount} emails enviados, ${errorCount} errores`,
      emailsSent: successCount,
      errors: errorCount,
      totalMembers: members.length,
      memberStatuses,
      details: results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Error en el proceso de envío de emails personalizados:", error)

    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

// Endpoint GET para verificar el estado del servicio
export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar configuración del servicio
    const isConfigured = emailService.isConfigured()

    // Obtener estadísticas de socios por estado
    const stats = await sql`
      SELECT 
        status,
        COUNT(*) as count,
        COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as with_email
      FROM members
      GROUP BY status
    `

    const memberStats = stats.reduce(
      (acc, stat) => {
        acc[stat.status] = {
          total: Number(stat.count),
          withEmail: Number(stat.with_email),
        }
        return acc
      },
      {} as Record<string, { total: number; withEmail: number }>,
    )

    return NextResponse.json({
      status: isConfigured ? "Servicio funcionando correctamente" : "Servicio no configurado",
      isConfigured,
      memberStats,
      timestamp: new Date().toISOString(),
      environment: {
        hasEmailUser: !!process.env.EMAIL_USER,
        hasEmailPassword: !!process.env.EMAIL_APP_PASSWORD,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Error verificando el servicio",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
