import { type NextRequest, NextResponse } from "next/server"
import { getMembers, createMember, createPayment, getMemberships, deleteMember } from "@/lib/database"
import { getSession } from "@/lib/auth"
import { logAuditEvent } from "@/lib/audit"
import { emailService } from "@/lib/email-service"
import { getTodayLocalDate, addDaysToToday, debugDate } from "@/lib/date-utils"
import { sql } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener parámetros de consulta con validación
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("query")?.trim() || ""
    const status = searchParams.get("status")?.trim() || "all"
    const includeInactive = searchParams.get("includeInactive") === "true" || status === "all" || status === "inactive"
    const onlySuspended = searchParams.get("onlySuspended") === "true"

    // Validar parámetros
    if (query.length > 100) {
      return NextResponse.json({ error: "Término de búsqueda demasiado largo" }, { status: 400 })
    }

    const validStatuses = ["all", "active", "expired", "suspended", "inactive", "cancelled"]
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 })
    }

    // Obtener miembros según los filtros
    const members = await getMembers({
      query,
      status: status !== "all" ? status : undefined,
      includeInactive,
      onlySuspended,
    })

    return NextResponse.json(members)
  } catch (error) {
    console.error("Error al obtener miembros:", error)

    // Determinar el tipo de error y responder apropiadamente
    if (error.message?.includes("timeout")) {
      return NextResponse.json({ error: "Timeout al consultar la base de datos" }, { status: 504 })
    }

    if (error.message?.includes("connection")) {
      return NextResponse.json({ error: "Error de conexión a la base de datos" }, { status: 503 })
    }

    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// Función para obtener el template de bienvenida
async function getWelcomeTemplate() {
  const defaultTemplate = {
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

  try {
    // Buscar template personalizado en system_config
    const result = await sql`
      SELECT welcome_template FROM system_config WHERE id = 1
    `

    if (result.length > 0 && result[0].welcome_template) {
      const customTemplate = JSON.parse(result[0].welcome_template)
      if (customTemplate.subject && customTemplate.content) {
        return customTemplate
      }
    }
  } catch (error) {
    console.warn("Error obteniendo template personalizado:", error)
  }

  return defaultTemplate
}

export async function POST(request: Request) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    let memberData
    try {
      memberData = await request.json()
    } catch (error) {
      return NextResponse.json({ error: "Datos JSON inválidos" }, { status: 400 })
    }

    // DEBUG: Log de datos recibidos
    console.log("📥 API /members POST - Datos recibidos:", memberData)
    debugDate("API /members POST - Antes de procesar")

    // FORZAR fechas correctas en el backend
    const todayLocal = getTodayLocalDate()

    // Si no se envían fechas o están incorrectas, usar las calculadas en el servidor
    if (!memberData.join_date || memberData.join_date !== todayLocal) {
      console.warn("⚠️ Corrigiendo join_date:", memberData.join_date, "->", todayLocal)
      memberData.join_date = todayLocal
    }

    // Recalcular fecha de vencimiento basada en la membresía
    const memberships = await getMemberships()
    const selectedMembership = memberships.find((m) => m.id === memberData.membership_id)

    if (selectedMembership) {
      const correctExpiryDate = addDaysToToday(selectedMembership.duration_days)
      if (memberData.expiry_date !== correctExpiryDate) {
        console.warn("⚠️ Corrigiendo expiry_date:", memberData.expiry_date, "->", correctExpiryDate)
        memberData.expiry_date = correctExpiryDate
      }
    }

    console.log("📅 API /members POST - Fechas finales:", {
      join_date: memberData.join_date,
      expiry_date: memberData.expiry_date,
      membership_duration: selectedMembership?.duration_days,
    })

    // Validaciones robustas
    const validationErrors: string[] = []

    if (!memberData.name?.trim()) {
      validationErrors.push("El nombre es obligatorio")
    } else if (memberData.name.trim().length < 2) {
      validationErrors.push("El nombre debe tener al menos 2 caracteres")
    } else if (memberData.name.trim().length > 100) {
      validationErrors.push("El nombre es demasiado largo")
    }

    if (!memberData.email?.trim()) {
      validationErrors.push("El email es obligatorio")
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(memberData.email.trim())) {
      validationErrors.push("Formato de email inválido")
    }

    if (!memberData.membership_id || !Number.isInteger(memberData.membership_id) || memberData.membership_id <= 0) {
      validationErrors.push("Debe seleccionar una membresía válida")
    }

    if (!memberData.join_date) {
      validationErrors.push("La fecha de ingreso es obligatoria")
    }

    if (!memberData.expiry_date) {
      validationErrors.push("La fecha de vencimiento es obligatoria")
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: validationErrors,
        },
        { status: 400 },
      )
    }

    if (!selectedMembership) {
      return NextResponse.json({ error: "La membresía seleccionada no existe o está inactiva" }, { status: 400 })
    }

    // Crear el socio con manejo de errores específicos
    let newMember
    try {
      newMember = await createMember(memberData)
    } catch (error) {
      if (error.message?.includes("email")) {
        return NextResponse.json({ error: "Ya existe un socio con este email" }, { status: 409 })
      }
      throw error
    }

    // Usar precio personalizado si se proporciona, sino usar el precio de la membresía
    const paymentAmount = memberData.custom_price || selectedMembership.price

    // Crear automáticamente el pago inicial de la membresía
    const paymentData = {
      member_id: newMember.id,
      amount: paymentAmount,
      payment_date: memberData.join_date, // Usar la fecha corregida
      payment_method: memberData.payment_method || "efectivo",
      description: `Pago inicial de membresía: ${selectedMembership.name}`,
      membership_id: selectedMembership.id,
      start_date: memberData.join_date,
      end_date: memberData.expiry_date,
      created_by: session.user.userId,
    }

    let newPayment
    try {
      newPayment = await createPayment(paymentData)
    } catch (error) {
      // Si falla el pago, eliminar el socio creado
      console.error("Error creating payment, rolling back member creation:", error)
      try {
        await deleteMember(newMember.id)
      } catch (rollbackError) {
        console.error("Error rolling back member creation:", rollbackError)
      }
      return NextResponse.json({ error: "Error al crear el pago inicial" }, { status: 500 })
    }

    // Registrar eventos de auditoría
    try {
      await Promise.allSettled([
        logAuditEvent({
          user_id: session.user.userId,
          user_email: session.user.email,
          action_type: "CREATE",
          table_name: "members",
          record_id: newMember.id,
          new_values: memberData,
          description: `Nuevo socio creado: ${memberData.name} (${memberData.email}) - Membresía: ${selectedMembership.name} - Fecha: ${memberData.join_date}`,
          ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
          user_agent: request.headers.get("user-agent") || "unknown",
        }),
        logAuditEvent({
          user_id: session.user.userId,
          user_email: session.user.email,
          action_type: "PAYMENT",
          table_name: "payments",
          record_id: newPayment.id,
          new_values: paymentData,
          description: `Pago inicial automático: $${paymentAmount} - ${memberData.name} - Membresía: ${selectedMembership.name} - Fecha: ${memberData.join_date}`,
          ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
          user_agent: request.headers.get("user-agent") || "unknown",
        }),
      ])
    } catch (auditError) {
      console.warn("Warning: Could not log audit events:", auditError)
      // No fallar la operación por errores de auditoría
    }

    // Enviar email de bienvenida en background (no bloquear la respuesta)
    const sendWelcomeEmailInBackground = async () => {
      try {
        if (emailService.isConfigured() && memberData.email) {
          // Obtener el template de bienvenida configurado
          const welcomeTemplate = await getWelcomeTemplate()

          const templateVariables = {
            memberName: memberData.name,
            membershipName: selectedMembership.name,
            joinDate: memberData.join_date,
            expiryDate: memberData.expiry_date,
            price: paymentAmount.toString(),
            id: newMember.id.toString(),
            name: memberData.name,
            email: memberData.email,
            status: memberData.status || "active",
          }

          const personalizedSubject = emailService.replaceTemplateVariables(welcomeTemplate.subject, templateVariables)
          const personalizedContent = emailService.replaceTemplateVariables(welcomeTemplate.content, templateVariables)

          const emailResult = await emailService.sendEmail({
            to: memberData.email,
            subject: personalizedSubject,
            text: personalizedContent,
          })

          if (emailResult.success) {
            console.log(`✅ Email de bienvenida enviado a ${memberData.email}`)
            await emailService.logEmailSent(newMember.id, "welcome", personalizedSubject, "sent")
          } else {
            console.error(`❌ Error enviando email de bienvenida: ${emailResult.error}`)
            await emailService.logEmailSent(newMember.id, "welcome", personalizedSubject, "failed", emailResult.error)
          }
        }
      } catch (emailError) {
        console.error("Error enviando email de bienvenida:", emailError)
        // Registrar el error en los logs
        if (memberData.email) {
          try {
            await emailService.logEmailSent(
              newMember.id,
              "welcome",
              "Email de bienvenida",
              "failed",
              emailError.message,
            )
          } catch (logError) {
            console.error("Error logging email failure:", logError)
          }
        }
      }
    }

    // Ejecutar el envío de email en background sin esperar
    sendWelcomeEmailInBackground().catch(console.error)

    // Log final de éxito
    console.log("✅ API /members POST - Socio creado exitosamente:", {
      member_id: newMember.id,
      name: memberData.name,
      join_date: memberData.join_date,
      expiry_date: memberData.expiry_date,
      payment_id: newPayment.id,
      payment_amount: paymentAmount,
    })

    // Devolver el socio con información del pago (respuesta inmediata)
    return NextResponse.json(
      {
        member: newMember,
        payment: newPayment,
        message: `Socio creado exitosamente con fecha ${memberData.join_date}. Pago de $${paymentAmount} registrado automáticamente.${
          memberData.email ? " Email de bienvenida será enviado en breve." : ""
        }`,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error creating member:", error)

    // Determinar el tipo de error y responder apropiadamente
    if (error.message?.includes("timeout")) {
      return NextResponse.json({ error: "Timeout al procesar la solicitud" }, { status: 504 })
    }

    if (error.message?.includes("connection")) {
      return NextResponse.json({ error: "Error de conexión a la base de datos" }, { status: 503 })
    }

    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
