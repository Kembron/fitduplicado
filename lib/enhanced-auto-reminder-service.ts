import { sql } from "@/lib/database"
import { emailService, type MemberEmailData } from "@/lib/email-service"

// Tipos para el sistema mejorado
interface EmailBlacklistEntry {
  id: number
  member_id: number
  email: string
  error_type: "invalid_email" | "permanent_failure" | "bounce" | "spam_complaint" | "temporary_failure"
  error_message: string
  first_error_date: string
  last_attempt_date: string
  attempt_count: number
  is_permanent: boolean
}

interface RateControlConfig {
  id?: number
  batch_date: string
  max_emails_per_day: number
  max_emails_per_batch: number
  batch_delay_minutes: number
  emails_sent_today: number
  last_batch_time: string
}

interface BatchResult {
  successful: number
  failed: number
  skipped: number
  blacklisted: number
  details: Array<{
    memberId: number
    memberName: string
    email: string
    status: "success" | "failed" | "skipped" | "blacklisted"
    reason?: string
    messageId?: string
  }>
}

// Servicio mejorado para manejo automático de recordatorios
export class EnhancedAutoReminderService {
  private static instance: EnhancedAutoReminderService
  private isProcessing = false
  private readonly MAX_RETRIES = 2
  private readonly PERMANENT_ERROR_THRESHOLD = 3

  private constructor() {}

  public static getInstance(): EnhancedAutoReminderService {
    if (!EnhancedAutoReminderService.instance) {
      EnhancedAutoReminderService.instance = new EnhancedAutoReminderService()
    }
    return EnhancedAutoReminderService.instance
  }

  // Función principal mejorada para verificar y enviar recordatorios
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
      console.log("🚀 Iniciando verificación mejorada de recordatorios...")

      // Verificar configuración del servicio de email
      if (!emailService.isConfigured()) {
        console.warn("⚠️ Servicio de email no configurado")
        return {
          sent: false,
          count: 0,
          message: "Servicio de email no configurado",
        }
      }

      // Verificar rate limiting
      const canSend = await this.checkRateLimit()
      if (!canSend.allowed) {
        console.log(`⏸️ Rate limit alcanzado: ${canSend.reason}`)
        return {
          sent: false,
          count: 0,
          message: `Rate limit: ${canSend.reason}`,
        }
      }

      // Obtener socios elegibles (sin blacklist y sin recordatorio hoy)
      const eligibleMembers = await this.getEligibleMembers()
      console.log(`📋 Encontrados ${eligibleMembers.length} socios elegibles para recordatorios`)

      if (eligibleMembers.length === 0) {
        return {
          sent: false,
          count: 0,
          message: "No hay socios elegibles para recordatorios hoy",
        }
      }

      // Enviar recordatorios por tandas
      const result = await this.sendRemindersBatch(eligibleMembers)

      const message = `Proceso completado: ${result.successful} enviados, ${result.failed} errores, ${result.skipped} omitidos, ${result.blacklisted} en blacklist`
      console.log(`📊 ${message}`)

