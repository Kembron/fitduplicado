import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database"
import { getSession } from "@/lib/auth"
import { emailService, type MemberEmailData } from "@/lib/email-service"
import { price } from "@/lib/membership-prices"

// Template para recordatorios de vencimiento
const REMINDER_TEMPLATE = {
  subject: "🏋️ Tu membresía vence en {{daysUntilExpiry}} días - FitHouse Gym",
  content: `Hola {{memberName}},

¡Esperamos que estés disfrutando de tu entrenamiento en FitHouse Gym!

Te escribimos para recordarte que tu membresía "{{membershipName}}" vence en {{daysUntilExpiry}} días, el {{expiryDate}}.

Para continuar disfrutando de nuestras instalaciones sin interrupciones, te recomendamos renovar tu membresía antes de la fecha de vencimiento.

DETALLES DE TU MEMBRESÍA:
- Plan: {{membershipName}}
- Fecha de vencimiento: {{expiryDate}}
- Precio de renovación: ${{ price }}

Puedes renovar tu membresía:
- Visitando nuestras instalaciones
- Contactándonos por WhatsApp
- Llamándonos directamente

¡No dejes que tu rutina se interrumpa!

Saludos,
Equipo FitHouse Gym`,
}

// Función para obtener socios con membresías próximas a vencer
const getMembersWithExpiringMemberships = async (daysAhead = 3): Promise<MemberEmailData[]> => {
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
        ms.price,
        (m.expiry_date - CURRENT_DATE) as days_until_expiry
      FROM members m
      LEFT JOIN memberships ms ON m.membership_id = ms.id
      WHERE m.status = 'active'
      AND m.email IS NOT NULL
      AND m.email != ''
      AND m.email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
      AND m.expiry_date = CURRENT_DATE + INTERVAL '${daysAhead} days'
      ORDER BY m.name
    `

    return members as MemberEmailData[]
  } catch (error) {
    console.error("Error obteniendo socios con membresías por vencer:", error)
    return []
  }
}

// Verificar si ya se envió recordatorio hoy
const wasReminderSentToday = async (memberId: number): Promise<boolean> => {
  try {
    const result = await sql`
      SELECT COUNT(*) as count
      FROM email_logs
      WHERE member_id = ${memberId}
      AND email_type = 'membership_reminder'
      AND DATE(sent_at) = CURRENT_DATE
      AND status = 'sent'
    `

    return Number(result[0]?.count || 0) > 0
  } catch (error) {
    console.error("Error verificando recordatorio enviado:", error)
    return false
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

    console.log("📧 Iniciando envío de recordatorios de membresía...")

    // Obtener parámetros opcionales
    const body = await request.json().catch(() => ({}))
    const daysAhead = body.daysAhead || 3

    // Obtener socios con membresías por vencer
    const members = await getMembersWithExpiringMemberships(daysAhead)

    if (members.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No hay socios con membresías por vencer en ${daysAhead} días`,
        emailsSent: 0,
        errors: 0,
        skipped: 0,
      })
    }

    console.log(`📋 Encontrados ${members.length} socios con membresías por vencer`)

    const results = []
    let successCount = 0
    let errorCount = 0
    let skippedCount = 0

    // Enviar recordatorio a cada socio
    for (const member of members) {
      try {
        // Verificar si ya se envió recordatorio hoy
        const alreadySent = await wasReminderSentToday(member.id)
        if (alreadySent) {
          console.log(`⏭️ Recordatorio ya enviado hoy a ${member.name}`)
          results.push({
            memberId: member.id,
            memberName: member.name,
            email: member.email,
            status: "skipped",
            reason: "Ya se envió recordatorio hoy",
          })
          skippedCount++
          continue
        }

        console.log(`📤 Enviando recordatorio a ${member.name} (${member.email})`)

        // Procesar template con datos del socio
        const processedSubject = emailService.replaceTemplateVariables(REMINDER_TEMPLATE.subject, member)
        const processedContent = emailService.replaceTemplateVariables(REMINDER_TEMPLATE.content, member)

        // Enviar email
        const result = await emailService.sendEmail({
          to: member.email,
          subject: processedSubject,
          text: processedContent,
        })

        if (result.success) {
          // Registrar envío exitoso
          await emailService.logEmailSent(member.id, "membership_reminder", processedSubject, "sent")

          results.push({
            memberId: member.id,
            memberName: member.name,
            email: member.email,
            status: "success",
            messageId: result.messageId,
            provider: result.provider,
          })

          successCount++
          console.log(`✅ Recordatorio enviado exitosamente a ${member.name}`)
        } else {
          throw new Error(result.error || "Error desconocido al enviar recordatorio")
        }

        // Pausa entre envíos
        await new Promise((resolve) => setTimeout(resolve, 300))
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error desconocido"
        console.error(`❌ Error enviando recordatorio a ${member.name}:`, errorMessage)

        // Registrar error en la base de datos
        await emailService.logEmailSent(
          member.id,
          "membership_reminder",
          REMINDER_TEMPLATE.subject,
          "failed",
          errorMessage,
        )

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

    console.log(`📊 Resumen: ${successCount} exitosos, ${errorCount} errores, ${skippedCount} omitidos`)

    return NextResponse.json({
      success: true,
      message: `Proceso completado: ${successCount} recordatorios enviados, ${errorCount} errores, ${skippedCount} omitidos`,
      emailsSent: successCount,
      errors: errorCount,
      skipped: skippedCount,
      totalMembers: members.length,
      daysAhead,
      details: results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Error en el proceso de envío de recordatorios:", error)

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

// Endpoint GET para verificar socios con membresías por vencer
export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const members = await getMembersWithExpiringMemberships()

    return NextResponse.json({
      status: "Servicio de recordatorios funcionando",
      membersWithExpiringMemberships: members.length,
      members: members.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        expiryDate: m.expiry_date,
        membershipName: m.membership_name,
        daysUntilExpiry: m.expiry_date
          ? Math.ceil((new Date(m.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : 0,
      })),
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
