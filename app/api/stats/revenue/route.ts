import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/database"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener datos de ingresos por mes de los últimos 6 meses
    const result = await sql`
      SELECT 
        to_char(date_trunc('month', payment_date), 'Mon') as month,
        date_trunc('month', payment_date) as month_date,
        SUM(amount)::numeric as revenue
      FROM payments 
      WHERE payment_date >= date_trunc('month', CURRENT_DATE - INTERVAL '5 months')
        AND payment_date <= CURRENT_DATE
      GROUP BY date_trunc('month', payment_date), to_char(date_trunc('month', payment_date), 'Mon')
      ORDER BY date_trunc('month', payment_date)
    `

    // Crear array de los últimos 6 meses para asegurar que todos estén presentes
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const currentDate = new Date()
    const revenueMap = new Map()

    // Mapear los resultados de la base de datos
    result.forEach((row: any) => {
      revenueMap.set(row.month, Number(row.revenue) || 0)
    })

    // Generar los últimos 6 meses con datos o ceros
    const finalData = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const monthName = months[date.getMonth()]
      
      finalData.push({
        month: monthName,
        revenue: revenueMap.get(monthName) || 0
      })
    }

    return NextResponse.json(finalData)
  } catch (error) {
    console.error("Error fetching revenue data:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}