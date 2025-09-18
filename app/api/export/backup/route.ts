import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database"
import { getSession } from "@/lib/auth"
import { logAuditEvent } from "@/lib/audit"
import JSZip from "jszip"

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getSession()
    const user = session?.user
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    console.log("Starting complete backup for user:", user.email)

    // Registrar actividad de auditoría
    await logAuditEvent({
      user_id: user.userId,
      user_email: user.email,
      action_type: "CREATE",
      table_name: "backup",
      description: "Complete system backup initiated",
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
      user_agent: request.headers.get("user-agent") || "unknown",
    })

    // Crear instancia de JSZip
    const zip = new JSZip()

    // 1. Exportar socios
    console.log("Exporting members...")
    const members = await sql`
      SELECT 
        m.id,
        m.name,
        m.email,
        m.phone,
        m.document_id,
        m.birth_date,
        m.address,
        m.emergency_contact,
        m.notes,
        m.status,
        m.join_date,
        m.expiry_date,
        m.last_payment_date,
        m.inactive_since,
        m.auto_suspended,
        ms.name as membership_name,
        ms.price as membership_price,
        ms.duration_days as membership_duration
      FROM members m
      LEFT JOIN memberships ms ON m.membership_id = ms.id
      ORDER BY m.id
    `

    // 2. Exportar pagos
    console.log("Exporting payments...")
    const payments = await sql`
      SELECT 
        p.id,
        p.member_id,
        m.name as member_name,
        p.amount,
        p.payment_date,
        p.payment_method,
        p.description,
        p.start_date,
        p.end_date,
        ms.name as membership_name,
        u.name as created_by_name
      FROM payments p
      LEFT JOIN members m ON p.member_id = m.id
      LEFT JOIN memberships ms ON p.membership_id = ms.id
      LEFT JOIN users u ON p.created_by = u.id
      ORDER BY p.payment_date DESC
    `

    // 3. Exportar membresías
    console.log("Exporting memberships...")
    const memberships = await sql`
      SELECT 
        id,
        name,
        description,
        price,
        duration_days,
        is_active,
        created_at
      FROM memberships
      ORDER BY id
    `

    // 4. Exportar asistencia
    console.log("Exporting attendance...")
    const attendance = await sql`
      SELECT 
        a.id,
        a.member_id,
        m.name as member_name,
        a.check_in,
        a.check_out,
        a.created_at
      FROM attendance a
      LEFT JOIN members m ON a.member_id = m.id
      ORDER BY a.check_in DESC
      LIMIT 10000
    `

    // 5. Exportar usuarios (sin contraseñas)
    console.log("Exporting users...")
    const users = await sql`
      SELECT 
        id,
        email,
        name,
        role,
        is_active,
        created_at,
        last_login
      FROM users
      ORDER BY id
    `

    // 6. Exportar configuración del sistema
    console.log("Exporting system config...")
    const systemConfig = await sql`
      SELECT * FROM system_config
      ORDER BY id DESC
      LIMIT 1
    `

    // 7. Exportar auditoría (últimos 1000 registros)
    console.log("Exporting audit logs...")
    const auditLogs = await sql`
      SELECT 
        al.id,
        al.user_id,
        u.name as user_name,
        al.action_type,
        al.description,
        al.ip_address,
        al.user_agent,
        al.created_at
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 1000
    `

    // Función helper para convertir a CSV
    const arrayToCSV = (data: any[], filename: string) => {
      if (data.length === 0) {
        return `${filename} - Sin datos\n`
      }

      const headers = Object.keys(data[0])
      const csvContent = [
        headers.join(","),
        ...data.map((row) =>
          headers
            .map((header) => {
              const value = row[header]
              if (value === null || value === undefined) return ""
              if (typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"))) {
                return `"${value.replace(/"/g, '""')}"`
              }
              return value
            })
            .join(","),
        ),
      ].join("\n")

      return csvContent
    }

    // Agregar archivos CSV al ZIP
    zip.file("01_socios.csv", arrayToCSV(members, "Socios"))
    zip.file("02_pagos.csv", arrayToCSV(payments, "Pagos"))
    zip.file("03_membresias.csv", arrayToCSV(memberships, "Membresías"))
    zip.file("04_asistencia.csv", arrayToCSV(attendance, "Asistencia"))
    zip.file("05_usuarios.csv", arrayToCSV(users, "Usuarios"))
    zip.file("06_configuracion.csv", arrayToCSV(systemConfig, "Configuración"))
    zip.file("07_auditoria.csv", arrayToCSV(auditLogs, "Auditoría"))

    // Crear archivo de metadatos
    const metadata = {
      backup_date: new Date().toISOString(),
      backup_by: user.name,
      backup_by_email: user.email,
      total_members: members.length,
      total_payments: payments.length,
      total_memberships: memberships.length,
      total_attendance_records: attendance.length,
      total_users: users.length,
      system_version: "1.0.0",
      database_schema_version: "1.0",
      notes: "Backup completo del sistema de gestión de gimnasio",
    }

    zip.file("00_metadata.json", JSON.stringify(metadata, null, 2))

    // Crear archivo README
    const readme = `
# Backup Completo del Sistema de Gimnasio

## Información del Backup
- Fecha: ${new Date().toLocaleString("es-UY")}
- Creado por: ${user.name} (${user.email})
- Total de archivos: 8

## Contenido del Backup

### 01_socios.csv
Información completa de todos los socios registrados en el sistema.
Total de registros: ${members.length}

### 02_pagos.csv  
Historial completo de pagos realizados por los socios.
Total de registros: ${payments.length}

### 03_membresias.csv
Catálogo de membresías disponibles en el gimnasio.
Total de registros: ${memberships.length}

### 04_asistencia.csv
Registros de asistencia de los socios (últimos 10,000 registros).
Total de registros: ${attendance.length}

### 05_usuarios.csv
Usuarios administradores del sistema (sin contraseñas).
Total de registros: ${users.length}

### 06_configuracion.csv
Configuraciones del sistema.

### 07_auditoria.csv
Logs de auditoría del sistema (últimos 1,000 registros).
Total de registros: ${auditLogs.length}

### 00_metadata.json
Metadatos del backup con información adicional.

## Instrucciones de Restauración

1. Estos archivos pueden ser importados a cualquier sistema compatible
2. Los archivos CSV pueden abrirse con Excel o Google Sheets
3. Para restaurar completamente, contacte al administrador del sistema
4. Mantenga este backup en un lugar seguro

## Notas Importantes

- Este backup NO incluye contraseñas de usuarios por seguridad
- Los archivos están en formato CSV para máxima compatibilidad
- La fecha y hora están en formato UTC
- Para restauración completa se requiere acceso administrativo

Generado automáticamente por el Sistema de Gestión de Gimnasio v1.0
    `.trim()

    zip.file("README.txt", readme)

    // Generar el archivo ZIP
    console.log("Generating ZIP file...")
    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    })

    // Crear nombre de archivo con timestamp
    const timestamp = new Date().toISOString().split("T")[0].replace(/-/g, "")
    const filename = `backup_completo_${timestamp}.zip`

    console.log(`Backup completed successfully. File: ${filename}`)

    // Registrar actividad de auditoría exitosa
    await logAuditEvent({
      user_id: user.userId,
      user_email: user.email,
      action_type: "CREATE",
      table_name: "backup",
      description: `Complete backup created: ${filename} (${members.length} members, ${payments.length} payments)`,
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
      user_agent: request.headers.get("user-agent") || "unknown",
    })

    // Retornar estadísticas y datos
    return NextResponse.json({
      success: true,
      filename,
      data: zipBuffer.toString("base64"),
      statistics: {
        total_members: members.length,
        total_payments: payments.length,
        total_memberships: memberships.length,
        total_attendance: attendance.length,
        total_users: users.length,
        total_audit_logs: auditLogs.length,
        backup_size_mb: Math.round((zipBuffer.length / 1024 / 1024) * 100) / 100,
        created_by: user.name,
        created_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Error creating backup:", error)

    // Registrar error en auditoría si tenemos usuario
    try {
      const session = await getSession()
      const user = session?.user
      if (user) {
        await logAuditEvent({
          user_id: user.userId,
          user_email: user.email,
          action_type: "CREATE",
          table_name: "backup",
          description: `Backup failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
          user_agent: request.headers.get("user-agent") || "unknown",
        })
      }
    } catch (auditError) {
      console.error("Error logging backup failure:", auditError)
    }

    return NextResponse.json(
      {
        error: "Error al crear backup completo",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
