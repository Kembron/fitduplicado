import { NextResponse } from "next/server"
import { sql } from "@/lib/database"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    console.log("📋 STATUS: Obteniendo estado completo del sistema...")

    // Obtener información detallada del sistema
    const [eligibleMembers, todaysLogs, blacklistEntries, rateControl, recentActivity] = await Promise.all([
      // Miembros elegibles para recordatorios
      sql`
        SELECT 
          m.id,
          m.name,
          m.email,
          m.expiry_date,
          ms.name as membership_name,
          (m.expiry_date - CURRENT_DATE) as days_until_expiry
        FROM members m
        LEFT JOIN memberships ms ON m.membership_id = ms.id
        WHERE m.status = 'active'
        AND m.email IS NOT NULL
        AND m.email != ''
        AND m.email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
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
        ORDER BY m.expiry_date ASC
      `,

      // Logs de hoy
      sql`
        SELECT 
          el.*,
          m.name as member_name,
          m.email as member_email
        FROM email_logs el
        LEFT JOIN members m ON el.member_id = m.id
        WHERE DATE(el.sent_at) = CURRENT_DATE
        AND el.email_type = 'membership_reminder'
        ORDER BY el.sent_at DESC
      `,

      // Entradas en blacklist
      sql`
        SELECT 
          eb.*,
          m.name as member_name
        FROM email_blacklist eb
        LEFT JOIN members m ON eb.member_id = m.id
        ORDER BY eb.last_attempt_date DESC
        LIMIT 20
      `,

      // Control de rate limiting
      sql`
        SELECT * FROM email_rate_control 
        WHERE batch_date = CURRENT_DATE
        ORDER BY id DESC 
        LIMIT 1
      `,

      // Actividad reciente (últimos 7 días)
      sql`
        SELECT 
          DATE(sent_at) as date,
          COUNT(*) as total_emails,
          COUNT(CASE WHEN status = 'sent' THEN 1 END) as successful,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
        FROM email_logs
        WHERE email_type = 'membership_reminder'
        AND sent_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY DATE(sent_at)
        ORDER BY date DESC
      `,
    ])

    const systemStatus = {
      isConfigured: !!(process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD),
      eligibleCount: eligibleMembers.length,
      todaysSent: todaysLogs.filter((log) => log.status === "sent").length,
      todaysFailed: todaysLogs.filter((log) => log.status === "failed").length,
      blacklistedCount: blacklistEntries.filter((entry) => entry.is_permanent).length,
      rateLimit: rateControl[0] || null,
      lastActivity: todaysLogs.length > 0 ? todaysLogs[0].sent_at : null,
    }

    return NextResponse.json({
      success: true,
      systemStatus,
      eligibleMembers: eligibleMembers.slice(0, 10), // Solo primeros 10 para no sobrecargar
      todaysLogs,
      blacklistEntries: blacklistEntries.slice(0, 10),
      recentActivity,
      recommendations: generateRecommendations(systemStatus, eligibleMembers.length),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ STATUS: Error obteniendo estado:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

function generateRecommendations(status: any, eligibleCount: number): string[] {
  const recommendations: string[] = []

  if (!status.isConfigured) {
    recommendations.push("⚠️ Configurar variables de entorno EMAIL_USER y EMAIL_APP_PASSWORD")
  }

  if (eligibleCount > 0 && status.todaysSent === 0) {
    recommendations.push(`📧 Hay ${eligibleCount} miembros elegibles para recordatorios hoy`)
  }

  if (status.todaysFailed > 0) {
    recommendations.push(`❌ ${status.todaysFailed} emails fallaron hoy - revisar blacklist`)
  }

  if (status.blacklistedCount > 10) {
    recommendations.push(`🚫 ${status.blacklistedCount} emails en blacklist - considerar limpiar lista`)
  }

  if (!status.lastActivity) {
    recommendations.push("🔄 No hay actividad reciente - considerar ejecutar recordatorios")
  }

  if (recommendations.length === 0) {
    recommendations.push("✅ Sistema funcionando correctamente")
  }

  return recommendations
}
