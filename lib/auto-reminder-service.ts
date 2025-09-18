import { sql } from "@/lib/database"
import { emailService, type MemberEmailData } from "@/lib/email-service"

// Servicio para manejo automático de recordatorios
export class AutoReminderService {
  private static instance: AutoReminderService
  private isProcessing = false

  private constructor() {}

  public static getInstance(): AutoReminderService {
    if (!AutoReminderService.instance) {
      AutoReminderService.instance = new AutoReminderService()
    }
    return AutoReminderService.instance
  }

  // Verificar si necesitamos enviar recordatorios hoy
  public async checkAndSendReminders(): Promise<{
    sent: boolean
    count: number
    message: string
    details?: any
  }> {
    if (this.isProcessing) {
      console.log("⏳ Ya se está procesando una verificación de recordatorios")
      return { sent: false, count: 0, message: "Ya se está procesando una verificación" }
    }

    try {
      this.isProcessing = true
      console.log("🔍 Iniciando verificación de recordatorios...")

      // Verificar si el servicio de email está configurado
      if (!emailService.isConfigured()) {
        console.warn("⚠️ Servicio de email no configurado")
        return {
          sent: false,
          count: 0,
          message: "Servicio de email no configurado",
        }
      }

      // Obtener socios con membresías por vencer en los próximos 3 días
      const members = await this.getMembersWithExpiringMemberships()
      console.log(`📋 Encontrados ${members.length} socios con membresías próximas a vencer`)

      if (members.length === 0) {
        return {
          sent: false,
          count: 0,
          message: "No hay socios con membresías por vencer en los próximos 3 días",
        }
      }

      // Filtrar socios que ya recibieron recordatorio hoy
      const membersToNotify = []
      for (const member of members) {
        const alreadySent = await this.wasReminderSentToday(member.id)
        if (!alreadySent) {
          membersToNotify.push(member)
        } else {
          console.log(`⏭️ ${member.name} ya recibió recordatorio hoy`)
        }
      }

      if (membersToNotify.length === 0) {
        return {
          sent: false,
          count: 0,
          message: `${members.length} socios próximos a vencer ya recibieron recordatorio hoy`,
        }
      }

      console.log(`📤 Enviando recordatorios a ${membersToNotify.length} socios...`)

      // Enviar recordatorios
      const result = await this.sendRemindersToMembers(membersToNotify)

      const message = `Se enviaron ${result.successCount} recordatorios de ${membersToNotify.length} socios (${result.errorCount} errores)`
      console.log(`📊 Resultado: ${message}`)

      return {
        sent: result.successCount > 0,
        count: result.successCount,
        message: message,
        details: {
          totalExpiring: members.length,
          alreadyNotified: members.length - membersToNotify.length,
          attempted: membersToNotify.length,
          successful: result.successCount,
          failed: result.errorCount,
        },
      }
    } catch (error) {
      console.error("❌ Error en checkAndSendReminders:", error)
      return {
        sent: false,
        count: 0,
        message: `Error al procesar recordatorios: ${error instanceof Error ? error.message : "Error desconocido"}`,
      }
    } finally {
      this.isProcessing = false
    }
  }

  // Verificar si ya se envió recordatorio hoy a un socio específico
  private async wasReminderSentToday(memberId: number): Promise<boolean> {
    try {
      const result = await sql`
        SELECT COUNT(*) as count
        FROM email_logs
        WHERE member_id = ${memberId}
        AND email_type = 'membership_reminder'
        AND DATE(sent_at) = CURRENT_DATE
        AND status = 'sent'
      `
      const count = Number(result[0]?.count || 0)
      return count > 0
    } catch (error) {
      console.error(`❌ Error verificando recordatorio para socio ${memberId}:`, error)
      return false // En caso de error, asumir que no se envió
    }
  }

