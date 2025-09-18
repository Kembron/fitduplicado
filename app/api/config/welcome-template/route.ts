import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database"
import { getSession } from "@/lib/auth"

const DEFAULT_TEMPLATE = {
  subject: "¡Bienvenido a FitHouse Gym! 🏋️",
  content: `¡Hola {{memberName}}!

¡Te damos la más cordial bienvenida a FitHouse Gym! 🎉

Estamos muy emocionados de tenerte como parte de nuestra familia fitness. A partir de hoy, tienes acceso completo a todas nuestras instalaciones y servicios.

📋 DETALLES DE TU MEMBRESÍA:
• Tipo de membresía: {{membershipName}}
• Fecha de inicio: {{joinDate}}
• Fecha de vencimiento: {{expiryDate}}
• Precio mensual: \${{price}}

🏋️ ¿QUÉ PUEDES HACER AHORA?
• Acceder al gimnasio en nuestros horarios de atención
• Utilizar todos los equipos y máquinas
• Participar en nuestras clases grupales
• Consultar con nuestros entrenadores

💡 CONSEJOS PARA EMPEZAR:
• Llega 15 minutos antes para familiarizarte con las instalaciones
• No olvides traer una toalla y botella de agua
• Si tienes dudas, nuestro personal estará encantado de ayudarte
• Establece metas realistas y mantén la constancia

📞 CONTACTO:
Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.

¡Esperamos verte pronto y que disfrutes al máximo tu experiencia en FitHouse Gym!

¡A entrenar se ha dicho! 💪`,
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Buscar en system_config (tabla que YA existe)
    const result = await sql`
      SELECT welcome_template FROM system_config WHERE id = 1
    `

    if (result.length > 0 && result[0].welcome_template) {
      try {
        const template = JSON.parse(result[0].welcome_template)
        return NextResponse.json({
          success: true,
          template: {
            subject: template.subject || DEFAULT_TEMPLATE.subject,
            content: template.content || DEFAULT_TEMPLATE.content,
          },
        })
      } catch (parseError) {
        console.error("Error parsing template:", parseError)
      }
    }

    return NextResponse.json({
      success: true,
      template: DEFAULT_TEMPLATE,
      isDefault: true,
    })
  } catch (error) {
    console.error("Error getting template:", error)
    return NextResponse.json({
      success: true,
      template: DEFAULT_TEMPLATE,
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

    // Guardar en system_config (tabla que YA existe)
    await sql`
      UPDATE system_config 
      SET welcome_template = ${templateJson}
      WHERE id = 1
    `

    return NextResponse.json({
      success: true,
      message: "Template guardado exitosamente",
    })
  } catch (error) {
    console.error("Error saving template:", error)
    return NextResponse.json({ error: "Error al guardar el template" }, { status: 500 })
  }
}
