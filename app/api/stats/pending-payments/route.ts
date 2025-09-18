import { NextResponse } from "next/server"
import { getPendingPayments } from "@/lib/database"
import { getSession } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    // Verificar autenticación
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    console.log("Pending payments API called - using unified function")

    // USAR LA MISMA FUNCIÓN UNIFICADA que usa el dashboard
    const result = await getPendingPayments()

    console.log("Pending payments API result:", result)

    return NextResponse.json(result)
  } catch (error) {
    console.error("[PENDING_PAYMENTS_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
