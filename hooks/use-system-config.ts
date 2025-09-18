"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"

interface SystemConfig {
  id?: number
  grace_period_days: number
  auto_suspend_days: number
  auto_inactive_days: number
  enable_notifications: boolean
  enable_auto_reports: boolean
  allow_partial_payments: boolean
  require_member_photo: boolean
  theme_mode: "light" | "dark" | "system"
}

export function useSystemConfig() {
  const [config, setConfig] = useState<SystemConfig>({
    grace_period_days: 7,
    auto_suspend_days: 45,
    auto_inactive_days: 90,
    enable_notifications: true,
    enable_auto_reports: false,
    allow_partial_payments: false,
    require_member_photo: true,
    theme_mode: "system",
  })

  const [originalConfig, setOriginalConfig] = useState<SystemConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchConfig = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/config")
      if (res.ok) {
        const data = await res.json()
        setConfig(data)
        setOriginalConfig(data)
        toast.success("⚙️ Configuración cargada")
      } else {
        const errorData = await res.json()
        toast.error("❌ Error al cargar configuración", {
          description: errorData.error || "No se pudo cargar la configuración",
        })
      }
    } catch (error) {
      console.error("Error fetching system config:", error)
      toast.error("🚨 Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async (configToSave: SystemConfig) => {
    try {
      setSaving(true)
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configToSave),
      })

      if (res.ok) {
        const data = await res.json()
        setConfig(data)
        setOriginalConfig(data)
        toast.success("💾 Configuración guardada")
        return true
      } else {
        const errorData = await res.json()
        toast.error("❌ Error al guardar", {
          description: errorData.error || "No se pudo guardar la configuración",
        })
        return false
      }
    } catch (error) {
      console.error("Error saving system config:", error)
      toast.error("🚨 Error de conexión")
      return false
    } finally {
      setSaving(false)
    }
  }

  const updateConfig = (key: keyof SystemConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
    toast.success("⚙️ Configuración actualizada", {
      description: "Se guardará automáticamente en unos segundos...",
      duration: 2000,
    })
  }

  // Auto-save with debounce
  useEffect(() => {
    if (!originalConfig) return

    const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig)
    if (hasChanges) {
      const timeoutId = setTimeout(() => {
        saveConfig(config)
      }, 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [config, originalConfig])

  return {
    config,
    loading,
    saving,
    fetchConfig,
    saveConfig,
    updateConfig,
  }
}
