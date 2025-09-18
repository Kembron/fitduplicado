import { NextResponse } from "next/server"
import { sql } from "@/lib/database"

export async function GET() {
  try {
    console.log("📋 API: Obteniendo lista negra de emails...")

    const blacklist = await sql`
      SELECT 
        eb.*,
        m.name as member_name,
        m.email as current_email
      FROM email_blacklist eb
      LEFT JOIN members m ON eb.member_id = m.id
      ORDER BY eb.last_attempt_date DESC
      LIMIT 100
    `

    return NextResponse.json({
      success: true,
      blacklist,
      count: blacklist.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ API: Error obteniendo blacklist:", error)

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

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get("memberId")

    if (!memberId) {
      return NextResponse.json({ success: false, error: "memberId es requerido" }, { status: 400 })
    }

    console.log(`🗑️ API: Removiendo de blacklist al miembro ${memberId}...`)

    const result = await sql`
      DELETE FROM email_blacklist 
      WHERE member_id = ${memberId}
    `

    return NextResponse.json({
      success: true,
      message: `Miembro ${memberId} removido de la blacklist`,
      deletedRows: result.count,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ API: Error removiendo de blacklist:", error)

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
