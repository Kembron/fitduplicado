/**
 * Utilidades ULTRA ROBUSTAS para manejo de fechas
 * Solución definitiva para problemas de zona horaria
 * VERSIÓN 4.0 - Consistencia total entre frontend y backend
 */

const URUGUAY_TIMEZONE = "America/Montevideo"

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD en zona horaria de Uruguay
 * MÉTODO MÁS ROBUSTO - Usa zona horaria específica
 */
export function getTodayLocalDate(): string {
  // Usar zona horaria de Uruguay específicamente
  const now = new Date()
  const uruguayTime = new Date(now.toLocaleString("en-US", { timeZone: URUGUAY_TIMEZONE }))

  const year = uruguayTime.getFullYear()
  const month = uruguayTime.getMonth() + 1
  const day = uruguayTime.getDate()

  const monthStr = month.toString().padStart(2, "0")
  const dayStr = day.toString().padStart(2, "0")

  const result = `${year}-${monthStr}-${dayStr}`

  console.log("🗓️ getTodayLocalDate() URUGUAY:", {
    utcNow: now.toISOString(),
    uruguayTime: uruguayTime.toString(),
    result,
    timezone: URUGUAY_TIMEZONE,
  })

  return result
}

/**
 * Función para obtener la fecha actual en Uruguay como objeto Date
 */
export function getUruguayDate(): Date {
  const now = new Date()
  return new Date(now.toLocaleString("en-US", { timeZone: URUGUAY_TIMEZONE }))
}

/**
 * Obtiene el primer día del mes actual en zona horaria de Uruguay
 */
export function getCurrentMonthStart(): string {
  const uruguayTime = getUruguayDate()
  const year = uruguayTime.getFullYear()
  const month = uruguayTime.getMonth() + 1

  const result = `${year}-${month.toString().padStart(2, "0")}-01`

  console.log("🗓️ getCurrentMonthStart() URUGUAY:", {
    uruguayTime: uruguayTime.toString(),
    result,
  })

  return result
}

/**
 * Obtiene el primer día del mes anterior en zona horaria de Uruguay
 */
export function getPreviousMonthStart(): string {
  const uruguayTime = getUruguayDate()

  // Ir al mes anterior
  uruguayTime.setMonth(uruguayTime.getMonth() - 1)

  const year = uruguayTime.getFullYear()
  const month = uruguayTime.getMonth() + 1

  const result = `${year}-${month.toString().padStart(2, "0")}-01`

  console.log("🗓️ getPreviousMonthStart() URUGUAY:", {
    result,
  })

  return result
}

/**
 * Obtiene el último día del mes anterior en zona horaria de Uruguay
 */
export function getPreviousMonthEnd(): string {
  const uruguayTime = getUruguayDate()

  // Ir al primer día del mes actual y restar un día
  uruguayTime.setDate(1)
  uruguayTime.setDate(uruguayTime.getDate() - 1)

  const year = uruguayTime.getFullYear()
  const month = uruguayTime.getMonth() + 1
  const day = uruguayTime.getDate()

  const result = `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`

  console.log("🗓️ getPreviousMonthEnd() URUGUAY:", {
    result,
  })

  return result
}

/**
 * NUEVA FUNCIÓN: Obtiene la fecha de hace 30 días desde hoy
 */
export function getLast30DaysStart(): string {
  const uruguayTime = getUruguayDate()

  // Restar 30 días
  uruguayTime.setDate(uruguayTime.getDate() - 30)

  const year = uruguayTime.getFullYear()
  const month = uruguayTime.getMonth() + 1
  const day = uruguayTime.getDate()

  const result = `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`

  console.log("🗓️ getLast30DaysStart() URUGUAY:", {
    result,
    daysAgo: 30,
  })

  return result
}

/**
 * NUEVA FUNCIÓN: Obtiene la fecha de hace 60 días desde hoy (para comparación)
 */
export function getLast60To30DaysStart(): string {
  const uruguayTime = getUruguayDate()

  // Restar 60 días
  uruguayTime.setDate(uruguayTime.getDate() - 60)

  const year = uruguayTime.getFullYear()
  const month = uruguayTime.getMonth() + 1
  const day = uruguayTime.getDate()

  const result = `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`

  console.log("🗓️ getLast60To30DaysStart() URUGUAY:", {
    result,
    daysAgo: 60,
  })

  return result
}

/**
 * NUEVA FUNCIÓN: Obtiene la fecha de hace 31 días (final del período anterior)
 */
export function getLast60To30DaysEnd(): string {
  const uruguayTime = getUruguayDate()

  // Restar 31 días
  uruguayTime.setDate(uruguayTime.getDate() - 31)

  const year = uruguayTime.getFullYear()
  const month = uruguayTime.getMonth() + 1
  const day = uruguayTime.getDate()

  const result = `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`

  console.log("🗓️ getLast60To30DaysEnd() URUGUAY:", {
    result,
    daysAgo: 31,
  })

  return result
}