  // Obtener socios con membresías próximas a vencer (3 días o menos)
  private async getMembersWithExpiringMemberships(): Promise<MemberEmailData[]> {
    try {
      console.log("🔍 Buscando socios con membresías próximas a vencer...")

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
        AND m.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
        ORDER BY m.expiry_date ASC, m.name ASC
      `

      console.log(`📋 Query resultado: ${members.length} socios encontrados`)

      // Log detallado de los socios encontrados
      members.forEach((member) => {
        const daysUntilExpiry = Math.ceil(
          (new Date(member.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
        )
        console.log(`  - ${member.name} (${member.email}): vence en ${daysUntilExpiry} días (${member.expiry_date})`)
      })

      return members as MemberEmailData[]
    } catch (error) {
      console.error("❌ Error obteniendo socios con membresías por vencer:", error)
      return []
    }
  }

  // Enviar recordatorios a los socios
  private async sendRemindersToMembers(members: MemberEmailData[]): Promise<{
    successCount: number
    errorCount: number
  }> {
    let successCount = 0
    let errorCount = 0

    // Obtener template de recordatorio
    const reminderTemplate = await this.getReminderTemplate()

    for (const member of members) {
      try {
        console.log(`📤 Enviando recordatorio a ${member.name} (${member.email})`)

        // Calcular días hasta vencimiento
        const daysUntilExpiry = Math.max(
          0,
          Math.ceil((new Date(member.expiry_date || "").getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
        )

        // Crear datos del socio con días calculados
        const memberWithDays = {
          ...member,
          daysUntilExpiry: daysUntilExpiry.toString(),
        }

        // Procesar template con datos del socio
        const processedSubject = emailService.replaceTemplateVariables(reminderTemplate.subject, memberWithDays)
        const processedContent = emailService.replaceTemplateVariables(reminderTemplate.content, memberWithDays)

        console.log(`📧 Enviando: "${processedSubject}" a ${member.email}`)

        // Enviar email
        const result = await emailService.sendEmail({
          to: member.email,
          subject: processedSubject,
          text: processedContent,
        })

        if (result.success) {
          // Registrar envío exitoso
          await emailService.logEmailSent(member.id, "membership_reminder", processedSubject, "sent")
          successCount++
          console.log(`✅ Recordatorio enviado exitosamente a ${member.name}`)
        } else {
          throw new Error(result.error || "Error desconocido al enviar email")
        }

        // Pausa entre envíos para evitar spam
        await new Promise((resolve) => setTimeout(resolve, 500))
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error desconocido"
        console.error(`❌ Error enviando recordatorio a ${member.name}:`, errorMessage)

        // Registrar error
        await emailService.logEmailSent(
          member.id,
          "membership_reminder",
          reminderTemplate.subject,
          "failed",
          errorMessage,
        )
        errorCount++
      }
    }

    console.log(`📊 Resumen de envíos: ${successCount} exitosos, ${errorCount} errores`)
    return { successCount, errorCount }
  }

  // Obtener template de recordatorio
  private async getReminderTemplate(): Promise<{ subject: string; content: string }> {
    try {
      // Intentar obtener template personalizado de recordatorios
      const result = await sql`
        SELECT reminder_template 
        FROM system_config 
        WHERE reminder_template IS NOT NULL 
        ORDER BY id DESC 
        LIMIT 1
      `

      if (result.length > 0 && result[0].reminder_template) {
        const template = JSON.parse(result[0].reminder_template)
        console.log("📝 Usando template personalizado de recordatorios")
        return template
      }
    } catch (error) {
      console.error("⚠️ Error obteniendo template personalizado:", error)
    }

    // Template por defecto
    console.log("📝 Usando template por defecto de recordatorios")
    return {
      subject: "🏋️ Tu membresía vence en {{daysUntilExpiry}} días - FitHouse Gym",
      content: `Hola {{memberName}},

¡Esperamos que estés disfrutando de tu entrenamiento en FitHouse Gym! 💪

Te escribimos para recordarte que tu membresía "{{membershipName}}" vence en {{daysUntilExpiry}} días, el {{expiryDate}}.

Para continuar disfrutando de nuestras instalaciones sin interrupciones, te recomendamos renovar tu membresía antes de la fecha de vencimiento.

📋 DETALLES DE TU MEMBRESÍA:
• Plan: {{membershipName}}
• Fecha de vencimiento: {{expiryDate}}
• Precio de renovación: ${{ price }}

💳 FORMAS DE RENOVAR:
• Visitando nuestras instalaciones
• Contactándonos por WhatsApp
• Llamándonos directamente

¡No dejes que tu rutina se interrumpa! Renueva hoy y sigue alcanzando tus objetivos.

Saludos cordiales,
Equipo FitHouse Gym 🏋️‍♂️

---
Este es un recordatorio automático. Si ya renovaste tu membresía, puedes ignorar este mensaje.`,
    }
  }

  // Marcar que se enviaron recordatorios hoy
  private async markRemindersAsSentToday(): Promise<void> {
    try {
      await sql`
        INSERT INTO email_logs (member_id, email_type, subject, sent_at, status)
        VALUES (0, 'daily_reminder_check', 'Verificación diaria de recordatorios', NOW(), 'sent')
      `
    } catch (error) {
      console.error("Error marcando recordatorios como enviados:", error)
    }
  }
}

// Instancia singleton
export const autoReminderService = AutoReminderService.getInstance()
