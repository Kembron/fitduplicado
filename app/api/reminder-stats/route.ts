import { NextResponse } from "next/server"
import { enhancedAutoReminderService } from "@/lib/enhanced-auto-reminder-service"

export async function GET() {
  try {
    console.log("📊 API: Obteniendo estadísticas del sistema de recordatorios...")

    const stats = await enhancedAutoReminderService.getReminderStats()

    return NextResponse.json({
      success: true,
      stats: {
        ...stats,
        isConfigured: !!(process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD),
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ API: Error obteniendo estadísticas:", error)

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