      return {
        sent: result.successful > 0,
        count: result.successful,
        message: message,
        details: {
          totalEligible: eligibleMembers.length,
          successful: result.successful,
          failed: result.failed,
          skipped: result.skipped,
          blacklisted: result.blacklisted,
          batchDetails: result.details,
        },
      }
    } catch (error) {
      console.error("❌ Error en checkAndSendReminders mejorado:", error)
      return {
        sent: false,
        count: 0,
        message: `Error al procesar recordatorios: ${error instanceof Error ? error.message : "Error desconocido"}`,
      }
    } finally {
      this.isProcessing = false
    }
  }

  // Verificar rate limiting
  private async checkRateLimit(): Promise<{ allowed: boolean; reason?: string; config?: RateControlConfig }> {
    try {
      // Obtener o crear configuración de rate control
      let rateConfig = await sql`
        SELECT * FROM email_rate_control 
        WHERE batch_date = CURRENT_DATE 
        ORDER BY id DESC 
        LIMIT 1
      `

      if (rateConfig.length === 0) {
        // Crear configuración para hoy
        rateConfig = await sql`
          INSERT INTO email_rate_control (batch_date, emails_sent_today)
          VALUES (CURRENT_DATE, 0)
          RETURNING *
        `
      }

      const config = rateConfig[0] as RateControlConfig

      // Verificar límite diario
      if (config.emails_sent_today >= config.max_emails_per_day) {
        return {
          allowed: false,
          reason: `Límite diario alcanzado (${config.emails_sent_today}/${config.max_emails_per_day})`,
          config,
        }
      }

      // Verificar tiempo entre tandas
      const lastBatchTime = new Date(config.last_batch_time)
      const now = new Date()
      const minutesSinceLastBatch = (now.getTime() - lastBatchTime.getTime()) / (1000 * 60)

      if (minutesSinceLastBatch < config.batch_delay_minutes) {
        const waitTime = Math.ceil(config.batch_delay_minutes - minutesSinceLastBatch)
        return {
          allowed: false,
          reason: `Esperando ${waitTime} minutos entre tandas`,
          config,
        }
      }

      return { allowed: true, config }
    } catch (error) {
      console.error("Error verificando rate limit:", error)
      return { allowed: false, reason: "Error verificando rate limit" }
    }
  }

  // Obtener socios elegibles (filtrados por blacklist y recordatorios ya enviados)
  private async getEligibleMembers(): Promise<MemberEmailData[]> {
    try {
      console.log("🔍 Buscando socios elegibles para recordatorios...")

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
        -- Excluir usuarios en blacklist permanente
        AND m.id NOT IN (
          SELECT member_id FROM email_blacklist 
          WHERE is_permanent = true
        )
        -- Excluir usuarios que ya recibieron recordatorio hoy
        AND m.id NOT IN (
          SELECT member_id FROM email_logs
          WHERE email_type = 'membership_reminder'
          AND DATE(sent_at) = CURRENT_DATE
          AND status = 'sent'
        )
        ORDER BY m.expiry_date ASC, m.name ASC
      `

      console.log(`📋 Query resultado: ${members.length} socios elegibles encontrados`)

      // Log detallado de los socios encontrados
      members.forEach((member) => {
        const daysUntilExpiry = Math.ceil(
          (new Date(member.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
        )
        console.log(`  ✅ ${member.name} (${member.email}): vence en ${daysUntilExpiry} días`)
      })

      return members as MemberEmailData[]
    } catch (error) {
      console.error("❌ Error obteniendo socios elegibles:", error)
      return []
    }
  }

  // Enviar recordatorios por tandas con control de rate limiting
  private async sendRemindersBatch(members: MemberEmailData[]): Promise<BatchResult> {
    const result: BatchResult = {
      successful: 0,
      failed: 0,
      skipped: 0,
      blacklisted: 0,
      details: [],
    }

    // Obtener configuración de rate control
    const rateCheck = await this.checkRateLimit()
    if (!rateCheck.allowed || !rateCheck.config) {
      console.error("❌ No se puede proceder con el envío por rate limiting")
      return result
    }

    const config = rateCheck.config
    const batchSize = Math.min(config.max_emails_per_batch, members.length)
    const remainingQuota = config.max_emails_per_day - config.emails_sent_today

    console.log(`📦 Procesando en tandas de ${batchSize} emails (cuota restante: ${remainingQuota})`)

    // Obtener template de recordatorio
    const reminderTemplate = await this.getReminderTemplate()

    // Procesar en tandas
    for (let i = 0; i < members.length && result.successful < remainingQuota; i += batchSize) {
      const batch = members.slice(i, i + batchSize)
      console.log(`📤 Procesando tanda ${Math.floor(i / batchSize) + 1}: ${batch.length} emails`)

      // Procesar cada email en la tanda
      for (const member of batch) {
        if (result.successful >= remainingQuota) {
          console.log("⏹️ Cuota diaria alcanzada, deteniendo envíos")
          break
        }

        try {
          // Verificar si el email está en blacklist (doble verificación)
          const isBlacklisted = await this.isEmailBlacklisted(member.id)
          if (isBlacklisted) {
            result.blacklisted++
            result.details.push({
              memberId: member.id,
              memberName: member.name,
              email: member.email,
              status: "blacklisted",
              reason: "Email en blacklist permanente",
            })
            continue
          }

          // Calcular días hasta vencimiento
          const daysUntilExpiry = Math.max(
            0,
            Math.ceil((new Date(member.expiry_date || "").getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
          )

          const memberWithDays = {
            ...member,
            daysUntilExpiry: daysUntilExpiry.toString(),
            memberName: member.name,
            membershipName: member.membership_name || "Membresía",
            expiryDate: new Date(member.expiry_date || "").toLocaleDateString("es-UY"),
            price: member.price || 0, // Ensure price is declared
          }

          // Procesar template
          const processedSubject = emailService.replaceTemplateVariables(reminderTemplate.subject, memberWithDays)
          const processedContent = emailService.replaceTemplateVariables(reminderTemplate.content, memberWithDays)

          console.log(`📧 Enviando: "${processedSubject}" a ${member.email}`)

          // Enviar email con reintentos
          const emailResult = await this.sendEmailWithRetry(
            {
              to: member.email,
              subject: processedSubject,
              text: processedContent,
            },
            member,
          )

          if (emailResult.success) {
            // Registrar envío exitoso
            await emailService.logEmailSent(member.id, "membership_reminder", processedSubject, "sent")
            result.successful++
            result.details.push({
              memberId: member.id,
              memberName: member.name,
              email: member.email,
              status: "success",
              messageId: emailResult.messageId,
            })
            console.log(`✅ Recordatorio enviado exitosamente a ${member.name}`)
          } else {
            throw new Error(emailResult.error || "Error desconocido al enviar email")
          }

          // Pausa entre emails individuales (anti-spam)
          await new Promise((resolve) => setTimeout(resolve, 1000))
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error desconocido"
          console.error(`❌ Error enviando recordatorio a ${member.name}:`, errorMessage)

          // Manejar error y posible blacklisting
          await this.handleEmailError(member, errorMessage)

          result.failed++
          result.details.push({
            memberId: member.id,
            memberName: member.name,
            email: member.email,
            status: "failed",
            reason: errorMessage,
          })
        }
      }

      // Actualizar contador de emails enviados
      await this.updateEmailsSentCount(result.successful)

      // Pausa entre tandas (anti-spam)
      if (i + batchSize < members.length && result.successful < remainingQuota) {
        const delayMs = config.batch_delay_minutes * 60 * 1000
        console.log(`⏸️ Pausa entre tandas: ${config.batch_delay_minutes} minutos`)
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }

    console.log(`📊 Tanda completada: ${result.successful} exitosos, ${result.failed} errores`)
    return result
  }

  // Enviar email con sistema de reintentos
  private async sendEmailWithRetry(
    emailData: { to: string; subject: string; text: string },
    member: MemberEmailData,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    let lastError = ""

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`📤 Intento ${attempt}/${this.MAX_RETRIES} para ${member.email}`)

        const result = await emailService.sendEmail(emailData)

        if (result.success) {
          return { success: true, messageId: result.messageId }
        } else {
          lastError = result.error || "Error desconocido"
          console.warn(`⚠️ Intento ${attempt} falló: ${lastError}`)

          // Si es un error permanente, no reintentar
          if (this.isPermanentError(lastError)) {
            console.log(`🚫 Error permanente detectado, no reintentando: ${lastError}`)
            break
          }

          // Pausa exponencial entre reintentos
          if (attempt < this.MAX_RETRIES) {
            const delay = Math.pow(2, attempt) * 1000 // 2s, 4s, 8s...
            await new Promise((resolve) => setTimeout(resolve, delay))
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Error desconocido"
        console.error(`❌ Excepción en intento ${attempt}:`, lastError)

        if (this.isPermanentError(lastError)) {
          break
        }
      }
    }

    return { success: false, error: lastError }
  }

  // Determinar si un error es permanente
  private isPermanentError(errorMessage: string): boolean {
    const permanentErrors = [
      "invalid email",
      "email address is invalid",
      "recipient address rejected",
      "user unknown",
      "mailbox unavailable",
      "domain not found",
      "no such user",
      "address not found",
      "invalid recipient",
      "bad recipient",
      "550", // SMTP error code for permanent failure
      "553", // SMTP error code for invalid address
    ]

    const lowerError = errorMessage.toLowerCase()
    return permanentErrors.some((error) => lowerError.includes(error))
  }

  // Manejar errores de email y blacklisting
  private async handleEmailError(member: MemberEmailData, errorMessage: string): Promise<void> {
    try {
      const isPermanent = this.isPermanentError(errorMessage)
      const errorType = isPermanent ? "permanent_failure" : "temporary_failure"

      // Verificar si ya existe en blacklist
      const existingEntry = await sql`
        SELECT * FROM email_blacklist 
        WHERE member_id = ${member.id} 
        ORDER BY id DESC 
        LIMIT 1
      `

      if (existingEntry.length > 0) {
        // Actualizar entrada existente
        const entry = existingEntry[0]
        const newAttemptCount = entry.attempt_count + 1
        const shouldBlacklist = isPermanent || newAttemptCount >= this.PERMANENT_ERROR_THRESHOLD

        await sql`
          UPDATE email_blacklist 
          SET 
            error_message = ${errorMessage},
            last_attempt_date = CURRENT_TIMESTAMP,
            attempt_count = ${newAttemptCount},
            is_permanent = ${shouldBlacklist},
            error_type = ${errorType}
          WHERE id = ${entry.id}
        `

        if (shouldBlacklist) {
          console.log(`🚫 Email ${member.email} agregado a blacklist permanente (${newAttemptCount} intentos)`)
        }
      } else {
        // Crear nueva entrada en blacklist
        await sql`
          INSERT INTO email_blacklist (
            member_id, email, error_type, error_message, 
            attempt_count, is_permanent
          ) VALUES (
            ${member.id}, ${member.email}, ${errorType}, ${errorMessage},
            1, ${isPermanent}
          )
        `

        if (isPermanent) {
          console.log(`🚫 Email ${member.email} agregado a blacklist permanente (error permanente)`)
        }
      }

      // Registrar en email_logs
      await emailService.logEmailSent(member.id, "membership_reminder", "Error en recordatorio", "failed", errorMessage)
    } catch (error) {
      console.error("Error manejando error de email:", error)
    }
  }

  // Verificar si un email está en blacklist
  private async isEmailBlacklisted(memberId: number): Promise<boolean> {
    try {
      const result = await sql`
        SELECT COUNT(*) as count
        FROM email_blacklist
        WHERE member_id = ${memberId}
        AND is_permanent = true
      `
      return Number(result[0]?.count || 0) > 0
    } catch (error) {
      console.error("Error verificando blacklist:", error)
      return false
    }
  }

  // Actualizar contador de emails enviados
  private async updateEmailsSentCount(emailsSent: number): Promise<void> {
    try {
      await sql`
        UPDATE email_rate_control 
        SET 
          emails_sent_today = ${emailsSent},
          last_batch_time = CURRENT_TIMESTAMP
        WHERE batch_date = CURRENT_DATE
      `
    } catch (error) {
      console.error("Error actualizando contador de emails:", error)
    }
  }

  // Obtener template de recordatorio (reutilizado del servicio original)
  private async getReminderTemplate(): Promise<{ subject: string; content: string }> {
    try {
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

    // Template por defecto mejorado
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
• Precio de renovación: ${{ price }} // Ensure price is declared

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

  // Obtener estadísticas del sistema de recordatorios
  public async getReminderStats(): Promise<{
    todaysSent: number
    blacklistedEmails: number
    pendingReminders: number
    rateLimit: RateControlConfig
  }> {
    try {
      const [sentToday, blacklisted, pending, rateLimit] = await Promise.all([
        sql`
          SELECT COUNT(*) as count
          FROM email_logs
          WHERE email_type = 'membership_reminder'
          AND DATE(sent_at) = CURRENT_DATE
          AND status = 'sent'
        `,
        sql`
          SELECT COUNT(*) as count
          FROM email_blacklist
          WHERE is_permanent = true
        `,
        sql`
          SELECT COUNT(*) as count
          FROM members m
          WHERE m.status = 'active'
          AND m.email IS NOT NULL
          AND m.email != ''
          AND m.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
          AND m.id NOT IN (
            SELECT member_id FROM email_blacklist WHERE is_permanent = true
          )
          AND m.id NOT IN (
            SELECT member_id FROM email_logs
            WHERE email_type = 'membership_reminder'
            AND DATE(sent_at) = CURRENT_DATE
            AND status = 'sent'
          )
        `,
        sql`
          SELECT * FROM email_rate_control 
          WHERE batch_date = CURRENT_DATE 
          ORDER BY id DESC 
          LIMIT 1
        `,
      ])

      return {
        todaysSent: Number(sentToday[0]?.count || 0),
        blacklistedEmails: Number(blacklisted[0]?.count || 0),
        pendingReminders: Number(pending[0]?.count || 0),
        rateLimit: rateLimit[0] || {
          batch_date: new Date().toISOString().split("T")[0],
          max_emails_per_day: 100,
          max_emails_per_batch: 10,
          batch_delay_minutes: 5,
          emails_sent_today: 0,
          last_batch_time: new Date().toISOString(),
        },
      }
    } catch (error) {
      console.error("Error obteniendo estadísticas:", error)
      return {
        todaysSent: 0,
        blacklistedEmails: 0,
        pendingReminders: 0,
        rateLimit: {
          batch_date: new Date().toISOString().split("T")[0],
          max_emails_per_day: 100,
          max_emails_per_batch: 10,
          batch_delay_minutes: 5,
          emails_sent_today: 0,
          last_batch_time: new Date().toISOString(),
        },
      }
    }
  }
}

// Instancia singleton del servicio mejorado
export const enhancedAutoReminderService = EnhancedAutoReminderService.getInstance()