/**
 * Obtiene el final del mes actual en Uruguay
 */
export function getCurrentMonthEnd(): string {
  const uruguayTime = getUruguayDate()
  const year = uruguayTime.getFullYear()
  const month = uruguayTime.getMonth() + 1
  const lastDay = new Date(year, month, 0).getDate()
  return `${year}-${month.toString().padStart(2, "0")}-${lastDay.toString().padStart(2, "0")}`
}

/**
 * Agrega días a la fecha actual de forma robusta
 */
export function addDaysToToday(days: number): string {
  const uruguayTime = getUruguayDate()
  uruguayTime.setDate(uruguayTime.getDate() + days)

  const year = uruguayTime.getFullYear()
  const month = uruguayTime.getMonth() + 1
  const day = uruguayTime.getDate()

  const monthStr = month.toString().padStart(2, "0")
  const dayStr = day.toString().padStart(2, "0")

  const result = `${year}-${monthStr}-${dayStr}`

  console.log("🗓️ addDaysToToday() URUGUAY:", {
    originalDate: new Date().toString(),
    uruguayTime: uruguayTime.toString(),
    daysToAdd: days,
    result,
  })

  return result
}

/**
 * Convierte cualquier fecha a formato local YYYY-MM-DD
 */
export function toLocalDateString(date: Date): string {
  const uruguayTime = new Date(date.toLocaleString("en-US", { timeZone: URUGUAY_TIMEZONE }))

  const year = uruguayTime.getFullYear()
  const month = (uruguayTime.getMonth() + 1).toString().padStart(2, "0")
  const day = uruguayTime.getDate().toString().padStart(2, "0")

  return `${year}-${month}-${day}`
}

/**
 * Formatea fecha para mostrar (DD/MM/YYYY) - VERSIÓN ULTRA ROBUSTA
 */
export function formatDateForDisplay(dateString: string): string {
  if (!dateString) return ""

  if (dateString.includes("/")) return dateString

  const [year, month, day] = dateString.split("-")

  if (!year || !month || !day) {
    console.warn("⚠️ Formato de fecha inválido:", dateString)
    return dateString
  }

  const yearNum = Number.parseInt(year, 10)
  const monthNum = Number.parseInt(month, 10)
  const dayNum = Number.parseInt(day, 10)

  if (isNaN(yearNum) || isNaN(monthNum) || isNaN(dayNum)) {
    console.warn("⚠️ Componentes de fecha inválidos:", { year, month, day })
    return dateString
  }

  const formattedDay = dayNum.toString().padStart(2, "0")
  const formattedMonth = monthNum.toString().padStart(2, "0")

  const result = `${formattedDay}/${formattedMonth}/${yearNum}`

  return result
}

/**
 * Formatea fecha con nombre del mes - VERSIÓN ROBUSTA
 */
export function formatDateWithMonth(dateString: string): string {
  if (!dateString) return ""

  const [year, month, day] = dateString.split("-")
  if (!year || !month || !day) return dateString

  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ]

  const yearNum = Number.parseInt(year, 10)
  const monthNum = Number.parseInt(month, 10)
  const dayNum = Number.parseInt(day, 10)

  if (isNaN(yearNum) || isNaN(monthNum) || isNaN(dayNum) || monthNum < 1 || monthNum > 12) {
    return dateString
  }

  const monthName = months[monthNum - 1]
  return `${dayNum} de ${monthName} de ${yearNum}`
}

/**
 * Función para formatear fecha en formato YYYY-MM-DD para base de datos
 */
export function formatDateForDB(date: Date): string {
  const uruguayDate = new Date(date.toLocaleString("en-US", { timeZone: URUGUAY_TIMEZONE }))
  const year = uruguayDate.getFullYear()
  const month = uruguayDate.getMonth() + 1
  const day = uruguayDate.getDate()
  return `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`
}

/**
 * Función para formatear fecha y hora para SQL (YYYY-MM-DD HH:MM:SS)
 */
export function formatDateTimeForSQL(dateString: string): string {
  if (!dateString) return ""

  // Si ya es una fecha completa con hora, devolverla tal como está
  if (dateString.includes(" ")) return dateString

  // Si es solo fecha (YYYY-MM-DD), agregar hora de inicio del día
  return `${dateString} 00:00:00`
}

/**
 * Función de debug mejorada para zona horaria de Uruguay
 */
export function debugDate(context: string): void {
  const now = new Date()
  const uruguayTime = getUruguayDate()
  const localDate = getTodayLocalDate()
  const utcDate = now.toISOString().split("T")[0]

  console.group(`🗓️ DEBUG FECHA URUGUAY: ${context}`)
  console.log("Fecha/Hora UTC:", now.toISOString())
  console.log("Fecha/Hora Uruguay:", uruguayTime.toString())
  console.log("Fecha local calculada:", localDate)
  console.log("Fecha UTC:", utcDate)
  console.log("Zona horaria:", URUGUAY_TIMEZONE)
  console.log("Offset UTC (minutos):", now.getTimezoneOffset())
  console.log("Diferencia:", localDate === utcDate ? "IGUALES" : "DIFERENTES")
  console.groupEnd()
}

