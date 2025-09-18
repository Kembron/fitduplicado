import { NextResponse } from "next/server"
import { getDashboardStatsOptimized } from "@/lib/database-optimized-final"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    // Verificar autenticación
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener estadísticas del dashboard que incluyen información de pagos pendientes
    const stats = await getDashboardStatsOptimized()

    // Crear una respuesta con los detalles de pagos pendientes
    const pendingPayments = {
      count: stats.pendingPaymentsCount || 0,
      amount: stats.pendingPayments || 0,
      details: `${stats.pendingPaymentsCount || 0} pagos pendientes por un total de $${stats.pendingPayments || 0}`,
    }

    return NextResponse.json({ pendingPayments })
  } catch (error) {
    console.error("Error en pending payments details:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
