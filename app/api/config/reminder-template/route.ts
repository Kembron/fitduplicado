import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database"
import { getSession } from "@/lib/auth"

const DEFAULT_REMINDER_TEMPLATE = {
  subject: "🏋️ Tu membresía vence pronto - FitHouse Gym",
  content: `Hola {{memberName}},

¡Esperamos que estés disfrutando de tu entrenamiento en FitHouse Gym!

Te escribimos para recordarte que tu membresía "{{membershipName}}" vence en {{daysUntilExpiry}} días, el {{expiryDate}}.

Para continuar disfrutando de nuestras instalaciones sin interrupciones, te recomendamos renovar tu membresía antes de la fecha de vencimiento.

DETALLES DE TU MEMBRESÍA:
- Plan: {{membershipName}}
- Fecha de vencimiento: {{expiryDate}}
- Precio de renovación: \${{price}}

Puedes renovar tu membresía:
- Visitando nuestras instalaciones
- Contactándonos por WhatsApp
- Llamándonos directamente

¡No dejes que tu rutina se interrumpa!

Saludos,
Equipo FitHouse Gym`,
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Buscar en system_config
    const result = await sql`
      SELECT reminder_template FROM system_config WHERE id = 1
    `

    if (result.length > 0 && result[0].reminder_template) {
      try {
        const template = JSON.parse(result[0].reminder_template)
        return NextResponse.json({
          success: true,
          template: {
            subject: template.subject || DEFAULT_REMINDER_TEMPLATE.subject,
            content: template.content || DEFAULT_REMINDER_TEMPLATE.content,
          },
        })
      } catch (parseError) {
        console.error("Error parsing reminder template:", parseError)
      }
    }

    return NextResponse.json({
      success: true,
      template: DEFAULT_REMINDER_TEMPLATE,
      isDefault: true,
    })
  } catch (error) {
    console.error("Error getting reminder template:", error)
    return NextResponse.json({
      success: true,
      template: DEFAULT_REMINDER_TEMPLATE,
      isDefault: true,
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { subject, content } = await request.json()

    if (!subject?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "Asunto y contenido son requeridos" }, { status: 400 })
    }

    const template = { subject: subject.trim(), content: content.trim() }
    const templateJson = JSON.stringify(template)

    // Guardar en system_config
    await sql`
      UPDATE system_config 
      SET reminder_template = ${templateJson}
      WHERE id = 1
    `

    return NextResponse.json({
      success: true,
      message: "Template de recordatorio guardado exitosamente",
    })
  } catch (error) {
    console.error("Error saving reminder template:", error)
    return NextResponse.json({ error: "Error al guardar el template" }, { status: 500 })
  }
}
