import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

// Endpoint para probar el template del email sin enviarlo
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { memberName = "Juan Pérez", membershipName = "Plan Premium", expiryDate = "2024-01-15", price = 2500 } = body

    const formattedDate = new Date(expiryDate).toLocaleDateString("es-UY", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    const htmlTemplate = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
  <!-- Encabezado -->
  <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 28px; color: white; font-weight: 700;">🏋️ FitHouse Gym</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 18px; font-weight: 600;">
      ¡Tu membresía vence pronto!
    </p>
  </div>
  
  <!-- Contenido principal -->
  <div style="background: #ffffff; padding: 30px 25px;">
    <p style="color: #1f2937; font-size: 16px; margin-bottom: 25px; line-height: 1.5;">
      Hola <strong>${memberName}</strong>,
    </p>
    
    <p style="color: #374151; line-height: 1.6; margin-bottom: 25px; font-size: 16px;">
      ¡Esperamos que estés disfrutando de tu entrenamiento en <strong>FitHouse Gym</strong>!
    </p>

    <div style="background: #fef2f2; border: 2px solid #fecaca; padding: 20px; border-radius: 8px; margin-bottom: 25px; text-align: center;">
      <h2 style="color: #dc2626; margin: 0 0 10px 0; font-size: 20px;">⚠️ Recordatorio Importante</h2>
      <p style="color: #991b1b; margin: 0; font-size: 16px; font-weight: 600;">
        Tu membresía vence en <span style="background: #dc2626; color: white; padding: 4px 8px; border-radius: 4px;">3 días</span>
      </p>
    </div>
    
    <!-- Detalles de la membresía -->
    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #ef4444; margin-bottom: 30px;">
      <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 15px; font-size: 18px;">
        📋 Detalles de tu membresía:
      </h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px 0; font-weight: bold; color: #374151;">Plan:</td>
          <td style="padding: 8px 0; color: #1f2937;">${membershipName}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px 0; font-weight: bold; color: #374151;">Vence el:</td>
          <td style="padding: 8px 0; color: #dc2626; font-weight: 600;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold; color: #374151;">Precio renovación:</td>
          <td style="padding: 8px 0; color: #059669; font-weight: 600; font-size: 18px;">$${price}</td>
        </tr>
      </table>
    </div>
    
    <!-- Opciones de renovación -->
    <div style="background: linear-gradient(to right, #ecfdf5, #f0fdf4); padding: 25px; border-radius: 8px; margin-bottom: 30px;">
      <h3 style="color: #065f46; margin-top: 0; margin-bottom: 20px; font-size: 18px; text-align: center;">
        💪 ¿Cómo renovar tu membresía?
      </h3>
      
      <div style="display: grid; gap: 15px;">
        <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
          <div style="font-size: 24px; margin-bottom: 8px;">🏢</div>
          <strong style="color: #1f2937; display: block; margin-bottom: 5px;">Visítanos</strong>
          <span style="color: #6b7280; font-size: 14px;">En nuestras instalaciones</span>
        </div>
        
        <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
          <div style="font-size: 24px; margin-bottom: 8px;">📱</div>
          <strong style="color: #1f2937; display: block; margin-bottom: 5px;">WhatsApp</strong>
          <span style="color: #6b7280; font-size: 14px;">Mensaje directo</span>
        </div>
        
        <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
          <div style="font-size: 24px; margin-bottom: 8px;">📞</div>
          <strong style="color: #1f2937; display: block; margin-bottom: 5px;">Llámanos</strong>
          <span style="color: #6b7280; font-size: 14px;">Atención personalizada</span>
        </div>
      </div>
    </div>
    
    <!-- Mensaje de cierre -->
    <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px;">
      <p style="color: #ef4444; font-size: 18px; font-weight: 600; margin: 0;">
        ¡No dejes que tu rutina se interrumpa! 💪
      </p>
      <p style="color: #64748b; margin: 10px 0 0 0; font-size: 14px;">
        Equipo FitHouse Gym
      </p>
    </div>
  </div>
</div>
    `

    return NextResponse.json({
      success: true,
      preview: {
        memberName,
        membershipName,
        expiryDate: formattedDate,
        price,
        htmlTemplate,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Error generando preview",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