/**
 * Función de debug específica para información de fechas
 */
export function debugDateInfo(): void {
  const now = new Date()
  const uruguayTime = getUruguayDate()
  const currentMonthStart = getCurrentMonthStart()
  const currentMonthEnd = getCurrentMonthEnd()
  const previousMonthStart = getPreviousMonthStart()
  const previousMonthEnd = getPreviousMonthEnd()

  console.group("🗓️ DEBUG DATE INFO - URUGUAY")
  console.log("Fecha/Hora actual UTC:", now.toISOString())
  console.log("Fecha/Hora actual Uruguay:", uruguayTime.toString())
  console.log("Inicio mes actual:", currentMonthStart)
  console.log("Final mes actual:", currentMonthEnd)
  console.log("Inicio mes anterior:", previousMonthStart)
  console.log("Final mes anterior:", previousMonthEnd)
  console.log("Zona horaria:", URUGUAY_TIMEZONE)
  console.groupEnd()
}

/**
 * Función para obtener información del mes actual en Uruguay
 */
export function getCurrentMonthInfo() {
  const uruguayTime = getUruguayDate()

  const year = uruguayTime.getFullYear()
  const month = uruguayTime.getMonth() + 1
  const day = uruguayTime.getDate()

  // Calcular días en el mes
  const daysInMonth = new Date(year, month, 0).getDate()
  const daysPassed = day

  const monthStart = `${year}-${month.toString().padStart(2, "0")}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const monthEnd = `${nextYear}-${nextMonth.toString().padStart(2, "0")}-01`

  return {
    currentDate: `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`,
    monthStart,
    monthEnd,
    year,
    month,
    day,
    daysInMonth,
    daysPassed,
    uruguayTime: uruguayTime.toString(),
  }
}

/**
 * Función para obtener el rango de fechas del mes actual
 */
export function getCurrentMonthRange(): { start: string; end: string } {
  return {
    start: getCurrentMonthStart(),
    end: getCurrentMonthEnd(),
  }
}

/**
 * Función para obtener el rango de fechas del mes anterior
 */
export function getPreviousMonthRange(): { start: string; end: string } {
  return {
    start: getPreviousMonthStart(),
    end: getPreviousMonthEnd(),
  }
}

/**
 * NUEVA FUNCIÓN: Obtiene el rango de los últimos 30 días
 */
export function getLast30DaysRange(): { start: string; end: string } {
  return {
    start: getLast30DaysStart(),
    end: getTodayLocalDate(),
  }
}

/**
 * NUEVA FUNCIÓN: Obtiene el rango de los 30 días anteriores (para comparación)
 */
export function getPrevious30DaysRange(): { start: string; end: string } {
  return {
    start: getLast60To30DaysStart(),
    end: getLast60To30DaysEnd(),
  }
}

/**
 * Función para verificar si una fecha está en el mes actual
 */
export function isCurrentMonth(dateString: string): boolean {
  const date = new Date(dateString)
  const uruguayDate = getUruguayDate()
  return date.getFullYear() === uruguayDate.getFullYear() && date.getMonth() === uruguayDate.getMonth()
}

/**
 * Función para obtener el nombre del mes actual en español
 */
export function getCurrentMonthName(): string {
  const uruguayDate = getUruguayDate()
  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ]
  return monthNames[uruguayDate.getMonth()]
}

/**
 * Función para obtener estadísticas de progreso del mes
 */
export function getMonthProgress(): { percentage: number; daysElapsed: number; totalDays: number } {
  const uruguayDate = getUruguayDate()
  const year = uruguayDate.getFullYear()
  const month = uruguayDate.getMonth() + 1
  const currentDay = uruguayDate.getDate()
  const totalDays = new Date(year, month, 0).getDate()
  const percentage = Math.round((currentDay / totalDays) * 100)

  return {
    percentage,
    daysElapsed: currentDay,
    totalDays,
  }
}

// Exportar todo como default también para compatibilidad
export default {
  getTodayLocalDate,
  getUruguayDate,
  getCurrentMonthStart,
  getPreviousMonthStart,
  getPreviousMonthEnd,
  getLast30DaysStart,
  getLast60To30DaysStart,
  getLast60To30DaysEnd,
  getCurrentMonthEnd,
  addDaysToToday,
  toLocalDateString,
  formatDateForDisplay,
  formatDateWithMonth,
  formatDateForDB,
  formatDateTimeForSQL,
  debugDate,
  debugDateInfo,
  getCurrentMonthInfo,
  getCurrentMonthRange,
  getPreviousMonthRange,
  getLast30DaysRange,
  getPrevious30DaysRange,
  isCurrentMonth,
  getCurrentMonthName,
  getMonthProgress,
}
