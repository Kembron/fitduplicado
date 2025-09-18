import { NextResponse } from "next/server"
import { enhancedAutoReminderService } from "@/lib/enhanced-auto-reminder-service"

export async function GET() {
  try {
    console.log("🔔 API: Iniciando verificación de recordatorios mejorada...")

    const result = await enhancedAutoReminderService.checkAndSendReminders()

    console.log("📊 API: Resultado del proceso:", result)

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ API: Error en check-reminders:", error)

    return NextResponse.json(
      {
        success: false,
        sent: false,
        count: 0,
        message: `Error del servidor: ${error instanceof Error ? error.message : "Error desconocido"}`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function POST() {
  // Permitir también POST para mayor flexibilidad
  return GET()
}
