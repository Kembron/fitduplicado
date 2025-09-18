"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  Settings,
  CreditCard,
  Users,
  FileText,
  Database,
  Plus,
  Edit,
  Trash2,
  Save,
  Clock,
  Shield,
  Calendar,
  DollarSign,
  Loader2,
  MoreHorizontal,
  Copy,
  Download,
  Search,
  SortAsc,
  SortDesc,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Zap,
  Target,
  TrendingUp,
  Award,
  Star,
  Heart,
  Rocket,
  Crown,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react"
import { toast } from "sonner"
import { useTheme } from "next-themes"
import UserManagement from "@/components/user-management"
import { generateExcelFile, generateExportStats } from "@/lib/excel-utils"
import MigrationModal from "@/components/migration-modal"

interface Membership {
  id: number
  name: string
  description: string
  price: number
  duration_days: number
  is_active: boolean
  members_count?: number
}

interface ConfigurationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface MembershipFormData {
  name: string
  description: string
  price: number
  duration_days: number
}

interface SystemConfig {
  id?: number
  grace_period_days: number
  auto_suspend_days: number
  auto_inactive_days: number
  enable_notifications: boolean
  enable_auto_reports: boolean
  allow_partial_payments: boolean
  require_member_photo: boolean
}

const MEMBERSHIP_TEMPLATES = [
  { name: "Diario", price: 500, duration_days: 1, description: "Acceso por un día", icon: "⚡" },
  { name: "Semanal", price: 2500, duration_days: 7, description: "Acceso por una semana", icon: "🔥" },
  { name: "Mensual Básico", price: 8000, duration_days: 30, description: "Acceso mensual básico", icon: "💪" },
  {
    name: "Mensual Premium",
    price: 12000,
    duration_days: 30,
    description: "Acceso mensual con beneficios",
    icon: "⭐",
  },
  { name: "Trimestral", price: 20000, duration_days: 90, description: "Acceso por tres meses", icon: "🚀" },
  { name: "Anual", price: 80000, duration_days: 365, description: "Acceso anual con descuento", icon: "👑" },
]

const SUCCESS_MESSAGES = [
  "¡Excelente trabajo! 🎉",
  "¡Perfecto! ✨",
  "¡Genial! 🚀",
  "¡Fantástico! ⭐",
  "¡Increíble! 💪",
  "¡Bien hecho! 🎯",
]

const getRandomSuccessMessage = () => SUCCESS_MESSAGES[Math.floor(Math.random() * SUCCESS_MESSAGES.length)]

