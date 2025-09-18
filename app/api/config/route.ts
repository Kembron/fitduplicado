import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database"

// Modificar la función GET para crear la tabla si no existe
export async function GET() {
  try {
    // Verificar si la tabla system_config existe, si no, crearla
    try {
      await sql`
        SELECT 1 FROM system_config LIMIT 1
      `
    } catch (error) {
      // La tabla no existe, vamos a crearla
      console.log("Tabla system_config no encontrada, creándola automáticamente...")

      await sql`
        CREATE TABLE IF NOT EXISTS system_config (
          id SERIAL PRIMARY KEY,
          grace_period_days INTEGER DEFAULT 7 CHECK (grace_period_days >= 0 AND grace_period_days <= 30),
          auto_suspend_days INTEGER DEFAULT 45 CHECK (auto_suspend_days >= 1 AND auto_suspend_days <= 365),
          auto_inactive_days INTEGER DEFAULT 90 CHECK (auto_inactive_days >= 1 AND auto_inactive_days <= 365),
          enable_notifications BOOLEAN DEFAULT true,
          enable_auto_reports BOOLEAN DEFAULT false,
          allow_partial_payments BOOLEAN DEFAULT false,
          require_member_photo BOOLEAN DEFAULT true,
          theme_mode VARCHAR(10) DEFAULT 'system' CHECK (theme_mode IN ('light', 'dark', 'system')),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `

      // Insertar configuración por defecto
      await sql`
        INSERT INTO system_config (
          grace_period_days,
          auto_suspend_days,
          auto_inactive_days,
          enable_notifications,
          enable_auto_reports,
          allow_partial_payments,
          require_member_photo,
          theme_mode
        ) VALUES (7, 45, 90, true, false, false, true, 'system')
      `

      console.log("Tabla system_config creada e inicializada correctamente")
    }

    // Obtener configuración del sistema
    const config = await sql`
      SELECT * FROM system_config 
      ORDER BY id DESC 
      LIMIT 1
    `

    if (config.length === 0) {
      // Crear configuración por defecto si no existe
      const defaultConfig = await sql`
        INSERT INTO system_config (
          grace_period_days,
          auto_suspend_days,
          auto_inactive_days,
          enable_notifications,
          enable_auto_reports,
          allow_partial_payments,
          require_member_photo,
          theme_mode
        ) VALUES (7, 45, 90, true, false, false, true, 'system')
        RETURNING *
      `
      return NextResponse.json(defaultConfig[0])
    }

    return NextResponse.json(config[0])
  } catch (error) {
    console.error("Error getting system config:", error)
    return NextResponse.json({ error: "Error al obtener configuración" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      grace_period_days,
      auto_suspend_days,
      auto_inactive_days,
      enable_notifications,
      enable_auto_reports,
      allow_partial_payments,
      require_member_photo,
      theme_mode,
    } = body

    // Validaciones
    if (grace_period_days < 0 || grace_period_days > 30) {
      return NextResponse.json({ error: "Período de gracia debe estar entre 0 y 30 días" }, { status: 400 })
    }

    if (auto_suspend_days < 1 || auto_suspend_days > 365) {
      return NextResponse.json({ error: "Auto-suspensión debe estar entre 1 y 365 días" }, { status: 400 })
    }

    if (auto_inactive_days < 1 || auto_inactive_days > 365) {
      return NextResponse.json({ error: "Auto-inactivo debe estar entre 1 y 365 días" }, { status: 400 })
    }

    if (!["light", "dark", "system"].includes(theme_mode)) {
      return NextResponse.json({ error: "Tema debe ser 'light', 'dark' o 'system'" }, { status: 400 })
    }

    // Verificar si existe configuración
    const existingConfig = await sql`
      SELECT id FROM system_config 
      ORDER BY id DESC 
      LIMIT 1
    `

    let result

    if (existingConfig.length === 0) {
      // Crear nueva configuración
      result = await sql`
        INSERT INTO system_config (
          grace_period_days,
          auto_suspend_days,
          auto_inactive_days,
          enable_notifications,
          enable_auto_reports,
          allow_partial_payments,
          require_member_photo,
          theme_mode,
          updated_at
        ) VALUES (
          ${grace_period_days},
          ${auto_suspend_days},
          ${auto_inactive_days},
          ${enable_notifications},
          ${enable_auto_reports},
          ${allow_partial_payments},
          ${require_member_photo},
          ${theme_mode},
          NOW()
        )
        RETURNING *
      `
    } else {
      // Actualizar configuración existente
      result = await sql`
        UPDATE system_config 
        SET 
          grace_period_days = ${grace_period_days},
          auto_suspend_days = ${auto_suspend_days},
          auto_inactive_days = ${auto_inactive_days},
          enable_notifications = ${enable_notifications},
          enable_auto_reports = ${enable_auto_reports},
          allow_partial_payments = ${allow_partial_payments},
          require_member_photo = ${require_member_photo},
          theme_mode = ${theme_mode},
          updated_at = NOW()
        WHERE id = ${existingConfig[0].id}
        RETURNING *
      `
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error updating system config:", error)
    return NextResponse.json({ error: "Error al actualizar configuración" }, { status: 500 })
  }
}
