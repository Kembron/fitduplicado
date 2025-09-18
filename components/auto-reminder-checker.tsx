"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

interface ReminderStatus {
  success: boolean
  sent: boolean
  count: number
  message: string
  timestamp: string
  details?: any
}

interface SystemStats {
  todaysSent: number
  blacklistedEmails: number
  pendingReminders: number
  isConfigured: boolean
}

export default function AutoReminderChecker() {
  const [status, setStatus] = useState<ReminderStatus | null>(null)
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [nextCheck, setNextCheck] = useState<Date | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Configuración del sistema
  const CHECK_INTERVAL = 3 * 60 * 60 * 1000 // 3 horas en milisegundos
  const INITIAL_DELAY = 5 * 1000 // 5 segundos después de cargar la app

  // Inicializar el sistema automático al cargar la app
  useEffect(() => {
    console.log("🚀 AutoReminderChecker: Inicializando sistema automático de recordatorios...")
    console.log(`⏰ Configuración: Primera ejecución en 5 segundos, luego cada 3 horas`)

    // Ejecutar primera verificación después de 5 segundos
    const initialTimeout = setTimeout(() => {
      console.log("🎯 Ejecutando primera verificación automática...")
      checkReminders(true)
      setIsInitialized(true)
    }, INITIAL_DELAY)

    // Configurar verificaciones cada 3 horas
    const interval = setInterval(() => {
      console.log("🔄 Ejecutando verificación periódica (cada 3 horas)...")
      checkReminders(false)
    }, CHECK_INTERVAL)

    // Calcular próxima verificación
    const nextCheckTime = new Date(Date.now() + INITIAL_DELAY)
    setNextCheck(nextCheckTime)

    // Cleanup
    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [])

  // Actualizar próxima verificación después de cada check
  useEffect(() => {
    if (lastCheck && isInitialized) {
      const nextCheckTime = new Date(lastCheck.getTime() + CHECK_INTERVAL)
      setNextCheck(nextCheckTime)
    }
  }, [lastCheck, isInitialized])

  const checkReminders = async (isInitialLoad = false) => {
    try {
      setLoading(true)

      const checkType = isInitialLoad ? "inicial" : "periódica"
      console.log(`🔍 Verificación ${checkType}: Iniciando proceso de recordatorios...`)

      // Obtener estadísticas primero
      await updateStats()

      // Ejecutar verificación de recordatorios
      const response = await fetch("/api/check-reminders", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const data = await response.json()
      setStatus(data)
      setLastCheck(new Date())

      // Mostrar notificaciones según el resultado
      if (data.success) {
        if (data.sent && data.count > 0) {
          toast.success("📧 Recordatorios enviados automáticamente", {
            description: `Se enviaron ${data.count} recordatorios de vencimiento`,
            duration: 8000,
          })
          console.log(`✅ ${data.count} recordatorios enviados exitosamente`)

          // Log detallado de los envíos
          if (data.details?.batchDetails) {
            data.details.batchDetails.forEach((detail: any) => {
              if (detail.status === "success") {
                console.log(`  📧 Enviado a: ${detail.memberName} (${detail.email})`)
              }
            })
          }
        } else {
          const reason = data.message.includes("No hay socios") ? "No hay membresías próximas a vencer" : data.message

          if (isInitialLoad) {
            toast.info("ℹ️ Sistema de recordatorios activo", {
              description: reason,
              duration: 4000,
            })
          }
          console.log(`ℹ️ ${reason}`)
        }
      } else {
        console.error("❌ Error en verificación de recordatorios:", data.message)

        if (isInitialLoad) {
          toast.error("⚠️ Error en sistema de recordatorios", {
            description: data.message,
            duration: 6000,
          })
        } else {
          // Para errores periódicos, solo log sin toast para no molestar
          console.error("❌ Error en verificación periódica:", data.message)
        }
      }

      // Log del estado completo
      console.log("📊 Estado actual del sistema:", {
        success: data.success,
        sent: data.sent,
        count: data.count,
        message: data.message,
        timestamp: data.timestamp,
        nextCheck: nextCheck?.toLocaleString("es-UY"),
      })

      // Actualizar estadísticas después del envío
      await updateStats()
    } catch (error) {
      console.error("❌ Error verificando recordatorios:", error)

      if (isInitialLoad) {
        toast.error("❌ Error de conexión", {
          description: "No se pudo conectar con el sistema de recordatorios",
          duration: 6000,
        })
      }

      setStatus({
        success: false,
        sent: false,
        count: 0,
        message: "Error de conexión",
        timestamp: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }

  // Actualizar estadísticas del sistema
  const updateStats = async () => {
    try {
      const response = await fetch("/api/reminder-stats")
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)

        console.log("📈 Estadísticas actualizadas:", {
          enviados_hoy: data.stats.todaysSent,
          en_blacklist: data.stats.blacklistedEmails,
          pendientes: data.stats.pendingReminders,
          configurado: data.stats.isConfigured,
        })
      }
    } catch (error) {
      console.error("Error actualizando estadísticas:", error)
    }
  }

  // Log de estado del sistema cada minuto (solo en desarrollo)
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      const statusInterval = setInterval(() => {
        if (isInitialized && nextCheck) {
          const timeUntilNext = nextCheck.getTime() - Date.now()
          const minutesUntilNext = Math.floor(timeUntilNext / (1000 * 60))

          console.log(
            `⏰ Sistema activo - Próxima verificación en ${minutesUntilNext} minutos (${nextCheck.toLocaleTimeString("es-UY")})`,
          )

          if (stats) {
            console.log(
              `📊 Estado: ${stats.todaysSent} enviados hoy, ${stats.pendingReminders} pendientes, ${stats.blacklistedEmails} en blacklist`,
            )
          }
        }
      }, 60000) // Cada minuto

      return () => clearInterval(statusInterval)
    }
  }, [isInitialized, nextCheck, stats])

  // El componente funciona completamente en segundo plano sin UI
  return null
}

// Hook para acceder al estado del sistema desde otros componentes
export function useReminderSystem() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [status, setStatus] = useState<ReminderStatus | null>(null)
  const [loading, setLoading] = useState(false)

  const updateStats = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/reminder-stats")
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Error actualizando estadísticas:", error)
    } finally {
      setLoading(false)
    }
  }

  const manualCheck = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/check-reminders")
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
        await updateStats()
        return data
      }
    } catch (error) {
      console.error("Error en verificación manual:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  return {
    stats,
    status,
    loading,
    updateStats,
    manualCheck,
  }
}
