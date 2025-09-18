/**
 * Utilidades para manejo de backups del sistema
 */

export interface BackupMetadata {
  backup_date: string
  backup_by: string
  backup_by_email: string
  total_members: number
  total_payments: number
  total_memberships: number
  total_attendance_records: number
  total_users: number
  system_version: string
  database_schema_version: string
  notes: string
}

export interface BackupStatistics {
  total_members: number
  total_payments: number
  total_memberships: number
  total_attendance: number
  total_users: number
  total_audit_logs: number
  backup_size_mb: number
  created_by: string
  created_at: string
}

/**
 * Descarga un archivo desde datos base64
 */
export function downloadBackupFile(base64Data: string, filename: string): void {
  try {
    // Convertir base64 a blob
    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }

    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: "application/zip" })

    // Crear URL temporal y descargar
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()

    // Limpiar
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    console.log(`Backup downloaded successfully: ${filename}`)
  } catch (error) {
    console.error("Error downloading backup file:", error)
    throw new Error("Error al descargar el archivo de backup")
  }
}

/**
 * Formatea el tamaño del backup para mostrar
 */
export function formatBackupSize(sizeInMB: number): string {
  if (sizeInMB < 1) {
    return `${Math.round(sizeInMB * 1024)} KB`
  } else if (sizeInMB < 1024) {
    return `${sizeInMB.toFixed(1)} MB`
  } else {
    return `${(sizeInMB / 1024).toFixed(1)} GB`
  }
}

/**
 * Genera un resumen del backup para mostrar al usuario
 */
export function generateBackupSummary(stats: BackupStatistics): string {
  const items = []

  if (stats.total_members > 0) items.push(`${stats.total_members} socios`)
  if (stats.total_payments > 0) items.push(`${stats.total_payments} pagos`)
  if (stats.total_memberships > 0) items.push(`${stats.total_memberships} membresías`)
  if (stats.total_attendance > 0) items.push(`${stats.total_attendance} registros de asistencia`)
  if (stats.total_users > 0) items.push(`${stats.total_users} usuarios`)
  if (stats.total_audit_logs > 0) items.push(`${stats.total_audit_logs} logs de auditoría`)

  return items.join(", ")
}

/**
 * Valida si un backup es válido basado en sus estadísticas
 */
export function validateBackup(stats: BackupStatistics): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = []

  if (stats.total_members === 0) {
    warnings.push("No se encontraron socios en el backup")
  }

  if (stats.total_memberships === 0) {
    warnings.push("No se encontraron membresías en el backup")
  }

  if (stats.total_users === 0) {
    warnings.push("No se encontraron usuarios en el backup")
  }

  if (stats.backup_size_mb > 100) {
    warnings.push("El backup es muy grande (>100MB)")
  }

  if (stats.backup_size_mb < 0.01) {
    warnings.push("El backup parece estar vacío")
  }

  const isValid =
    warnings.length === 0 || (stats.total_members > 0 && stats.total_memberships > 0 && stats.total_users > 0)

  return { isValid, warnings }
}

/**
 * Genera nombre de archivo de backup con timestamp
 */
export function generateBackupFilename(prefix = "backup"): string {
  const now = new Date()
  const timestamp = now.toISOString().split("T")[0].replace(/-/g, "")
  const time = now.toTimeString().split(" ")[0].replace(/:/g, "")

  return `${prefix}_${timestamp}_${time}.zip`
}

/**
 * Estima el tiempo de descarga basado en el tamaño
 */
export function estimateDownloadTime(sizeInMB: number): string {
  // Asumiendo una velocidad promedio de 10 Mbps
  const speedMbps = 10
  const speedMBps = speedMbps / 8 // Convertir a MB/s
  const timeInSeconds = sizeInMB / speedMBps

  if (timeInSeconds < 1) {
    return "menos de 1 segundo"
  } else if (timeInSeconds < 60) {
    return `${Math.round(timeInSeconds)} segundos`
  } else {
    const minutes = Math.round(timeInSeconds / 60)
    return `${minutes} minuto${minutes > 1 ? "s" : ""}`
  }
}