export default function ConfigurationModal({ open, onOpenChange }: ConfigurationModalProps) {
  const { theme, setTheme } = useTheme()
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [loading, setLoading] = useState(false)
  const [editingMembership, setEditingMembership] = useState<Membership | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all")
  const [sortBy, setSortBy] = useState<"name" | "price" | "duration" | "created">("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [selectedMemberships, setSelectedMemberships] = useState<number[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [actionProgress, setActionProgress] = useState(0)
  const [currentAction, setCurrentAction] = useState("")
  const [configLoading, setConfigLoading] = useState(false)
  const [configSaving, setConfigSaving] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [expandedMembership, setExpandedMembership] = useState<number | null>(null)

  // Referencias para cleanup
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const configTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const activeToastsRef = useRef<Set<string | number>>(new Set())
  const isMountedRef = useRef(true)

  const [newMembership, setNewMembership] = useState<MembershipFormData>({
    name: "",
    description: "",
    price: 0,
    duration_days: 30,
  })

  const [formErrors, setFormErrors] = useState<Partial<MembershipFormData>>({})

  // Estados para configuraciones del sistema
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    grace_period_days: 7,
    auto_suspend_days: 45,
    auto_inactive_days: 90,
    enable_notifications: true,
    enable_auto_reports: false,
    allow_partial_payments: false,
    require_member_photo: true,
  })

  const [originalSystemConfig, setOriginalSystemConfig] = useState<SystemConfig | null>(null)

  // Función mejorada para limpiar notificaciones y estados
  const cleanupNotificationsAndStates = useCallback(() => {
    // Limpiar intervalos activos
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }

    // Limpiar timeouts activos
    if (configTimeoutRef.current) {
      clearTimeout(configTimeoutRef.current)
      configTimeoutRef.current = null
    }

    // Resetear estados de loading y progress
    setLoading(false)
    setConfigLoading(false)
    setConfigSaving(false)
    setActionProgress(0)
    setCurrentAction("")

    // Limpiar todas las notificaciones activas
    activeToastsRef.current.forEach((toastId) => {
      try {
        toast.dismiss(toastId)
      } catch (error) {
        // Ignorar errores de dismiss
      }
    })
    activeToastsRef.current.clear()

    // Limpiar cualquier notificación pendiente con un pequeño delay
    setTimeout(() => {
      if (isMountedRef.current) {
        toast.dismiss()
      }
    }, 100)
  }, [])

  // Función mejorada para mostrar progress con cleanup automático
  const showProgressAction = useCallback((action: string, duration = 2000) => {
    if (!isMountedRef.current) return

    // Limpiar progress anterior si existe
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }

    setCurrentAction(action)
    setActionProgress(0)

    progressIntervalRef.current = setInterval(() => {
      if (!isMountedRef.current) {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
          progressIntervalRef.current = null
        }
        return
      }

      setActionProgress((prev) => {
        if (prev >= 100) {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current)
            progressIntervalRef.current = null
          }
          setTimeout(() => {
            if (isMountedRef.current) {
              setCurrentAction("")
              setActionProgress(0)
            }
          }, 500)
          return 100
        }
        return prev + 5
      })
    }, duration / 20)
  }, [])

  // Función mejorada para mostrar toasts con tracking
  const showToast = useCallback((type: "success" | "error" | "loading" | "info", title: string, options?: any) => {
    if (!isMountedRef.current) return

    let toastId: string | number

    switch (type) {
      case "success":
        toastId = toast.success(title, options)
        break
      case "error":
        toastId = toast.error(title, options)
        break
      case "loading":
        toastId = toast.loading(title, options)
        break
      case "info":
        toastId = toast.info(title, options)
        break
      default:
        toastId = toast(title, options)
    }

    if (toastId) {
      activeToastsRef.current.add(toastId)

      // Auto-remove from tracking after duration
      const duration = options?.duration || 4000
      setTimeout(() => {
        activeToastsRef.current.delete(toastId)
      }, duration + 1000)
    }

    return toastId
  }, [])

  // Cargar configuración del sistema
  const fetchSystemConfig = async () => {
    if (!isMountedRef.current) return

    try {
      setConfigLoading(true)
      const res = await fetch("/api/config")

      if (!isMountedRef.current) return

      if (res.ok) {
        const data = await res.json()
        setSystemConfig(data)
        setOriginalSystemConfig(data)
        showToast("success", "⚙️ Configuración cargada", {
          description: "Configuraciones del sistema actualizadas",
          duration: 2000,
        })
      } else {
        const errorData = await res.json()
        showToast("error", "❌ Error al cargar configuración", {
          description: errorData.error || "No se pudo cargar la configuración",
          duration: 4000,
        })
      }
    } catch (error) {
      if (!isMountedRef.current) return
      console.error("Error fetching system config:", error)
      showToast("error", "🚨 Error de conexión", {
        description: "No se pudo conectar con el servidor",
        duration: 5000,
      })
    } finally {
      if (isMountedRef.current) {
        setConfigLoading(false)
      }
    }
  }

  // Guardar configuración del sistema
  const saveSystemConfig = async (config: SystemConfig) => {
    if (!isMountedRef.current) return

    try {
      setConfigSaving(true)

      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })

      if (!isMountedRef.current) return

      if (res.ok) {
        const data = await res.json()
        setSystemConfig(data)
        setOriginalSystemConfig(data)

        showToast("success", "💾 Configuración guardada", {
          description: "Todos los cambios se han guardado correctamente",
          duration: 3000,
        })
      } else {
        const errorData = await res.json()
        showToast("error", "❌ Error al guardar", {
          description: errorData.error || "No se pudo guardar la configuración",
          duration: 4000,
        })
      }
    } catch (error) {
      if (!isMountedRef.current) return
      console.error("Error saving system config:", error)
      showToast("error", "🚨 Error de conexión", {
        description: "No se pudo guardar la configuración",
        duration: 5000,
      })
    } finally {
      if (isMountedRef.current) {
        setConfigSaving(false)
      }
    }
  }

  // Auto-guardar configuraciones del sistema con debounce mejorado
  useEffect(() => {
    if (!originalSystemConfig || !isMountedRef.current) return

    const hasChanges = JSON.stringify(systemConfig) !== JSON.stringify(originalSystemConfig)

    if (hasChanges) {
      // Limpiar timeout anterior
      if (configTimeoutRef.current) {
        clearTimeout(configTimeoutRef.current)
      }

      configTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          saveSystemConfig(systemConfig)
        }
      }, 1000)

      return () => {
        if (configTimeoutRef.current) {
          clearTimeout(configTimeoutRef.current)
          configTimeoutRef.current = null
        }
      }
    }
  }, [systemConfig, originalSystemConfig])

  const handleSystemConfigChange = (key: keyof SystemConfig, value: any) => {
    if (!isMountedRef.current) return

    setSystemConfig((prev) => ({ ...prev, [key]: value }))

    showToast("success", "⚙️ Configuración actualizada", {
      description: "Se guardará automáticamente en unos segundos...",
      duration: 2000,
    })
  }

  const fetchMemberships = async () => {
    if (!isMountedRef.current) return

    try {
      setLoading(true)
      showProgressAction("🔄 Cargando membresías...")

      const res = await fetch("/api/memberships")

      if (!isMountedRef.current) return

      if (res.ok) {
        const data = await res.json()
        setMemberships(data)
        showToast("success", `✅ ${data.length} membresías cargadas correctamente`, {
          description: "Datos actualizados desde la base de datos",
          duration: 3000,
        })
      } else {
        const errorData = await res.json()
        showToast("error", "❌ Error al cargar las membresías", {
          description: errorData.error || "Problema de conexión con el servidor",
          duration: 4000,
        })
      }
    } catch (error) {
      if (!isMountedRef.current) return
      console.error("Error fetching memberships:", error)
      showToast("error", "🚨 Error de conexión", {
        description: "No se pudo conectar con el servidor. Verifica tu conexión.",
        duration: 5000,
      })
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }

  // Effect para manejar apertura/cierre del modal
  useEffect(() => {
    isMountedRef.current = true

    if (open) {
      // Limpiar estado anterior al abrir
      cleanupNotificationsAndStates()

      // Cargar datos
      fetchMemberships()
      fetchSystemConfig()

      showToast("success", "🎛️ Panel de configuración abierto", {
        description: "Bienvenido al centro de control del gimnasio",
        duration: 2000,
      })
    } else {
      // Limpiar todo al cerrar
      cleanupNotificationsAndStates()
    }

    return () => {
      // Cleanup al desmontar
      isMountedRef.current = false
      cleanupNotificationsAndStates()
    }
  }, [open, cleanupNotificationsAndStates, showToast])

  // Cleanup al desmontar el componente
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      cleanupNotificationsAndStates()
    }
  }, [cleanupNotificationsAndStates])

  const validateForm = (data: MembershipFormData): boolean => {
    const errors: Partial<MembershipFormData> = {}

    if (!data.name?.trim()) {
      errors.name = "El nombre es obligatorio"
    } else if (data.name.trim().length < 2) {
      errors.name = "El nombre debe tener al menos 2 caracteres"
    } else if (data.name.trim().length > 50) {
      errors.name = "El nombre no puede tener más de 50 caracteres"
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\d]+$/.test(data.name.trim())) {
      errors.name = "El nombre contiene caracteres inválidos"
    }

    if (!data.price || data.price <= 0) {
      errors.price = "El precio debe ser mayor a 0"
    } else if (data.price > 1000000) {
      errors.price = "El precio no puede ser mayor a $1,000,000"
    } else if (!Number.isFinite(data.price)) {
      errors.price = "El precio debe ser un número válido"
    }

    if (!data.duration_days || data.duration_days <= 0) {
      errors.duration_days = "La duración debe ser mayor a 0 días"
    } else if (data.duration_days > 3650) {
      errors.duration_days = "La duración no puede ser mayor a 10 años"
    } else if (!Number.isInteger(data.duration_days)) {
      errors.duration_days = "La duración debe ser un número entero"
    }

    if (data.description && data.description.length > 500) {
      errors.description = "La descripción no puede tener más de 500 caracteres"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreateMembership = async () => {
    if (!validateForm(newMembership)) {
      showToast("error", "⚠️ Formulario incompleto", {
        description: "Por favor corrige los errores marcados en rojo",
        duration: 4000,
      })
      return
    }

    if (memberships.some((m) => m.name.toLowerCase() === newMembership.name.toLowerCase().trim())) {
      showToast("error", "❌ Nombre duplicado", {
        description: "Ya existe una membresía con este nombre",
        duration: 4000,
      })
      return
    }

    if (!isMountedRef.current) return

    try {
      setLoading(true)
      showProgressAction("✨ Creando nueva membresía...")

      showToast("loading", "🔄 Procesando nueva membresía...", {
        description: `Creando "${newMembership.name}" por $${newMembership.price.toLocaleString()}`,
        duration: 2000,
      })

      const sanitizedData = {
        name: newMembership.name.trim(),
        description: newMembership.description.trim(),
        price: Math.round(newMembership.price * 100) / 100,
        duration_days: Math.floor(newMembership.duration_days),
      }

      const res = await fetch("/api/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sanitizedData),
      })

      if (!isMountedRef.current) return

      const data = await res.json()

      if (res.ok) {
        const successMsg = getRandomSuccessMessage()
        showToast("success", `${successMsg} Membresía creada`, {
          description: `"${sanitizedData.name}" está lista para usar. Precio: $${sanitizedData.price.toLocaleString()}`,
          duration: 5000,
          action: {
            label: "Ver lista",
            onClick: () => console.log("Scrolling to list"),
          },
        })

        setNewMembership({ name: "", description: "", price: 0, duration_days: 30 })
        setFormErrors({})
        fetchMemberships()

        setTimeout(() => {
          if (isMountedRef.current) {
            showToast("success", "🎊 ¡Nueva membresía disponible!", {
              description: "Los socios ya pueden suscribirse a esta membresía",
              duration: 3000,
            })
          }
        }, 1000)
      } else {
        if (res.status === 409) {
          showToast("error", "❌ Conflicto de datos", {
            description: data.error || "Ya existe una membresía similar",
            duration: 4000,
          })
        } else if (res.status === 400) {
          showToast("error", "❌ Datos inválidos", {
            description: data.error || "Verifica los datos ingresados",
            duration: 4000,
          })
        } else {
          showToast("error", "❌ Error al crear membresía", {
            description: data.error || "Hubo un problema al guardar en la base de datos",
            duration: 4000,
          })
        }
      }
    } catch (error) {
      if (!isMountedRef.current) return
      console.error("Error creating membership:", error)

      if (error.name === "TypeError" && error.message.includes("fetch")) {
        showToast("error", "🌐 Error de conexión", {
          description: "No se pudo conectar con el servidor. Verifica tu conexión a internet.",
          duration: 5000,
        })
      } else {
        showToast("error", "🚨 Error inesperado", {
          description: "Ocurrió un error inesperado. Intenta nuevamente.",
          duration: 5000,
        })
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }

  const handleUpdateMembership = async (membership: Membership) => {
    if (!isMountedRef.current) return

    try {
      showProgressAction("💾 Guardando cambios...")

      showToast("loading", "🔄 Actualizando membresía...", {
        description: `Guardando cambios en "${membership.name}"`,
        duration: 2000,
      })

      const res = await fetch(`/api/memberships/${membership.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: membership.name,
          description: membership.description,
          price: membership.price,
          duration_days: membership.duration_days,
          is_active: membership.is_active,
        }),
      })

      if (!isMountedRef.current) return

      const data = await res.json()

      if (res.ok) {
        const successMsg = getRandomSuccessMessage()
        showToast("success", `${successMsg} Cambios guardados`, {
          description: `"${membership.name}" actualizada correctamente`,
          duration: 4000,
        })

        setEditingMembership(null)
        setFormErrors({})
        setMemberships((prev) => prev.map((m) => (m.id === membership.id ? data : m)))

        setTimeout(() => {
          if (isMountedRef.current) {
            showToast("success", "✅ Sincronización completa", {
              description: "Los cambios ya están disponibles para todos los usuarios",
              duration: 2000,
            })
          }
        }, 1500)
      } else {
        console.error("API Error:", data)
        showToast("error", "❌ Error al actualizar", {
          description: data.error || "No se pudieron guardar los cambios",
          duration: 4000,
        })
      }
    } catch (error) {
      if (!isMountedRef.current) return
      console.error("Error updating membership:", error)
      showToast("error", "🚨 Error de conexión", {
        description: "No se pudo actualizar la membresía. Verifica tu conexión.",
        duration: 5000,
      })
    }
  }

  const handleDeleteMembership = async (id: number, membershipName: string) => {
    if (!isMountedRef.current) return

    try {
      showProgressAction("🗑️ Eliminando membresía...")

      showToast("loading", "⚠️ Eliminando membresía...", {
        description: `Removiendo "${membershipName}" del sistema`,
        duration: 2000,
      })

      const res = await fetch(`/api/memberships/${id}`, {
        method: "DELETE",
      })

      if (!isMountedRef.current) return

      const data = await res.json()

      if (res.ok) {
        showToast("success", "🗑️ Membresía eliminada exitosamente", {
          description: `"${membershipName}" ha sido removida permanentemente`,
          duration: 4000,
        })

        setMemberships((prev) => prev.filter((m) => m.id !== id))

        setTimeout(() => {
          if (isMountedRef.current) {
            showToast("success", "🧹 Limpieza completada", {
              description: "El sistema ha sido actualizado correctamente",
              duration: 2000,
            })
          }
        }, 1500)
      } else {
        showToast("error", "❌ No se pudo eliminar", {
          description: data.error || "La membresía no pudo ser eliminada",
          duration: 4000,
        })
      }
    } catch (error) {
      if (!isMountedRef.current) return
      console.error("Error deleting membership:", error)
      showToast("error", "🚨 Error al eliminar", {
        description: "Hubo un problema de conexión. Intenta nuevamente.",
        duration: 5000,
      })
    }
  }

  const handleDuplicateMembership = async (membership: Membership) => {
    const duplicatedMembership = {
      name: `${membership.name} (Copia)`,
      description: membership.description,
      price: membership.price,
      duration_days: membership.duration_days,
    }

    if (!isMountedRef.current) return

    try {
      showProgressAction("📋 Duplicando membresía...")

      showToast("loading", "📋 Creando copia...", {
        description: `Duplicando "${membership.name}"`,
        duration: 2000,
      })

      const res = await fetch("/api/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(duplicatedMembership),
      })

      if (!isMountedRef.current) return

      const data = await res.json()

      if (res.ok) {
        const successMsg = getRandomSuccessMessage()
        showToast("success", `${successMsg} Membresía duplicada`, {
          description: `Copia de "${membership.name}" creada exitosamente`,
          duration: 4000,
        })

        fetchMemberships()

        setTimeout(() => {
          if (isMountedRef.current) {
            showToast("success", "🎯 Lista actualizada", {
              description: "La nueva membresía ya está disponible",
              duration: 2000,
            })
          }
        }, 1500)
      } else {
        showToast("error", "❌ Error al duplicar", {
          description: data.error || "No se pudo crear la copia",
          duration: 4000,
        })
      }
    } catch (error) {
      if (!isMountedRef.current) return
      console.error("Error duplicating membership:", error)
      showToast("error", "🚨 Error de duplicación", {
        description: "No se pudo duplicar la membresía",
        duration: 5000,
      })
    }
  }

  const handleToggleMembershipStatus = async (membership: Membership) => {
    const newStatus = !membership.is_active
    const statusText = newStatus ? "activada" : "desactivada"
    const statusIcon = newStatus ? "✅" : "⏸️"

    setMemberships((prev) => prev.map((m) => (m.id === membership.id ? { ...m, is_active: newStatus } : m)))

    if (!isMountedRef.current) return

    try {
      showProgressAction(`${statusIcon} ${newStatus ? "Activando" : "Desactivando"} membresía...`)

      showToast("loading", `🔄 ${newStatus ? "Activando" : "Desactivando"}...`, {
        description: `Cambiando estado de "${membership.name}"`,
        duration: 1500,
      })

      const res = await fetch(`/api/memberships/${membership.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: newStatus }),
      })

      if (!isMountedRef.current) return

      const data = await res.json()

      if (res.ok) {
        const successMsg = getRandomSuccessMessage()
        showToast("success", `${successMsg} Membresía ${statusText}`, {
          description: `"${membership.name}" ahora está ${statusText}`,
          duration: 3000,
        })

        setMemberships((prev) => prev.map((m) => (m.id === membership.id ? data : m)))

        setTimeout(() => {
          if (isMountedRef.current) {
            if (newStatus) {
              showToast("success", "🚀 Membresía disponible", {
                description: "Los socios ya pueden suscribirse",
                duration: 2000,
              })
            } else {
              showToast("success", "⏸️ Membresía pausada", {
                description: "No aparecerá en nuevas suscripciones",
                duration: 2000,
              })
            }
          }
        }, 1000)
      } else {
        showToast("error", `❌ Error al ${newStatus ? "activar" : "desactivar"}`, {
          description: data.error || "No se pudo cambiar el estado",
          duration: 4000,
        })
        setMemberships((prev) => prev.map((m) => (m.id === membership.id ? membership : m)))
      }
    } catch (error) {
      if (!isMountedRef.current) return
      console.error("Error updating membership:", error)
      showToast("error", "🚨 Error de conexión", {
        description: "No se pudo cambiar el estado. Verifica tu conexión.",
        duration: 5000,
      })
      setMemberships((prev) => prev.map((m) => (m.id === membership.id ? membership : m)))
    }
  }

  const handleBulkStatusChange = async (status: boolean) => {
    if (selectedMemberships.length === 0) {
      showToast("error", "⚠️ Selección vacía", {
        description: "Selecciona al menos una membresía para continuar",
        duration: 3000,
      })
      return
    }

    const statusText = status ? "activar" : "desactivar"
    const statusIcon = status ? "✅" : "⏸️"

    if (!isMountedRef.current) return

    try {
      setLoading(true)
      showProgressAction(`${statusIcon} Procesando ${selectedMemberships.length} membresías...`)

      showToast("loading", `🔄 ${status ? "Activando" : "Desactivando"} en lote...`, {
        description: `Procesando ${selectedMemberships.length} membresías`,
        duration: 3000,
      })

      const promises = selectedMemberships.map(async (id) => {
        const membership = memberships.find((m) => m.id === id)
        if (membership) {
          const res = await fetch(`/api/memberships/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...membership, is_active: status }),
          })
          return res
        }
        return Promise.resolve()
      })

      await Promise.all(promises)

      if (!isMountedRef.current) return

      const successMsg = getRandomSuccessMessage()
      showToast("success", `${successMsg} Operación completada`, {
        description: `${selectedMemberships.length} membresías ${status ? "activadas" : "desactivadas"} exitosamente`,
        duration: 4000,
      })

      setSelectedMemberships([])
      fetchMemberships()

      setTimeout(() => {
        if (isMountedRef.current) {
          showToast("success", "🎯 Cambios aplicados", {
            description: "Todas las membresías han sido actualizadas",
            duration: 2000,
          })
        }
      }, 1500)
    } catch (error) {
      if (!isMountedRef.current) return
      showToast("error", "❌ Error en operación masiva", {
        description: "Algunas membresías no pudieron ser actualizadas",
        duration: 5000,
      })
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }

  const handleUseTemplate = (template: (typeof MEMBERSHIP_TEMPLATES)[0]) => {
    setNewMembership({
      name: template.name,
      description: template.description,
      price: template.price,
      duration_days: template.duration_days,
    })
    setShowTemplates(false)

    showToast("success", `${template.icon} Plantilla aplicada`, {
      description: `"${template.name}" cargada con precio $${template.price.toLocaleString()}`,
      duration: 3000,
    })
  }

  const exportMemberships = () => {
    showProgressAction("📊 Generando reporte...")

    showToast("loading", "📊 Preparando exportación...", {
      description: "Generando archivo CSV con todas las membresías",
      duration: 2000,
    })

    const csvContent = [
      ["Nombre", "Descripción", "Precio", "Duración (días)", "Estado"],
      ...filteredAndSortedMemberships.map((m) => [
        m.name,
        m.description,
        m.price.toString(),
        m.duration_days.toString(),
        m.is_active ? "Activa" : "Inactiva",
      ]),
    ]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `memberships-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    showToast("success", "📁 Archivo descargado", {
      description: `${filteredAndSortedMemberships.length} membresías exportadas exitosamente`,
      duration: 4000,
    })

    setTimeout(() => {
      if (isMountedRef.current) {
        showToast("success", "💾 Exportación completa", {
          description: "El archivo CSV está listo en tu carpeta de descargas",
          duration: 3000,
        })
      }
    }, 1000)
  }

  const exportMembers = async () => {
    if (!isMountedRef.current) return

    try {
      setLoading(true)
      showProgressAction("📊 Exportando socios...")

      showToast("loading", "📊 Preparando exportación de socios...", {
        description: "Obteniendo datos de la base de datos...",
        duration: 2000,
      })

      const res = await fetch("/api/export/members")

      if (!isMountedRef.current) return

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Error al exportar socios")
      }

      const result = await res.json()
      generateExcelFile(result.data, result.filename)
      const stats = generateExportStats(result.data, "members")

      showToast("success", "✅ Socios exportados exitosamente", {
        description: `${result.count} socios exportados. Archivo: ${result.filename}`,
        duration: 4000,
      })

      setTimeout(() => {
        if (isMountedRef.current) {
          showToast("success", "📊 Estadísticas de exportación", {
            description: `Total: ${stats.total} socios. Estados: ${Object.keys(stats.by_status || {}).length} diferentes`,
            duration: 3000,
          })
        }
      }, 1000)
    } catch (error) {
      if (!isMountedRef.current) return
      console.error("Error exporting members:", error)
      showToast("error", "❌ Error al exportar socios", {
        description: error instanceof Error ? error.message : "Error desconocido",
        duration: 5000,
      })
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }

  const exportPayments = async () => {
    if (!isMountedRef.current) return

    try {
      setLoading(true)
      showProgressAction("💰 Exportando pagos...")

      showToast("loading", "💰 Preparando exportación de pagos...", {
        description: "Obteniendo historial de pagos...",
        duration: 2000,
      })

      const endDate = new Date().toISOString().split("T")[0]
      const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
      const res = await fetch(`/api/export/payments?start_date=${startDate}&end_date=${endDate}`)

      if (!isMountedRef.current) return

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Error al exportar pagos")
      }

      const result = await res.json()
      generateExcelFile(result.data, result.filename)

      showToast("success", "✅ Pagos exportados exitosamente", {
        description: `${result.count} pagos exportados. Total: $${result.statistics.total_amount.toLocaleString()}`,
        duration: 4000,
      })

      setTimeout(() => {
        if (isMountedRef.current) {
          const methods = Object.keys(result.statistics.payment_methods).join(", ")
          showToast("success", "💳 Métodos de pago incluidos", {
            description: `Métodos: ${methods}`,
            duration: 3000,
          })
        }
      }, 1000)
    } catch (error) {
      if (!isMountedRef.current) return
      console.error("Error exporting payments:", error)
      showToast("error", "❌ Error al exportar pagos", {
        description: error instanceof Error ? error.message : "Error desconocido",
        duration: 5000,
      })
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }

  // Filtrado y ordenamiento
  const filteredAndSortedMemberships = memberships
    .filter((membership) => {
      const matchesSearch =
        membership.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        membership.description.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFilter =
        filterStatus === "all" ||
        (filterStatus === "active" && membership.is_active) ||
        (filterStatus === "inactive" && !membership.is_active)
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      let aValue: any, bValue: any
      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case "price":
          aValue = a.price
          bValue = b.price
          break
        case "duration":
          aValue = a.duration_days
          bValue = b.duration_days
          break
        case "created":
          aValue = a.id
          bValue = b.id
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1
      return 0
    })

  // Función mejorada para cerrar el modal
  const handleCloseModal = useCallback(() => {
    // Limpiar todo antes de cerrar
    cleanupNotificationsAndStates()

    // Cerrar el modal
    onOpenChange(false)

    // Mostrar notificación de cierre (con delay para evitar conflictos)
    setTimeout(() => {
      if (isMountedRef.current) {
        showToast("success", "👋 Panel cerrado", {
          description: "Configuraciones guardadas automáticamente",
          duration: 2000,
        })
      }
    }, 200)
  }, [cleanupNotificationsAndStates, onOpenChange, showToast])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-[95vw] h-[95vh] flex flex-col bg-slate-900 border-slate-700 p-0">
        <div className="flex flex-col h-full">
          <DialogHeader className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-700">
            <DialogTitle className="text-white flex items-center gap-2 text-lg sm:text-xl">
              <Settings className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">Configuración del Sistema</span>
              <Sparkles className="h-4 w-4 text-yellow-400 flex-shrink-0" />
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm">
              Centro de control del gimnasio. Los cambios se guardan automáticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex flex-col overflow-y-auto">
            {/* Progress indicator for actions */}
            {currentAction && (
              <div className="mx-4 mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-400 flex-shrink-0" />
                  <span className="text-blue-300 text-sm font-medium truncate">{currentAction}</span>
                </div>
                <Progress value={actionProgress} className="h-2" />
              </div>
            )}

            {/* Config saving indicator */}
            {configSaving && (
              <div className="mx-4 mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-green-400 flex-shrink-0" />
                  <span className="text-green-300 text-sm font-medium">💾 Guardando configuración...</span>
                </div>
              </div>
            )}

            <Tabs defaultValue="memberships" className="w-full h-full flex flex-col">
              <div className="px-4 pt-4">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-slate-800 h-auto">
                  <TabsTrigger
                    value="memberships"
                    className="data-[state=active]:bg-slate-700 text-xs sm:text-sm py-2 px-1 sm:px-3"
                  >
                    <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Membresías</span>
                    <span className="sm:hidden">Memb.</span>
                    <Badge variant="secondary" className="ml-1 sm:ml-2 text-xs px-1">
                      {memberships.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger
                    value="system"
                    className="data-[state=active]:bg-slate-700 text-xs sm:text-sm py-2 px-1 sm:px-3"
                  >
                    <Settings className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Sistema</span>
                    <span className="sm:hidden">Sist.</span>
                    {configSaving && <Loader2 className="h-3 w-3 ml-1 animate-spin" />}
                  </TabsTrigger>
                  <TabsTrigger
                    value="users"
                    className="data-[state=active]:bg-slate-700 text-xs sm:text-sm py-2 px-1 sm:px-3"
                  >
                    <Users className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Usuarios</span>
                    <span className="sm:hidden">Users</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="reports"
                    className="data-[state=active]:bg-slate-700 text-xs sm:text-sm py-2 px-1 sm:px-3"
                  >
                    <FileText className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Reportes</span>
                    <span className="sm:hidden">Rep.</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pb-4">
                {/* Pestaña de Membresías */}
                <TabsContent value="memberships" className="space-y-4 sm:space-y-6 mt-4">
                  {/* Formulario de nueva membresía optimizado para móvil */}
                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="pb-3 sm:pb-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <CardTitle className="text-white flex items-center gap-2 text-lg">
                            <Plus className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                            <span>Nueva Membresía</span>
                            <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400 flex-shrink-0" />
                          </CardTitle>
                          <CardDescription className="text-slate-400 text-sm">
                            Crea una nueva membresía para el gimnasio
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {showTemplates && (
                        <div className="p-3 sm:p-4 bg-gradient-to-r from-slate-700 to-slate-600 rounded-lg border border-slate-600">
                          <h4 className="text-white font-medium mb-3 flex items-center gap-2 text-sm sm:text-base">
                            <Star className="h-4 w-4 text-yellow-400" />
                            Plantillas Predefinidas
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {MEMBERSHIP_TEMPLATES.map((template, index) => (
                              <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                onClick={() => handleUseTemplate(template)}
                                className="border-slate-600 text-slate-300 hover:bg-slate-600 text-left justify-start h-auto p-3"
                              >
                                <div className="w-full">
                                  <div className="flex items-center gap-2 font-medium text-sm">
                                    <span>{template.icon}</span>
                                    {template.name}
                                  </div>
                                  <div className="text-xs text-slate-400 mt-1">
                                    ${template.price.toLocaleString()} • {template.duration_days} días
                                  </div>
                                </div>
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-slate-300 flex items-center gap-1 text-sm">
                            <Target className="h-3 w-3" />
                            Nombre *
                          </Label>
                          <Input
                            id="name"
                            value={newMembership.name}
                            onChange={(e) => setNewMembership({ ...newMembership, name: e.target.value })}
                            placeholder="Ej: Mensual Básico"
                            className={`bg-slate-700 border-slate-600 text-white text-sm ${formErrors.name ? "border-red-500" : ""}`}
                          />
                          {formErrors.name && (
                            <p className="text-red-400 text-xs flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                              <span>{formErrors.name}</span>
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="price" className="text-slate-300 flex items-center gap-1 text-sm">
                            <DollarSign className="h-3 w-3" />
                            Precio ($) *
                          </Label>
                          <Input
                            id="price"
                            type="text"
                            value={newMembership.price === 0 ? "" : newMembership.price.toString()}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9.]/g, "")
                              const numValue = value === "" ? 0 : Number.parseFloat(value) || 0
                              setNewMembership({ ...newMembership, price: numValue })
                            }}
                            placeholder="Ingresa el precio"
                            className={`bg-slate-700 border-slate-600 text-white text-sm ${formErrors.price ? "border-red-500" : ""}`}
                            required
                          />
                          {formErrors.price && (
                            <p className="text-red-400 text-xs flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                              <span>{formErrors.price}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="duration_days" className="text-slate-300 flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          Duración (días) *
                        </Label>
                        <Input
                          id="duration_days"
                          type="text"
                          value={newMembership.duration_days === 0 ? "" : newMembership.duration_days.toString()}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, "")
                            const numValue = value === "" ? 0 : Number.parseInt(value) || 0
                            setNewMembership({ ...newMembership, duration_days: numValue })
                          }}
                          placeholder="Ingresa los días"
                          className={`bg-slate-700 border-slate-600 text-white text-sm ${
                            formErrors.duration_days ? "border-red-500" : ""
                          }`}
                          required
                        />
                        {formErrors.duration_days && (
                          <p className="text-red-400 text-xs flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                            <span>{formErrors.duration_days}</span>
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description" className="text-slate-300 flex items-center gap-1 text-sm">
                          <FileText className="h-3 w-3" />
                          Descripción
                        </Label>
                        <Textarea
                          id="description"
                          value={newMembership.description}
                          onChange={(e) => setNewMembership({ ...newMembership, description: e.target.value })}
                          placeholder="Descripción de la membresía..."
                          className="bg-slate-700 border-slate-600 text-white text-sm resize-none"
                          rows={3}
                        />
                      </div>

                      <Button
                        onClick={handleCreateMembership}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Creando...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Crear Membresía
                            <Rocket className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Lista de membresías optimizada para móvil */}
                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="pb-3 sm:pb-6">
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <CardTitle className="text-white flex items-center gap-2 text-lg">
                              <Award className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 flex-shrink-0" />
                              <span>Membresías Existentes</span>
                            </CardTitle>
                            <CardDescription className="text-slate-400 text-sm">
                              {filteredAndSortedMemberships.length} de {memberships.length} membresías
                              {selectedMemberships.length > 0 && (
                                <span className="text-blue-400 ml-2">• {selectedMemberships.length} seleccionadas</span>
                              )}
                            </CardDescription>
                          </div>

                          {/* Botones de acción para móvil */}
                          <div className="flex flex-wrap gap-2">
                            {selectedMemberships.length > 0 && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleBulkStatusChange(true)}
                                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg border-0 transition-all duration-200 text-xs"
                                  disabled={loading}
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  <span className="hidden sm:inline">Activar ({selectedMemberships.length})</span>
                                  <span className="sm:hidden">✓ {selectedMemberships.length}</span>
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleBulkStatusChange(false)}
                                  className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-lg border-0 transition-all duration-200 text-xs"
                                  disabled={loading}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  <span className="hidden sm:inline">Desactivar ({selectedMemberships.length})</span>
                                  <span className="sm:hidden">✗ {selectedMemberships.length}</span>
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              onClick={exportMemberships}
                              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg border-0 transition-all duration-200 text-xs"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">Exportar</span>
                              <span className="sm:hidden">CSV</span>
                            </Button>
                            <Button
                              size="sm"
                              onClick={fetchMemberships}
                              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg border-0 transition-all duration-200 text-xs"
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">Actualizar</span>
                              <span className="sm:hidden">↻</span>
                            </Button>
                          </div>
                        </div>

                        {/* Controles de búsqueda y filtros optimizados para móvil */}
                        <div className="space-y-3">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                              placeholder="Buscar membresías..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-10 bg-slate-700 border-slate-600 text-white text-sm"
                            />
                          </div>

                          {/* Filtros colapsables en móvil */}
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => setShowFilters(!showFilters)}
                              className="bg-blue-600 text-white hover:bg-blue-700 shadow-md sm:hidden transition-colors duration-200"
                            >
                              <Filter className="h-3 w-3 mr-1" />
                              Filtros
                              {showFilters ? (
                                <ChevronUp className="h-3 w-3 ml-1" />
                              ) : (
                                <ChevronDown className="h-3 w-3 ml-1" />
                              )}
                            </Button>

                            {/* Filtros siempre visibles en desktop */}
                            <div className="hidden sm:flex gap-2 flex-1">
                              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                                <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-white text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-700 border-slate-600">
                                  <SelectItem value="all">Todas</SelectItem>
                                  <SelectItem value="active">Activas</SelectItem>
                                  <SelectItem value="inactive">Inactivas</SelectItem>
                                </SelectContent>
                              </Select>
                              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                                <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-white text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-700 border-slate-600">
                                  <SelectItem value="name">Nombre</SelectItem>
                                  <SelectItem value="price">Precio</SelectItem>
                                  <SelectItem value="duration">Duración</SelectItem>
                                  <SelectItem value="created">Fecha</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                                className="bg-blue-600 text-white border-blue-600 shadow-md transition-all duration-200"
                              >
                                {sortOrder === "asc" ? (
                                  <SortAsc className="h-4 w-4" />
                                ) : (
                                  <SortDesc className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>

                          {/* Filtros colapsables para móvil */}
                          {showFilters && (
                            <div className="flex flex-col gap-2 sm:hidden">
                              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                                <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-700 border-slate-600">
                                  <SelectItem value="all">Todas</SelectItem>
                                  <SelectItem value="active">Activas</SelectItem>
                                  <SelectItem value="inactive">Inactivas</SelectItem>
                                </SelectContent>
                              </Select>
                              <div className="flex gap-2">
                                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                                  <SelectTrigger className="flex-1 bg-slate-700 border-slate-600 text-white text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-700 border-slate-600">
                                    <SelectItem value="name">Nombre</SelectItem>
                                    <SelectItem value="price">Precio</SelectItem>
                                    <SelectItem value="duration">Duración</SelectItem>
                                    <SelectItem value="created">Fecha</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                                  className="bg-blue-600 text-white border-blue-600 shadow-md transition-all duration-200"
                                >
                                  {sortOrder === "asc" ? (
                                    <SortAsc className="h-4 w-4" />
                                  ) : (
                                    <SortDesc className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="space-y-3">
                        {loading ? (
                          <div className="flex justify-center py-8">
                            <div className="text-center">
                              <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-2" />
                              <p className="text-slate-400 text-sm">Cargando membresías...</p>
                            </div>
                          </div>
                        ) : filteredAndSortedMemberships.length === 0 ? (
                          <div className="text-center py-8">
                            <CreditCard className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                            <p className="text-slate-400 text-sm">No se encontraron membresías</p>
                            {searchTerm && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSearchTerm("")}
                                className="mt-2 border-slate-600 text-xs"
                              >
                                Limpiar búsqueda
                              </Button>
                            )}
                          </div>
                        ) : (
                          filteredAndSortedMemberships.map((membership) => (
                            <div
                              key={membership.id}
                              className={`p-3 sm:p-4 bg-slate-700 rounded-lg border transition-all hover:bg-slate-600/50 ${
                                selectedMemberships.includes(membership.id)
                                  ? "border-blue-500 bg-slate-600 shadow-lg"
                                  : "border-slate-600"
                              }`}
                            >
                              {editingMembership?.id === membership.id ? (
                                // Modo edición optimizado para móvil
                                <div className="space-y-3">
                                  <Input
                                    value={editingMembership.name}
                                    onChange={(e) =>
                                      setEditingMembership({ ...editingMembership, name: e.target.value })
                                    }
                                    className="bg-slate-600 border-slate-500 text-white text-sm"
                                    placeholder="Nombre de la membresía"
                                  />
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <Input
                                      type="number"
                                      value={editingMembership.price}
                                      onChange={(e) =>
                                        setEditingMembership({ ...editingMembership, price: Number(e.target.value) })
                                      }
                                      className="bg-slate-600 border-slate-500 text-white text-sm"
                                      placeholder="Precio"
                                    />
                                    <Input
                                      type="number"
                                      value={editingMembership.duration_days}
                                      onChange={(e) =>
                                        setEditingMembership({
                                          ...editingMembership,
                                          duration_days: Number(e.target.value),
                                        })
                                      }
                                      className="bg-slate-600 border-slate-500 text-white text-sm"
                                      placeholder="Duración en días"
                                    />
                                  </div>
                                  <Textarea
                                    value={editingMembership.description}
                                    onChange={(e) =>
                                      setEditingMembership({ ...editingMembership, description: e.target.value })
                                    }
                                    className="bg-slate-600 border-slate-500 text-white text-sm resize-none"
                                    placeholder="Descripción"
                                    rows={2}
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleUpdateMembership(editingMembership)}
                                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg border-0 transition-all duration-200 text-xs"
                                    >
                                      <Save className="h-3 w-3 mr-1" />
                                      Guardar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingMembership(null)}
                                      className="flex-1 border-slate-500 hover:bg-slate-600 text-slate-300 hover:text-white transition-all duration-200 text-xs"
                                    >
                                      Cancelar
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                // Vista normal optimizada para móvil
                                <div className="flex items-start gap-3">
                                  <input
                                    type="checkbox"
                                    checked={selectedMemberships.includes(membership.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedMemberships([...selectedMemberships, membership.id])
                                      } else {
                                        setSelectedMemberships(selectedMemberships.filter((id) => id !== membership.id))
                                      }
                                    }}
                                    className="rounded border-slate-500 mt-1 flex-shrink-0"
                                  />

                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                          <h3 className="text-white font-medium text-sm sm:text-base truncate">
                                            {membership.name}
                                          </h3>
                                          <Badge
                                            variant={membership.is_active ? "default" : "secondary"}
                                            className="text-xs"
                                          >
                                            {membership.is_active ? (
                                              <>
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                <span className="hidden sm:inline">Activa</span>
                                                <span className="sm:hidden">✓</span>
                                              </>
                                            ) : (
                                              <>
                                                <XCircle className="h-3 w-3 mr-1" />
                                                <span className="hidden sm:inline">Inactiva</span>
                                                <span className="sm:hidden">✗</span>
                                              </>
                                            )}
                                          </Badge>
                                          {membership.members_count !== undefined && (
                                            <Badge variant="outline" className="text-xs">
                                              <Users className="h-3 w-3 mr-1" />
                                              {membership.members_count}
                                            </Badge>
                                          )}
                                        </div>

                                        {/* Descripción colapsable en móvil */}
                                        <div className="mb-2">
                                          <p className="text-slate-400 text-xs sm:text-sm line-clamp-2 sm:line-clamp-none">
                                            {membership.description}
                                          </p>
                                          {membership.description.length > 50 && (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() =>
                                                setExpandedMembership(
                                                  expandedMembership === membership.id ? null : membership.id,
                                                )
                                              }
                                              className="p-0 h-auto text-xs text-blue-400 hover:text-blue-300 sm:hidden"
                                            >
                                              {expandedMembership === membership.id ? "Ver menos" : "Ver más"}
                                            </Button>
                                          )}
                                        </div>

                                        {/* Información expandida en móvil */}
                                        {expandedMembership === membership.id && (
                                          <p className="text-slate-400 text-xs mb-2 sm:hidden">
                                            {membership.description}
                                          </p>
                                        )}

                                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-300">
                                          <span className="flex items-center gap-1">
                                            <DollarSign className="h-3 w-3" />${membership.price.toLocaleString()}
                                          </span>
                                          <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {membership.duration_days}d
                                          </span>
                                          <span className="flex items-center gap-1">
                                            <TrendingUp className="h-3 w-3" />$
                                            {(membership.price / membership.duration_days).toFixed(2)}/día
                                          </span>
                                        </div>
                                      </div>

                                      {/* Controles de acción optimizados para móvil */}
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <Switch
                                          checked={membership.is_active}
                                          onCheckedChange={() => handleToggleMembershipStatus(membership)}
                                          className="scale-75 sm:scale-100"
                                        />
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button
                                              size="sm"
                                              className="bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-colors duration-200 h-8 w-8 p-0"
                                            >
                                              <MoreHorizontal className="h-3 w-3" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent className="bg-slate-700 border-slate-600" align="end">
                                            <DropdownMenuLabel className="text-slate-300 text-xs">
                                              Acciones
                                            </DropdownMenuLabel>
                                            <DropdownMenuSeparator className="bg-slate-600" />
                                            <DropdownMenuItem
                                              onClick={() => setEditingMembership(membership)}
                                              className="text-slate-300 hover:bg-slate-600 text-xs"
                                            >
                                              <Edit className="h-3 w-3 mr-2" />
                                              Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={() => handleDuplicateMembership(membership)}
                                              className="text-slate-300 hover:bg-slate-600 text-xs"
                                            >
                                              <Copy className="h-3 w-3 mr-2" />
                                              Duplicar
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator className="bg-slate-600" />
                                            <AlertDialog>
                                              <AlertDialogTrigger asChild>
                                                <DropdownMenuItem
                                                  onSelect={(e) => e.preventDefault()}
                                                  className="text-red-400 hover:bg-red-500/10 text-xs"
                                                >
                                                  <Trash2 className="h-3 w-3 mr-2" />
                                                  Eliminar
                                                </DropdownMenuItem>
                                              </AlertDialogTrigger>
                                              <AlertDialogContent className="bg-slate-800 border-slate-700 w-[95vw] max-w-md">
                                                <AlertDialogHeader>
                                                  <AlertDialogTitle className="text-white flex items-center gap-2 text-base">
                                                    <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
                                                    <span>¿Eliminar membresía?</span>
                                                  </AlertDialogTitle>
                                                  <AlertDialogDescription className="text-slate-400 text-sm">
                                                    <div className="space-y-3">
                                                      <p>
                                                        Esta acción <strong>no se puede deshacer</strong>. La membresía
                                                        "{membership.name}" será eliminada permanentemente del sistema.
                                                      </p>
                                                      {membership.members_count && membership.members_count > 0 && (
                                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                                          <div className="flex items-center gap-2 text-red-400 mb-2">
                                                            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                                            <span className="font-medium text-xs">
                                                              ⚠️ Advertencia Crítica
                                                            </span>
                                                          </div>
                                                          <p className="text-xs">
                                                            Esta membresía tiene{" "}
                                                            <strong>{membership.members_count} socios asociados</strong>
                                                            . Eliminarla podría afectar sus suscripciones activas.
                                                          </p>
                                                        </div>
                                                      )}
                                                      <div className="text-xs text-slate-500">
                                                        💡 Tip: Considera desactivar la membresía en lugar de eliminarla
                                                      </div>
                                                    </div>
                                                  </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                                  <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 text-sm">
                                                    <Shield className="h-3 w-3 mr-1" />
                                                    Cancelar
                                                  </AlertDialogCancel>
                                                  <AlertDialogAction
                                                    onClick={() =>
                                                      handleDeleteMembership(membership.id, membership.name)
                                                    }
                                                    className="bg-red-600 hover:bg-red-700 text-sm"
                                                  >
                                                    <Trash2 className="h-3 w-3 mr-1" />
                                                    Eliminar
                                                  </AlertDialogAction>
                                                </AlertDialogFooter>
                                              </AlertDialogContent>
                                            </AlertDialog>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Pestaña de Sistema */}
                <TabsContent value="system" className="space-y-4 sm:space-y-6 mt-4">
                  {configLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">Cargando configuración del sistema...</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                          <CardTitle className="text-white flex items-center gap-2 text-lg">
                            <Clock className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                            <span>Configuración de Pagos y Suspensiones</span>
                            <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400 flex-shrink-0" />
                          </CardTitle>
                          <CardDescription className="text-slate-400 text-sm">
                            Configura los períodos de gracia y suspensión automática
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 sm:space-y-6">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="p-3 bg-slate-700/50 rounded-lg">
                              <Label className="text-slate-300 flex items-center gap-1 mb-2 text-sm">
                                <Heart className="h-3 w-3" />
                                Período de gracia (días)
                              </Label>
                              <Input
                                type="text"
                                value={
                                  systemConfig.grace_period_days === 0 ? "" : systemConfig.grace_period_days.toString()
                                }
                                onChange={(e) => {
                                  const value = e.target.value.replace(/[^0-9]/g, "")
                                  const numValue = value === "" ? 0 : Number.parseInt(value) || 0
                                  if (numValue >= 0 && numValue <= 30) {
                                    handleSystemConfigChange("grace_period_days", numValue)
                                  } else {
                                    showToast("error", "⚠️ Valor inválido", {
                                      description: "El período de gracia debe estar entre 0 y 30 días",
                                      duration: 3000,
                                    })
                                  }
                                }}
                                className="bg-slate-700 border-slate-600 text-white text-sm"
                                placeholder="Días de gracia"
                              />
                              <p className="text-xs text-slate-400 mt-1">
                                Días antes de marcar como vencido
                                {systemConfig.grace_period_days > 0 && (
                                  <span className="text-green-400 ml-1">
                                    ✓ Activo ({systemConfig.grace_period_days}d)
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="p-3 bg-slate-700/50 rounded-lg">
                              <Label className="text-slate-300 flex items-center gap-1 mb-2 text-sm">
                                <AlertTriangle className="h-3 w-3" />
                                Auto-suspensión (días)
                              </Label>
                              <Input
                                type="text"
                                value={
                                  systemConfig.auto_suspend_days === 0 ? "" : systemConfig.auto_suspend_days.toString()
                                }
                                onChange={(e) => {
                                  const value = e.target.value.replace(/[^0-9]/g, "")
                                  const numValue = value === "" ? 0 : Number.parseInt(value) || 0
                                  if (numValue >= 1 && numValue <= 365) {
                                    handleSystemConfigChange("auto_suspend_days", numValue)
                                  } else {
                                    showToast("error", "⚠️ Valor inválido", {
                                      description: "La auto-suspensión debe estar entre 1 y 365 días",
                                      duration: 3000,
                                    })
                                  }
                                }}
                                className="bg-slate-700 border-slate-600 text-white text-sm"
                                placeholder="Días para suspender"
                              />
                              <p className="text-xs text-slate-400 mt-1">
                                Días vencido antes de suspender
                                <span className="text-yellow-400 ml-1">
                                  ⚡ Activo ({systemConfig.auto_suspend_days}d)
                                </span>
                              </p>
                            </div>
                            <div className="p-3 bg-slate-700/50 rounded-lg">
                              <Label className="text-slate-300 flex items-center gap-1 mb-2 text-sm">
                                <XCircle className="h-3 w-3" />
                                Auto-inactivo (días)
                              </Label>
                              <Input
                                type="text"
                                value={
                                  systemConfig.auto_inactive_days === 0
                                    ? ""
                                    : systemConfig.auto_inactive_days.toString()
                                }
                                onChange={(e) => {
                                  const value = e.target.value.replace(/[^0-9]/g, "")
                                  const numValue = value === "" ? 0 : Number.parseInt(value) || 0
                                  if (numValue >= 1 && numValue <= 365) {
                                    handleSystemConfigChange("auto_inactive_days", numValue)
                                  } else {
                                    showToast("error", "⚠️ Valor inválido", {
                                      description: "La auto-inactivación debe estar entre 1 y 365 días",
                                      duration: 3000,
                                    })
                                  }
                                }}
                                className="bg-slate-700 border-slate-600 text-white text-sm"
                                placeholder="Días para inactivar"
                              />
                              <p className="text-xs text-slate-400 mt-1">
                                Días sin pago antes de marcar inactivo
                                <span className="text-red-400 ml-1">
                                  🔴 Activo ({systemConfig.auto_inactive_days}d)
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-blue-300 font-medium text-sm">🧪 Probar Configuración</h4>
                                <p className="text-blue-400/80 text-xs mt-1">
                                  Ejecutar actualización de estados con la configuración actual
                                </p>
                              </div>
                              <Button
                                size="sm"
                                onClick={async () => {
                                  try {
                                    showToast("loading", "🔄 Aplicando configuración...", {
                                      description: "Actualizando estados de membresías",
                                      duration: 2000,
                                    })

                                    const response = await fetch("/api/members/stats", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ action: "update_statuses" }),
                                    })

                                    if (response.ok) {
                                      const data = await response.json()
                                      showToast("success", "✅ Configuración aplicada", {
                                        description: `Estados actualizados usando: Gracia ${systemConfig.grace_period_days}d, Suspensión ${systemConfig.auto_suspend_days}d, Inactivo ${systemConfig.auto_inactive_days}d`,
                                        duration: 5000,
                                      })
                                    } else {
                                      showToast("error", "❌ Error al aplicar configuración")
                                    }
                                  } catch (error) {
                                    showToast("error", "🚨 Error de conexión")
                                  }
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Aplicar Ahora
                              </Button>
                            </div>
                          </div>

                          <Separator className="bg-slate-600" />
                        </CardContent>
                      </Card>

                      <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                          <CardTitle className="text-white flex items-center gap-2 text-lg">
                            <Database className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                            <span>Migración de Datos</span>
                            <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400 flex-shrink-0" />
                          </CardTitle>
                          <CardDescription className="text-slate-400 text-sm">
                            Importa datos desde archivos Excel para poblar la base de datos
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg">
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-blue-500/20 rounded-lg flex-shrink-0">
                                <Database className="h-5 w-5 text-blue-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-blue-300 font-medium text-sm mb-2">
                                  🚀 Importación Masiva de Datos
                                </h4>
                                <p className="text-blue-400/80 text-xs mb-3">
                                  Carga socios, pagos y membresías desde archivos Excel de forma rápida y segura. El
                                  sistema validará automáticamente los datos antes de importarlos.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <MigrationModal
                                    onMigrationComplete={() => {
                                      fetchSystemConfig()
                                      showToast("success", "✅ Migración completada", {
                                        description: "Los datos se han importado correctamente al sistema",
                                        duration: 4000,
                                      })
                                    }}
                                  />
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      showToast("info", "📋 Formatos soportados", {
                                        description:
                                          "Excel (.xlsx, .xls) con columnas: Nombre, Email, Teléfono, Membresía, etc.",
                                        duration: 5000,
                                      })
                                    }}
                                    className="border-blue-500/50 text-blue-300 bg-blue-500/10 hover:bg-blue-600 hover:border-blue-600 hover:text-white transition-colors duration-200 text-xs"
                                  >
                                    <FileText className="h-3 w-3 mr-1" />
                                    Ver Formato
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/50">
                              <div className="flex items-center gap-2 mb-2">
                                <Users className="h-4 w-4 text-green-400" />
                                <span className="text-green-300 font-medium text-sm">Socios</span>
                              </div>
                              <p className="text-xs text-slate-400">
                                Importa información completa de socios con sus datos personales y membresías
                              </p>
                            </div>
                            <div className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/50">
                              <div className="flex items-center gap-2 mb-2">
                                <CreditCard className="h-4 w-4 text-blue-400" />
                                <span className="text-blue-300 font-medium text-sm">Pagos</span>
                              </div>
                              <p className="text-xs text-slate-400">
                                Carga historial de pagos con fechas, montos y métodos de pago
                              </p>
                            </div>
                            <div className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/50">
                              <div className="flex items-center gap-2 mb-2">
                                <Target className="h-4 w-4 text-purple-400" />
                                <span className="text-purple-300 font-medium text-sm">Membresías</span>
                              </div>
                              <p className="text-xs text-slate-400">
                                Define tipos de membresías con precios y duraciones personalizadas
                              </p>
                            </div>
                          </div>

                          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                              <span className="text-yellow-300 font-medium text-sm">⚠️ Importante</span>
                            </div>
                            <ul className="text-xs text-yellow-400/80 space-y-1 ml-6">
                              <li>• Realiza un backup antes de importar datos masivos</li>
                              <li>• Los datos duplicados serán detectados y omitidos</li>
                              <li>• La importación puede tomar varios minutos para archivos grandes</li>
                              <li>• Verifica el formato de fechas (DD/MM/YYYY)</li>
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </TabsContent>

                {/* Pestaña de Usuarios */}
                <TabsContent value="users" className="space-y-4 sm:space-y-6 mt-4">
                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2 text-lg">
                        <Shield className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                        <span>Gestión de Usuarios Admin</span>
                        <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400 flex-shrink-0" />
                      </CardTitle>
                      <CardDescription className="text-slate-400 text-sm">
                        Administra los usuarios con acceso al sistema
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <UserManagement />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Pestaña de Reportes */}
                <TabsContent value="reports" className="space-y-4 sm:space-y-6 mt-4">
                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2 text-lg">
                        <Download className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                        <span>Exportación de Datos</span>
                        <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400 flex-shrink-0" />
                      </CardTitle>
                      <CardDescription className="text-slate-400 text-sm">
                        Exporta información del gimnasio en diferentes formatos
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Button
                          onClick={exportMembers}
                          className="h-auto p-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                          disabled={loading}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Users className="h-5 w-5 sm:h-6 sm:w-6" />
                            <span className="font-medium text-sm">Exportar Socios</span>
                            <span className="text-xs opacity-80">Excel (.xlsx)</span>
                          </div>
                        </Button>

                        <Button
                          onClick={exportPayments}
                          className="h-auto p-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                          disabled={loading}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />
                            <span className="font-medium text-sm">Exportar Pagos</span>
                            <span className="text-xs opacity-80">Excel (.xlsx)</span>
                          </div>
                        </Button>

                        <Button
                          onClick={async () => {
                            if (!isMountedRef.current) return

                            try {
                              setLoading(true)
                              showProgressAction("📋 Creando backup completo...")

                              showToast("loading", "📋 Generando backup completo...", {
                                description: "Esto puede tomar varios minutos...",
                                duration: 5000,
                              })

                              const res = await fetch("/api/export/backup")

                              if (!isMountedRef.current) return

                              if (!res.ok) {
                                const errorData = await res.json()
                                throw new Error(errorData.error || "Error al crear backup")
                              }

                              const result = await res.json()

                              const { downloadBackupFile, formatBackupSize, generateBackupSummary } = await import(
                                "@/lib/backup-utils"
                              )

                              downloadBackupFile(result.data, result.filename)

                              const summary = generateBackupSummary(result.statistics)
                              const size = formatBackupSize(result.statistics.backup_size_mb)

                              showToast("success", "🎉 Backup completo creado", {
                                description: `${result.filename} (${size}) - ${summary}`,
                                duration: 6000,
                              })

                              setTimeout(() => {
                                if (isMountedRef.current) {
                                  showToast("success", "📊 Backup completado exitosamente", {
                                    description: `Archivo: ${result.filename} | Tamaño: ${size} | Creado por: ${result.statistics.created_by}`,
                                    duration: 5000,
                                  })
                                }
                              }, 2000)
                            } catch (error) {
                              if (!isMountedRef.current) return
                              console.error("Error creating backup:", error)
                              showToast("error", "❌ Error al crear backup", {
                                description: error instanceof Error ? error.message : "Error desconocido",
                                duration: 5000,
                              })
                            } finally {
                              if (isMountedRef.current) {
                                setLoading(false)
                              }
                            }
                          }}
                          className="h-auto p-4 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800"
                          disabled={loading}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Database className="h-5 w-5 sm:h-6 sm:w-6" />
                            <span className="font-medium text-sm">Backup Completo</span>
                            <span className="text-xs opacity-80">ZIP (.zip)</span>
                          </div>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Footer optimizado para móvil */}
          <div className="flex justify-end p-4 border-t border-slate-700">
            <Button
              variant="outline"
              onClick={handleCloseModal}
              className="border-red-500/50 text-red-300 bg-red-500/10 hover:bg-red-600 hover:border-red-600 hover:text-white transition-colors duration-200 text-sm"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
