import { NextResponse } from "next/server"
import { sql } from "@/lib/database"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener la última ejecución del recordatorio
    const lastRunResult = await sql`
      SELECT 
        MAX(sent_at) as last_run,
        COUNT(*) as total_sent
      FROM email_logs
      WHERE email_type = 'membership_reminder'
      AND status = 'sent'
    `

    // Calcular la próxima ejecución (8:00 AM del día siguiente)
    const now = new Date()
    const nextRun = new Date()
    nextRun.setDate(now.getDate() + 1)
    nextRun.setHours(8, 0, 0, 0)

    // Verificar si el sistema está activo usando las columnas correctas
    const configResult = await sql`
      SELECT config_value FROM system_config
      WHERE config_key = 'automatic_reminders_enabled'
    `

    const isActive = configResult.length > 0 ? configResult[0].config_value === "true" : true

    return NextResponse.json({
      status: isActive ? "active" : "inactive",
      lastRun: lastRunResult[0]?.last_run || null,
      nextRun: nextRun.toISOString(),
      totalSent: Number(lastRunResult[0]?.total_sent || 0),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error obteniendo estado de recordatorios:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
