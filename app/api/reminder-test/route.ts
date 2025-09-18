import { NextResponse } from "next/server"
import { enhancedAutoReminderService } from "@/lib/enhanced-auto-reminder-service"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    console.log("🧪 TEST: Iniciando prueba del sistema de recordatorios...")

    // Obtener estadísticas antes del test
    const statsBefore = await enhancedAutoReminderService.getReminderStats()

    console.log("📊 Estadísticas antes del test:", statsBefore)

    // Ejecutar el sistema de recordatorios
    const result = await enhancedAutoReminderService.checkAndSendReminders()

    // Obtener estadísticas después del test
    const statsAfter = await enhancedAutoReminderService.getReminderStats()

    console.log("📊 Estadísticas después del test:", statsAfter)

    return NextResponse.json({
      success: true,
      testResult: result,
      statsBefore,
      statsAfter,
      changes: {
        emailsSent: statsAfter.todaysSent - statsBefore.todaysSent,
        newBlacklisted: statsAfter.blacklistedEmails - statsBefore.blacklistedEmails,
        pendingChange: statsBefore.pendingReminders - statsAfter.pendingReminders,
      },
      timestamp: new Date().toISOString(),
      message: "Prueba del sistema de recordatorios completada",
    })
  } catch (error) {
    console.error("❌ TEST: Error en prueba de recordatorios:", error)

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

export async function POST() {
  return GET()
}
