import nodemailer from "nodemailer"
import { sql } from "@/lib/database"

// Tipos para el servicio de email
export interface EmailConfig {
  user: string
  password: string
  host?: string
  port?: number
  secure?: boolean
}

export interface EmailData {
  to: string
  subject: string
  text: string
  html?: string
  from?: string
}

export interface EmailResult {
  success: boolean
  messageId?: string
  provider?: string
  error?: string
}

export interface MemberEmailData {
  id: number
  name: string
  email: string
  status: string
  expiry_date?: string
  join_date?: string
  membership_name?: string
  price?: number
}

// Clase principal del servicio de email
export class EmailService {
  private transporters: Array<{ name: string; transporter: nodemailer.Transporter }> = []
  private isInitialized = false
  private lastError: any = null // Declare lastError variable here

  constructor() {
    this.initializeTransporters()
  }

  private initializeTransporters() {
    try {
      this.transporters = []

      // Verificar variables de entorno requeridas
      if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
        console.warn("⚠️ Variables de entorno EMAIL_USER o EMAIL_APP_PASSWORD no configuradas")
        return
      }

      // Transporter principal con Gmail
      this.transporters.push({
        name: "Gmail Service",
        transporter: nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD,
          },
        }),
      })

      // Transporter alternativo con SMTP manual
      this.transporters.push({
        name: "Gmail SMTP",
        transporter: nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD,
          },
          tls: {
            rejectUnauthorized: false,
          },
        }),
      })

      this.isInitialized = true
      console.log(`✅ EmailService inicializado con ${this.transporters.length} transporters`)
    } catch (error) {
      console.error("❌ Error inicializando EmailService:", error)
      this.isInitialized = false
    }
  }

  // Verificar si el servicio está configurado correctamente
  public isConfigured(): boolean {
    return this.isInitialized && this.transporters.length > 0
  }

  // Enviar un email con fallback automático
  public async sendEmail(emailData: EmailData): Promise<EmailResult> {
    const maxRetries = 3
    let retryCount = 0

    if (!this.isConfigured()) {
      return {
        success: false,
        error: "Servicio de email no configurado. Verifica las variables de entorno EMAIL_USER y EMAIL_APP_PASSWORD.",
      }
    }

    // Validar datos del email
    const validation = this.validateEmailData(emailData)
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error,
      }
    }

    while (retryCount < maxRetries) {
      // Intentar enviar con cada transporter
      for (const { name, transporter } of this.transporters) {
        try {
          console.log(`📤 Intentando enviar email con ${name} (intento ${retryCount + 1}/${maxRetries})...`)

          // Verificar conexión con timeout
          const verifyPromise = transporter.verify()
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout verificando conexión")), 5000),
          )

          await Promise.race([verifyPromise, timeoutPromise])
          console.log(`✅ Conexión verificada con ${name}`)

          // Preparar datos del email con sanitización
          const mailOptions = {
            from: emailData.from || `"FitHouse Gym" <${process.env.EMAIL_USER}>`,
            to: emailData.to.trim(),
            subject: emailData.subject.trim(),
            text: emailData.text.trim(),
            html: emailData.html || this.generateDefaultHTML(emailData.subject.trim(), emailData.text.trim()),
          }

          // Enviar email con timeout
          const sendPromise = transporter.sendMail(mailOptions)
          const sendTimeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout enviando email")), 30000),
          )

          const info = await Promise.race([sendPromise, sendTimeoutPromise])
          console.log(`✅ Email enviado exitosamente con ${name}:`, info.messageId)

          return {
            success: true,
            messageId: info.messageId,
            provider: name,
          }
        } catch (error) {
          console.error(`❌ Error con ${name} (intento ${retryCount + 1}):`, error)
          this.lastError = error // Assign error to lastError variable here
          continue
        }
      }

      retryCount++
      if (retryCount < maxRetries) {
        console.log(`🔄 Reintentando envío de email en ${retryCount * 2} segundos...`)
        await new Promise((resolve) => setTimeout(resolve, retryCount * 2000))
      }
    }

    // Si llegamos aquí, todos los intentos fallaron
    return {
      success: false,
      error: `Falló después de ${maxRetries} intentos. Último error: ${this.lastError?.message || "Error desconocido"}`,
    }
  }

  // Validar datos del email
  private validateEmailData(emailData: EmailData): { isValid: boolean; error?: string } {
    if (!emailData.to?.trim()) {
      return { isValid: false, error: "Email de destinatario requerido" }
    }

    if (!emailData.subject?.trim()) {
      return { isValid: false, error: "Asunto del email requerido" }
    }

    if (!emailData.text?.trim()) {
      return { isValid: false, error: "Contenido del email requerido" }
    }

    // Validar formato de email más estricto
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (!emailRegex.test(emailData.to.trim())) {
      return { isValid: false, error: "Formato de email inválido" }
    }

    // Validar longitud del asunto
    if (emailData.subject.trim().length > 200) {
      return { isValid: false, error: "El asunto es demasiado largo (máximo 200 caracteres)" }
    }

    // Validar longitud del contenido
    if (emailData.text.trim().length > 10000) {
      return { isValid: false, error: "El contenido es demasiado largo (máximo 10,000 caracteres)" }
    }

    return { isValid: true }
  }

  // Generar HTML por defecto
  private generateDefaultHTML(subject: string, content: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
        <!-- Encabezado -->
        <div style="background: linear-gradient(135deg, #3b82f6, #06b6d4); padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; color: white; font-weight: 700;">🏋️ FitHouse Gym</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">${subject}</p>
        </div>
        
        <!-- Contenido -->
        <div style="padding: 30px 25px;">
            <div style="color: #374151; line-height: 1.6; font-size: 16px; white-space: pre-line;">
                ${content.replace(/\n/g, "<br>")}
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px; margin-top: 30px;">
                <p style="color: #3b82f6; font-size: 18px; font-weight: 600; margin: 0;">
                    ¡Gracias por ser parte de FitHouse Gym! 💪
                </p>
                <p style="color: #64748b; margin: 10px 0 0 0; font-size: 14px;">
                    Equipo FitHouse Gym
                </p>
            </div>
        </div>
    </div>
</body>
</html>
    `
  }

  // Reemplazar variables en templates
  public replaceTemplateVariables(content: string, memberData: MemberEmailData): string {
    const variables = {
      memberName: memberData.name || "Socio",
      membershipName: memberData.membership_name || "Membresía",
      expiryDate: memberData.expiry_date
        ? new Date(memberData.expiry_date).toLocaleDateString("es-UY", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "No disponible",
      joinDate: memberData.join_date
        ? new Date(memberData.join_date).toLocaleDateString("es-UY", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "No disponible",
      price: memberData.price ? memberData.price.toString() : "0",
      status: memberData.status || "activo",
      daysUntilExpiry: memberData.expiry_date
        ? Math.max(
            0,
            Math.ceil((new Date(memberData.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
          ).toString()
        : "0",
    }

    let result = content
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g")
      result = result.replace(regex, String(value))
    })

    return result
  }

  // Registrar envío en la base de datos
  public async logEmailSent(
    memberId: number,
    emailType: string,
    subject: string,
    status: "sent" | "failed" = "sent",
    errorMessage?: string,
  ): Promise<void> {
    try {
      await sql`
        INSERT INTO email_logs (member_id, email_type, subject, sent_at, status, error_message)
        VALUES (${memberId}, ${emailType}, ${subject}, NOW(), ${status}, ${errorMessage || null})
      `
    } catch (error) {
      console.error("Error registrando email en la base de datos:", error)
    }
  }

  public async checkHealth(): Promise<{ healthy: boolean; errors: string[] }> {
    const errors: string[] = []

    if (!this.isConfigured()) {
      errors.push("Servicio no configurado correctamente")
      return { healthy: false, errors }
    }

    for (const { name, transporter } of this.transporters) {
      try {
        await Promise.race([
          transporter.verify(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000)),
        ])
      } catch (error) {
        errors.push(`${name}: ${error.message}`)
      }
    }

    return {
      healthy: errors.length === 0,
      errors,
    }
  }
}

// Instancia singleton del servicio
export const emailService = new EmailService()
