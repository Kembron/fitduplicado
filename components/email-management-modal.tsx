"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  Mail,
  Send,
  Users,
  Edit,
  Save,
  Loader2,
  AlertTriangle,
  Clock,
  Target,
  Zap,
  Sparkles,
  MessageSquare,
  UserCheck,
  UserX,
  UserMinus,
  Crown,
  Calendar,
  FileText,
  CheckCircle2,
  RefreshCw,
  Activity,
  TrendingUp,
  Shield,
  Settings,
} from "lucide-react"
import { toast } from "sonner"
import { useReminderSystem } from "./auto-reminder-checker"

interface EmailManagementModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  content: string
  type: "reminder" | "custom" | "welcome" | "promotion"
}

interface MemberStats {
  active: number
  expired: number
  suspended: number
  inactive: number
  cancelled: number
  total: number
}

interface ReminderStatus {
  lastRun: string | null
  nextRun: string | null
  totalSent: number
  status: "active" | "inactive"
  error?: string
}

interface WelcomeTemplate {
  subject: string
  content: string
}

interface ReminderTemplate {
  subject: string
  content: string
}

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: "membership_reminder",
    name: "Recordatorio de Vencimiento",
    subject: "🏋️ Tu membresía vence pronto - FitHouse Gym",
    type: "reminder",
    content: `Hola {{memberName}},

¡Esperamos que estés disfrutando de tu entrenamiento en FitHouse Gym!

Te escribimos para recordarte que tu membresía "{{membershipName}}" vence en {{daysUntilExpiry}} días, el {{expiryDate}}.

Para continuar disfrutando de nuestras instalaciones sin interrupciones, te recomendamos renovar tu membresía antes de la fecha de vencimiento.

DETALLES DE TU MEMBRESÍA:
- Plan: {{membershipName}}
- Fecha de vencimiento: {{expiryDate}}
- Precio de renovación: \${{price}}

Puedes renovar tu membresía:
- Visitando nuestras instalaciones
- Contactándonos por WhatsApp
- Llamándonos directamente

¡No dejes que tu rutina se interrumpa!

Saludos,
Equipo FitHouse Gym`,
  },
  {
    id: "welcome",
    name: "Bienvenida",
    subject: "🎉 ¡Bienvenido a FitHouse Gym!",
    type: "welcome",
    content: `¡Hola {{memberName}}!

¡Bienvenido a la familia FitHouse Gym! 🏋️

Estamos emocionados de tenerte como parte de nuestra comunidad fitness. A partir de hoy, tienes acceso completo a todas nuestras instalaciones y servicios.

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
  },
  {
    id: "promotion",
    name: "Promoción",
    subject: "🔥 Oferta especial para ti - FitHouse Gym",
    type: "promotion",
    content: `¡Hola {{memberName}}!

Tenemos una oferta especial solo para ti en FitHouse Gym.

[Personaliza aquí tu mensaje promocional]

¡No te pierdas esta oportunidad!

Saludos,
Equipo FitHouse Gym`,
  },
]

const MEMBER_STATUS_OPTIONS = [
  { value: "active", label: "Activos", icon: UserCheck, color: "text-green-500", bgColor: "bg-green-500/10" },
  { value: "expired", label: "Vencidos", icon: Clock, color: "text-orange-500", bgColor: "bg-orange-500/10" },
  { value: "suspended", label: "Suspendidos", icon: UserMinus, color: "text-red-500", bgColor: "bg-red-500/10" },
  { value: "inactive", label: "Inactivos", icon: UserX, color: "text-gray-500", bgColor: "bg-gray-500/10" },
]

// Componente de Editor Mejorado - COMPLETAMENTE REDISEÑADO
interface VisualEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  previewData?: any
  className?: string
}

function VisualEditor({ value, onChange, placeholder, previewData, className }: VisualEditorProps) {
  const [isEditing, setIsEditing] = useState(false)

  // Función para reemplazar variables en el template
  const replaceTemplateVariables = (content: string, data: any) => {
    if (!data) return content
    let result = content

    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g")
      result = result.replace(regex, String(value))
    })

    return result
  }

  // Función para formatear el contenido visualmente (solo para mostrar)
  const formatForDisplay = (content: string) => {
    if (!content) return null

    const lines = content.split("\n")

    return lines.map((line, index) => {
      const trimmedLine = line.trim()

      // Líneas vacías
      if (!trimmedLine) {
        return <div key={index} className="h-3" />
      }

      // Detectar títulos/secciones principales
      if (
        trimmedLine.includes("📋") ||
        trimmedLine.includes("🏋️") ||
        trimmedLine.includes("💡") ||
        trimmedLine.includes("📞") ||
        (trimmedLine.endsWith(":") && trimmedLine.length < 60) ||
        (trimmedLine === trimmedLine.toUpperCase() && trimmedLine.includes(":"))
      ) {
        return (
          <div
            key={index}
            className="font-bold text-slate-900 mt-5 mb-3 text-base border-l-4 border-blue-500 pl-4 bg-blue-50 py-2 rounded-r"
          >
            {trimmedLine}
          </div>
        )
      }

      // Detectar elementos de lista con •
      if (trimmedLine.startsWith("•")) {
        return (
          <div key={index} className="ml-4 mb-2 text-slate-700 flex items-start">
            <span className="text-blue-500 mr-3 font-bold text-lg leading-none">•</span>
            <span className="flex-1">{trimmedLine.substring(1).trim()}</span>
          </div>
        )
      }

      // Detectar elementos de lista con -
      if (trimmedLine.startsWith("-")) {
        return (
          <div key={index} className="ml-4 mb-2 text-slate-700 flex items-start">
            <span className="text-blue-500 mr-3 font-bold">-</span>
            <span className="flex-1">{trimmedLine.substring(1).trim()}</span>
          </div>
        )
      }

      // Detectar saludos iniciales
      if (trimmedLine.startsWith("¡Hola") || trimmedLine.startsWith("Hola")) {
        return (
          <div key={index} className="text-slate-800 mb-4 text-lg font-medium">
            {trimmedLine}
          </div>
        )
      }

      // Detectar despedidas
      if (trimmedLine.includes("Saludos") || trimmedLine.includes("Equipo")) {
        return (
          <div key={index} className="text-slate-700 mt-6 mb-2 font-medium italic">
            {trimmedLine}
          </div>
        )
      }

      // Párrafos normales
      return (
        <div key={index} className="mb-3 text-slate-700 leading-relaxed">
          {trimmedLine}
        </div>
      )
    })
  }

  const processedContent = previewData ? replaceTemplateVariables(value, previewData) : value

  return (
    <div className={`border border-slate-600 rounded-lg overflow-hidden ${className}`}>
      {!isEditing ? (
        // Vista de solo lectura - formato bonito
        <div
          className="bg-white p-6 min-h-[400px] cursor-text hover:bg-gray-50 transition-colors"
          onClick={() => setIsEditing(true)}
        >
          {value ? (
            <div className="space-y-1">{formatForDisplay(processedContent)}</div>
          ) : (
            <div className="text-slate-400 italic flex items-center justify-center h-full">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                <p className="text-lg mb-2">{placeholder || "Haz clic para escribir tu mensaje"}</p>
                <p className="text-sm">Escribe naturalmente, el formato se aplicará automáticamente</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Modo edición - texto plano y natural
        <div className="relative">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => setIsEditing(false)}
            autoFocus
            className="w-full bg-white text-slate-900 p-6 min-h-[400px] resize-none focus:outline-none text-sm leading-relaxed border-none"
            placeholder={
              placeholder ||
              "Escribe tu mensaje aquí...\n\nPuedes usar:\n• Listas con viñetas\n- Listas con guiones\n\nTÍTULOS EN MAYÚSCULAS:\nPárrafos normales\n\nVariables como {{memberName}}"
            }
            style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          />
          <div className="absolute top-3 right-3">
            <Button
              size="sm"
              onClick={() => setIsEditing(false)}
              className="bg-green-600 hover:bg-green-700 text-white text-xs shadow-lg"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Ver Resultado
            </Button>
          </div>
        </div>
      )}

      {/* Barra de estado */}
      <div className="bg-slate-800 px-4 py-2 text-xs text-slate-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Edit className="h-3 w-3 text-yellow-400" />
              <span>Editando - Escribe naturalmente</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3 w-3 text-green-400" />
              <span>Vista previa - Clic para editar</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {previewData && (
            <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-300">
              Con datos de ejemplo
            </Badge>
          )}
          {value && <span className="text-slate-400">{value.length} caracteres</span>}
        </div>
      </div>
    </div>
  )
}

// Función para obtener contenido por defecto limpio
const getDefaultWelcomeContent = () => {
  return `¡Hola {{memberName}}!

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

¡A entrenar se ha dicho! 💪`
}

// Función para obtener contenido por defecto de recordatorios
const getDefaultReminderContent = () => {
  return `Hola {{memberName}},

¡Esperamos que estés disfrutando de tu entrenamiento en FitHouse Gym!

Te escribimos para recordarte que tu membresía "{{membershipName}}" vence en {{daysUntilExpiry}} días, el {{expiryDate}}.

Para continuar disfrutando de nuestras instalaciones sin interrupciones, te recomendamos renovar tu membresía antes de la fecha de vencimiento.

DETALLES DE TU MEMBRESÍA:
- Plan: {{membershipName}}
- Fecha de vencimiento: {{expiryDate}}
- Precio de renovación: \${{price}}

Puedes renovar tu membresía:
- Visitando nuestras instalaciones
- Contactándonos por WhatsApp
- Llamándonos directamente

¡No dejes que tu rutina se interrumpa!

Saludos,
Equipo FitHouse Gym`
}

// Componente Editor de Mensaje de Bienvenida
interface WelcomeMessageEditorProps {
  value: string
  onChange: (value: string) => void
  previewData: any
}

function WelcomeMessageEditor({ value, onChange, previewData }: WelcomeMessageEditorProps) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div className="border border-slate-600 rounded-lg overflow-hidden">
      {!isEditing ? (
        <div
          className="bg-white p-6 min-h-[400px] cursor-text hover:bg-gray-50 transition-colors"
          onClick={() => setIsEditing(true)}
        >
          {value ? (
            <div className="space-y-3 text-slate-800">
              {value.split("\n").map((line, index) => {
                const trimmedLine = line.trim()

                if (!trimmedLine) {
                  return <div key={index} className="h-3" />
                }

                // Títulos con emojis
                if (
                  trimmedLine.includes("📋") ||
                  trimmedLine.includes("🏋️") ||
                  trimmedLine.includes("💡") ||
                  trimmedLine.includes("📞")
                ) {
                  return (
                    <div
                      key={index}
                      className="font-bold text-slate-900 mt-5 mb-3 text-base border-l-4 border-blue-500 pl-4 bg-blue-50 py-2 rounded-r"
                    >
                      {trimmedLine}
                    </div>
                  )
                }

                // Listas con viñetas
                if (trimmedLine.startsWith("•")) {
                  return (
                    <div key={index} className="ml-4 mb-2 text-slate-700 flex items-start">
                      <span className="text-blue-500 mr-3 font-bold text-lg leading-none">•</span>
                      <span className="flex-1">{trimmedLine.substring(1).trim()}</span>
                    </div>
                  )
                }

                // Saludos
                if (trimmedLine.startsWith("¡Hola") || trimmedLine.startsWith("Hola")) {
                  return (
                    <div key={index} className="text-slate-800 mb-4 text-lg font-medium">
                      {trimmedLine}
                    </div>
                  )
                }

                // Despedidas
                if (
                  trimmedLine.includes("Saludos") ||
                  trimmedLine.includes("Equipo") ||
                  trimmedLine.includes("¡A entrenar")
                ) {
                  return (
                    <div key={index} className="text-slate-700 mt-6 mb-2 font-medium italic">
                      {trimmedLine}
                    </div>
                  )
                }

                // Párrafos normales
                return (
                  <div key={index} className="mb-3 text-slate-700 leading-relaxed">
                    {trimmedLine}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-slate-400 italic flex items-center justify-center h-full">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                <p className="text-lg mb-2">Haz clic para escribir tu mensaje de bienvenida</p>
                <p className="text-sm">Escribe naturalmente, el formato se aplicará automáticamente</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => setIsEditing(false)}
            autoFocus
            className="w-full bg-white text-slate-900 p-6 min-h-[400px] resize-none focus:outline-none text-sm leading-relaxed border-none"
            placeholder={`Escribe tu mensaje de bienvenida aquí...

Ejemplo:
¡Hola {{memberName}}!

¡Bienvenido a FitHouse Gym! 🎉

📋 DETALLES DE TU MEMBRESÍA:
• Tipo: {{membershipName}}
• Vencimiento: {{expiryDate}}

¡Esperamos verte pronto!`}
            style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
          />
          <div className="absolute top-3 right-3">
            <Button
              size="sm"
              onClick={() => setIsEditing(false)}
              className="bg-green-600 hover:bg-green-700 text-white text-xs shadow-lg"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Ver Resultado
            </Button>
          </div>
        </div>
      )}

      <div className="bg-slate-800 px-4 py-2 text-xs text-slate-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Edit className="h-3 w-3 text-yellow-400" />
              <span>Editando - Escribe naturalmente</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3 w-3 text-green-400" />
              <span>Vista previa - Clic para editar</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-300">
            Template de bienvenida
          </Badge>
          {value && <span className="text-slate-400">{value.length} caracteres</span>}
        </div>
      </div>
    </div>
  )
}

// Componente Editor de Mensaje de Recordatorio
interface ReminderMessageEditorProps {
  value: string
  onChange: (value: string) => void
  previewData: any
}

function ReminderMessageEditor({ value, onChange, previewData }: ReminderMessageEditorProps) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div className="border border-slate-600 rounded-lg overflow-hidden">
      {!isEditing ? (
        <div
          className="bg-white p-6 min-h-[400px] cursor-text hover:bg-gray-50 transition-colors"
          onClick={() => setIsEditing(true)}
        >
          {value ? (
            <div className="space-y-3 text-slate-800">
              {value.split("\n").map((line, index) => {
                const trimmedLine = line.trim()

                if (!trimmedLine) {
                  return <div key={index} className="h-3" />
                }

                // Títulos con emojis o mayúsculas
                if (
                  trimmedLine.includes("DETALLES") ||
                  trimmedLine.includes("MEMBRESÍA") ||
                  (trimmedLine === trimmedLine.toUpperCase() && trimmedLine.includes(":"))
                ) {
                  return (
                    <div
                      key={index}
                      className="font-bold text-slate-900 mt-5 mb-3 text-base border-l-4 border-orange-500 pl-4 bg-orange-50 py-2 rounded-r"
                    >
                      {trimmedLine}
                    </div>
                  )
                }

                // Listas con guiones
                if (trimmedLine.startsWith("-")) {
                  return (
                    <div key={index} className="ml-4 mb-2 text-slate-700 flex items-start">
                      <span className="text-orange-500 mr-3 font-bold">-</span>
                      <span className="flex-1">{trimmedLine.substring(1).trim()}</span>
                    </div>
                  )
                }

                // Saludos
                if (trimmedLine.startsWith("¡Hola") || trimmedLine.startsWith("Hola")) {
                  return (
                    <div key={index} className="text-slate-800 mb-4 text-lg font-medium">
                      {trimmedLine}
                    </div>
                  )
                }

                // Despedidas
                if (trimmedLine.includes("Saludos") || trimmedLine.includes("Equipo")) {
                  return (
                    <div key={index} className="text-slate-700 mt-6 mb-2 font-medium italic">
                      {trimmedLine}
                    </div>
                  )
                }

                // Párrafos normales
                return (
                  <div key={index} className="mb-3 text-slate-700 leading-relaxed">
                    {trimmedLine}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-slate-400 italic flex items-center justify-center h-full">
              <div className="text-center">
                <Clock className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                <p className="text-lg mb-2">Haz clic para escribir tu mensaje de recordatorio</p>
                <p className="text-sm">Escribe naturalmente, el formato se aplicará automáticamente</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => setIsEditing(false)}
            autoFocus
            className="w-full bg-white text-slate-900 p-6 min-h-[400px] resize-none focus:outline-none text-sm leading-relaxed border-none"
            placeholder={`Escribe tu mensaje de recordatorio aquí...

Ejemplo:
Hola {{memberName}},

Tu membresía "{{membershipName}}" vence en {{daysUntilExpiry}} días.

DETALLES DE TU MEMBRESÍA:
- Plan: {{membershipName}}
- Vencimiento: {{expiryDate}}
- Precio: \${{ price }}

¡Renueva pronto!

Saludos,
Equipo FitHouse Gym`}
            style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
          />
          <div className="absolute top-3 right-3">
            <Button
              size="sm"
              onClick={() => setIsEditing(false)}
              className="bg-green-600 hover:bg-green-700 text-white text-xs shadow-lg"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Ver Resultado
            </Button>
          </div>
        </div>
      )}

      <div className="bg-slate-800 px-4 py-2 text-xs text-slate-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Edit className="h-3 w-3 text-yellow-400" />
              <span>Editando - Escribe naturalmente</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3 w-3 text-green-400" />
              <span>Vista previa - Clic para editar</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs bg-orange-500/20 text-orange-300">
            Template de recordatorio
          </Badge>
          {value && <span className="text-slate-400">{value.length} caracteres</span>}
        </div>
      </div>
    </div>
  )
}

export default function EmailManagementModal({ open, onOpenChange }: EmailManagementModalProps) {
  const [loading, setLoading] = useState(false)
  const [memberStats, setMemberStats] = useState<MemberStats>({
    active: 0,
    expired: 0,
    suspended: 0,
    inactive: 0,
    cancelled: 0,
    total: 0,
  })

  // Estados para templates
  const [templates, setTemplates] = useState<EmailTemplate[]>(DEFAULT_TEMPLATES)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)

  // Estados para envío de emails
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["active"])
  const [customSubject, setCustomSubject] = useState("")
  const [customContent, setCustomContent] = useState("")
  const [sendingProgress, setSendingProgress] = useState(0)
  const [isSending, setIsSending] = useState(false)

  // Datos de ejemplo para preview
  const [previewData] = useState({
    memberName: "Juan Pérez",
    membershipName: "Mensual Premium",
    expiryDate: "15 de enero de 2025",
    daysUntilExpiry: "3",
    price: "12000",
    joinDate: "15 de diciembre de 2024",
  })

  // Estado para recordatorios automáticos
  const [reminderStatus, setReminderStatus] = useState<ReminderStatus>({
    lastRun: null,
    nextRun: null,
    totalSent: 0,
    status: "inactive",
  })

  // Estados para template de bienvenida
  const [welcomeTemplate, setWelcomeTemplate] = useState<WelcomeTemplate>({
    subject: "¡Bienvenido a FitHouse Gym! 🏋️",
    content: getDefaultWelcomeContent(),
  })

  // Estados para template de recordatorio
  const [reminderTemplate, setReminderTemplate] = useState<ReminderTemplate>({
    subject: "🏋️ Tu membresía vence pronto - FitHouse Gym",
    content: getDefaultReminderContent(),
  })

  const [savingWelcome, setSavingWelcome] = useState(false)
  const [savingReminder, setSavingReminder] = useState(false)

  // Hook para el sistema de recordatorios
  const {
    stats: reminderStats,
    status: currentStatus,
    loading: reminderLoading,
    updateStats,
    manualCheck,
  } = useReminderSystem()

  // Ref para evitar múltiples llamadas
  const initializedRef = useRef(false)

  // Cargar estadísticas de socios - OPTIMIZADO
  const fetchMemberStats = useCallback(async () => {
    if (loading) return // Evitar llamadas múltiples

    try {
      setLoading(true)
      console.log("Fetching member stats for email modal...")

      const res = await fetch("/api/stats/basic")
      if (res.ok) {
        const data = await res.json()
        console.log("Member stats received:", data)

        const mappedStats = {
          active: data.activeMembers || 0,
          expired: data.expiredMembers || 0,
          suspended: data.suspendedMembers || 0,
          inactive: data.inactiveMembers || 0,
          cancelled: 0,
          total: data.totalMembers || 0,
        }

        console.log("Mapped stats:", mappedStats)
        setMemberStats(mappedStats)
      }
    } catch (error) {
      console.error("Error fetching member stats:", error)
    } finally {
      setLoading(false)
    }
  }, [loading])

  // Cargar estado de recordatorios automáticos - OPTIMIZADO
  const fetchReminderStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/emails/reminder-status")
      if (res.ok) {
        const data = await res.json()
        setReminderStatus(data)
      }
    } catch (error) {
      console.error("Error fetching reminder status:", error)
    }
  }, [])

  // Cargar template de bienvenida - OPTIMIZADO
  const fetchWelcomeTemplate = useCallback(async () => {
    try {
      console.log("🔄 Cargando template de bienvenida...")

      const res = await fetch("/api/config/welcome-template")
      console.log("📡 Respuesta del servidor:", res.status)

      if (res.ok) {
        const data = await res.json()
        console.log("📄 Datos recibidos:", data)

        if (data.template) {
          const cleanContent = data.template.content.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\")

          setWelcomeTemplate({
            subject: data.template.subject || "¡Bienvenido a FitHouse Gym! 🏋️",
            content: cleanContent || getDefaultWelcomeContent(),
          })
          console.log("✅ Template de bienvenida cargado y limpiado")
        } else {
          console.log("⚠️ No hay template personalizado, usando por defecto")
          setWelcomeTemplate({
            subject: "¡Bienvenido a FitHouse Gym! 🏋️",
            content: getDefaultWelcomeContent(),
          })
        }
      } else {
        console.warn("⚠️ No se pudo cargar template personalizado, usando por defecto")
        setWelcomeTemplate({
          subject: "¡Bienvenido a FitHouse Gym! 🏋️",
          content: getDefaultWelcomeContent(),
        })
      }
    } catch (error) {
      console.error("❌ Error fetching welcome template:", error)
      setWelcomeTemplate({
        subject: "¡Bienvenido a FitHouse Gym! 🏋️",
        content: getDefaultWelcomeContent(),
      })
      toast.error("⚠️ Error cargando template", {
        description: "Se usará el template por defecto",
        duration: 3000,
      })
    }
  }, [])

  // Cargar template de recordatorio - OPTIMIZADO
  const fetchReminderTemplate = useCallback(async () => {
    try {
      console.log("🔄 Cargando template de recordatorio...")

      const res = await fetch("/api/config/reminder-template")

      if (res.ok) {
        const data = await res.json()

        if (data.template) {
          const cleanContent = data.template.content.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\")

          setReminderTemplate({
            subject: data.template.subject || "🏋️ Tu membresía vence pronto - FitHouse Gym",
            content: cleanContent || getDefaultReminderContent(),
          })
          console.log("✅ Template de recordatorio cargado")
        } else {
          setReminderTemplate({
            subject: "🏋️ Tu membresía vence pronto - FitHouse Gym",
            content: getDefaultReminderContent(),
          })
        }
      } else {
        setReminderTemplate({
          subject: "🏋️ Tu membresía vence pronto - FitHouse Gym",
          content: getDefaultReminderContent(),
        })
      }
    } catch (error) {
      console.error("❌ Error fetching reminder template:", error)
      setReminderTemplate({
        subject: "🏋️ Tu membresía vence pronto - FitHouse Gym",
        content: getDefaultReminderContent(),
      })
    }
  }, [])

  // Guardar template de bienvenida
  const saveWelcomeTemplate = async () => {
    if (savingWelcome || !welcomeTemplate.subject.trim() || !welcomeTemplate.content.trim()) {
      return
    }

    if (!welcomeTemplate.subject.trim() || !welcomeTemplate.content.trim()) {
      toast.error("⚠️ Campos obligatorios", {
        description: "El asunto y contenido son obligatorios",
        duration: 4000,
      })
      return
    }

    try {
      setSavingWelcome(true)

      const payload = {
        subject: welcomeTemplate.subject.trim(),
        content: welcomeTemplate.content.trim(),
      }

      const res = await fetch("/api/config/welcome-template", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success("✅ Template de bienvenida guardado", {
          description: "Los nuevos socios recibirán este mensaje personalizado",
          duration: 4000,
        })
      } else {
        toast.error("❌ Error al guardar template", {
          description: data.error || `Error ${res.status}: ${res.statusText}`,
          duration: 4000,
        })
      }
    } catch (error) {
      console.error("🚨 Error completo:", error)
      toast.error("🚨 Error de conexión", {
        description: `Error: ${error.message}`,
        duration: 4000,
      })
    } finally {
      setSavingWelcome(false)
    }
  }

  // Guardar template de recordatorio
  const saveReminderTemplate = async () => {
    if (savingReminder || !reminderTemplate.subject.trim() || !reminderTemplate.content.trim()) {
      return
    }

    if (!reminderTemplate.subject.trim() || !reminderTemplate.content.trim()) {
      toast.error("⚠️ Campos obligatorios", {
        description: "El asunto y contenido son obligatorios",
        duration: 4000,
      })
      return
    }

    try {
      setSavingReminder(true)

      const payload = {
        subject: reminderTemplate.subject.trim(),
        content: reminderTemplate.content.trim(),
      }

      const res = await fetch("/api/config/reminder-template", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success("✅ Template de recordatorio guardado", {
          description: "Los recordatorios automáticos usarán este mensaje",
          duration: 4000,
        })
      } else {
        toast.error("❌ Error al guardar template", {
          description: data.error || `Error ${res.status}: ${res.statusText}`,
          duration: 4000,
        })
      }
    } catch (error) {
      console.error("🚨 Error guardando template de recordatorio:", error)
      toast.error("🚨 Error de conexión", {
        description: `Error: ${error.message}`,
        duration: 4000,
      })
    } finally {
      setSavingReminder(false)
    }
  }

  // EFECTO PRINCIPAL - OPTIMIZADO PARA EVITAR BUCLES
  useEffect(() => {
    if (open && !initializedRef.current) {
      console.log("🚀 Inicializando modal de emails...")
      initializedRef.current = true

      // Ejecutar todas las cargas iniciales
      Promise.all([
        fetchMemberStats(),
        fetchReminderStatus(),
        fetchWelcomeTemplate(),
        fetchReminderTemplate(),
        updateStats(),
      ])
        .then(() => {
          console.log("✅ Modal de emails inicializado")
          toast.success("📧 Panel de emails abierto", {
            description: "Gestiona el envío de emails a tus socios",
            duration: 2000,
          })
        })
        .catch((error) => {
          console.error("❌ Error inicializando modal:", error)
        })
    }

    // Reset cuando se cierra el modal
    if (!open) {
      initializedRef.current = false
    }
  }, [open, fetchMemberStats, fetchReminderStatus, fetchWelcomeTemplate, fetchReminderTemplate, updateStats]) // Solo depende de 'open'

  // Función para enviar emails
  const sendEmails = async () => {
    if (selectedStatuses.length === 0) {
      toast.error("⚠️ Selecciona al menos un estado", {
        description: "Debes seleccionar a qué socios enviar el email",
        duration: 4000,
      })
      return
    }

    if (!customSubject.trim() || !customContent.trim()) {
      toast.error("⚠️ Completa todos los campos", {
        description: "El asunto y contenido son obligatorios",
        duration: 4000,
      })
      return
    }

    try {
      setIsSending(true)
      setSendingProgress(0)

      toast.loading("📤 Enviando emails...", {
        description: `Enviando a socios con estado: ${selectedStatuses.join(", ")}`,
        duration: 5000,
      })

      // Simular progreso
      const progressInterval = setInterval(() => {
        setSendingProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 500)

      const res = await fetch("/api/emails/send-custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: customSubject,
          content: customContent,
          memberStatuses: selectedStatuses,
        }),
      })

      clearInterval(progressInterval)
      setSendingProgress(100)

      const data = await res.json()

      if (res.ok) {
        toast.success("🎉 Emails enviados exitosamente", {
          description: `${data.emailsSent} emails enviados correctamente`,
          duration: 5000,
        })

        // Limpiar formulario
        setCustomSubject("")
        setCustomContent("")
        setSelectedStatuses(["active"])
      } else {
        toast.error("❌ Error al enviar emails", {
          description: data.error || "Hubo un problema al enviar los emails",
          duration: 5000,
        })
      }
    } catch (error) {
      console.error("Error sending emails:", error)
      toast.error("🚨 Error de conexión", {
        description: "No se pudo enviar los emails. Verifica tu conexión.",
        duration: 5000,
      })
    } finally {
      setIsSending(false)
      setSendingProgress(0)
    }
  }

  // Función para usar un template
  const useTemplate = (template: EmailTemplate) => {
    setCustomSubject(template.subject)
    setCustomContent(template.content)
    setSelectedTemplate(template)

    toast.success("📝 Template aplicado", {
      description: `"${template.name}" cargado correctamente`,
      duration: 3000,
    })
  }

  // Función para guardar template editado
  const saveTemplate = () => {
    if (!editingTemplate) return

    setTemplates((prev) => prev.map((t) => (t.id === editingTemplate.id ? editingTemplate : t)))
    setEditingTemplate(null)

    toast.success("💾 Template guardado", {
      description: "Los cambios se han guardado correctamente",
      duration: 3000,
    })
  }

  const getTotalSelectedMembers = () => {
    return selectedStatuses.reduce((total, status) => {
      return total + (memberStats[status as keyof MemberStats] || 0)
    }, 0)
  }

  // Formatear fecha
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No disponible"
    return new Date(dateString).toLocaleString("es-UY", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleTemplateClick = (template: EmailTemplate) => {
    useTemplate(template)
  }

  // Función para ejecutar verificación manual
  const handleManualCheck = async () => {
    try {
      await manualCheck()
      toast.success("✅ Verificación completada", {
        description: "Se ejecutó la verificación de recordatorios",
        duration: 4000,
      })
    } catch (error) {
      toast.error("❌ Error en verificación", {
        description: "No se pudo ejecutar la verificación",
        duration: 4000,
      })
    }
  }

  // Función para refrescar estadísticas manualmente
  const handleRefreshStats = async () => {
    await fetchMemberStats()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Gestión de Emails
            <Sparkles className="h-4 w-4 text-blue-400" />
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Envía emails personalizados a tus socios y gestiona recordatorios automáticos
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator para envío */}
        {isSending && (
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
              <span className="text-blue-300 text-sm font-medium">Enviando emails...</span>
            </div>
            <Progress value={sendingProgress} className="h-2" />
            <p className="text-xs text-blue-400 mt-1">{sendingProgress}% completado</p>
          </div>
        )}

        <Tabs defaultValue="send" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800">
            <TabsTrigger value="send" className="data-[state=active]:bg-slate-700">
              <Send className="h-4 w-4 mr-2" />
              Enviar Emails
            </TabsTrigger>
            <TabsTrigger value="templates" className="data-[state=active]:bg-slate-700">
              <FileText className="h-4 w-4 mr-2" />
              Plantillas
            </TabsTrigger>
            <TabsTrigger value="welcome" className="data-[state=active]:bg-slate-700">
              <Sparkles className="h-4 w-4 mr-2" />
              Bienvenida
            </TabsTrigger>
            <TabsTrigger value="reminders" className="data-[state=active]:bg-slate-700">
              <Clock className="h-4 w-4 mr-2" />
              Recordatorios
            </TabsTrigger>
          </TabsList>

          {/* Pestaña de Envío de Emails */}
          <TabsContent value="send" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Panel de configuración */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Seleccionar Destinatarios
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Elige a qué socios enviar el email según su estado
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {MEMBER_STATUS_OPTIONS.map((option) => {
                        const Icon = option.icon
                        const count = memberStats[option.value as keyof MemberStats] || 0
                        const isSelected = selectedStatuses.includes(option.value)

                        return (
                          <div
                            key={option.value}
                            className={`p-3 rounded-lg border transition-all cursor-pointer ${
                              isSelected ? "border-blue-500 bg-blue-500/10" : "border-slate-600 hover:border-slate-500"
                            }`}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedStatuses(selectedStatuses.filter((s) => s !== option.value))
                              } else {
                                setSelectedStatuses([...selectedStatuses, option.value])
                              }
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Checkbox checked={isSelected} readOnly />
                                <div className={`p-1.5 rounded ${option.bgColor}`}>
                                  <Icon className={`h-4 w-4 ${option.color}`} />
                                </div>
                                <span className="text-white font-medium">{option.label}</span>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {count}
                              </Badge>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {selectedStatuses.length > 0 && (
                      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-400" />
                          <span className="text-blue-300 font-medium">
                            Total de destinatarios: {getTotalSelectedMembers()} socios
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Contenido del Email
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Edita directamente y ve el resultado final en tiempo real
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="subject" className="text-slate-300">
                        Asunto del email
                      </Label>
                      <Input
                        id="subject"
                        value={customSubject}
                        onChange={(e) => setCustomSubject(e.target.value)}
                        placeholder="Ej: ¡Oferta especial para ti!"
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>

                    <div>
                      <Label className="text-slate-300">Contenido del mensaje</Label>
                      <VisualEditor
                        value={customContent}
                        onChange={setCustomContent}
                        placeholder="Haz clic aquí para escribir tu mensaje..."
                        previewData={previewData}
                        className="mt-2"
                      />
                      <p className="text-xs text-slate-400 mt-2">
                        💡 Puedes usar variables como: {"{{memberName}}"}, {"{{membershipName}}"}, {"{{expiryDate}}"}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            disabled={
                              selectedStatuses.length === 0 ||
                              !customSubject.trim() ||
                              !customContent.trim() ||
                              isSending
                            }
                            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                          >
                            {isSending ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Enviando...
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4 mr-2" />
                                Enviar Emails ({getTotalSelectedMembers()})
                              </>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-slate-800 border-slate-700">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-white flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-orange-400" />
                              ¿Confirmar envío de emails?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-400">
                              <div className="space-y-3">
                                <p>
                                  Estás a punto de enviar un email a <strong>{getTotalSelectedMembers()} socios</strong>{" "}
                                  con los siguientes estados:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {selectedStatuses.map((status) => {
                                    const option = MEMBER_STATUS_OPTIONS.find((o) => o.value === status)
                                    return (
                                      <Badge key={status} variant="secondary">
                                        {option?.label} ({memberStats[status as keyof MemberStats]})
                                      </Badge>
                                    )
                                  })}
                                </div>
                                <p className="text-sm">
                                  <strong>Asunto:</strong> {customSubject}
                                </p>
                                <p className="text-xs text-slate-500">
                                  Esta acción no se puede deshacer. Los emails se enviarán inmediatamente.
                                </p>
                              </div>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                              Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction onClick={sendEmails} className="bg-blue-600 hover:bg-blue-700">
                              <Send className="h-4 w-4 mr-2" />
                              Confirmar Envío
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Panel lateral - Templates rápidos */}
              <div className="space-y-6">
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-400" />
                      Plantillas Rápidas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {templates.slice(0, 3).map((template) => {
                      const handleTemplateClick = (template: EmailTemplate) => {
                        useTemplate(template)
                      }
                      return (
                        <Button
                          key={template.id}
                          onClick={() => handleTemplateClick(template)}
                          variant="outline"
                          className="w-full justify-start border-blue-500/50 text-blue-300 bg-blue-500/10 hover:bg-blue-600 hover:border-blue-600 hover:text-white transition-colors duration-200"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          {template.name}
                        </Button>
                      )
                    })}
                  </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-400" />
                      Estadísticas de Socios
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {loading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-400 mr-2" />
                        <span className="text-slate-300">Cargando estadísticas...</span>
                      </div>
                    ) : memberStats.total === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-slate-400 text-sm mb-2">No se encontraron socios</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleRefreshStats}
                          className="border-blue-500/50 text-blue-300 bg-transparent"
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Recargar
                        </Button>
                      </div>
                    ) : (
                      MEMBER_STATUS_OPTIONS.map((option) => {
                        const Icon = option.icon
                        const count = memberStats[option.value as keyof MemberStats] || 0

                        return (
                          <div key={option.value} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 ${option.color}`} />
                              <span className="text-slate-300">{option.label}</span>
                            </div>
                            <Badge variant="secondary">{count}</Badge>
                          </div>
                        )
                      })
                    )}

                    {!loading && memberStats.total > 0 && (
                      <>
                        <Separator className="bg-slate-600" />
                        <div className="flex items-center justify-between font-medium">
                          <span className="text-white">Total</span>
                          <Badge className="bg-blue-600">{memberStats.total}</Badge>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Pestaña de Templates */}
          <TabsContent value="templates" className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Gestión de Plantillas
                  <Crown className="h-4 w-4 text-yellow-400" />
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Crea y edita plantillas reutilizables para tus emails
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template) => (
                    <Card key={template.id} className="bg-slate-700 border-slate-600">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-white text-sm">{template.name}</CardTitle>
                          <Badge variant="secondary" className="text-xs">
                            {template.type}
                          </Badge>
                        </div>
                        <CardDescription className="text-slate-400 text-xs">{template.subject}</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => useTemplate(template)}
                            className="bg-blue-600 hover:bg-blue-700 text-xs"
                          >
                            Usar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setEditingTemplate({ ...template })}
                            className="bg-yellow-500 text-slate-900 hover:bg-yellow-600 transition-colors duration-200 text-xs"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pestaña de Configuración de Bienvenida */}
          <TabsContent value="welcome" className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-400" />
                  Mensaje de Bienvenida Automático
                  <Badge className="bg-purple-500/20 text-purple-300">Auto-envío</Badge>
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Configura el mensaje que se envía automáticamente cuando se registra un nuevo socio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Estado del sistema */}
                <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    <span className="text-green-300 font-medium">Envío Automático Activo</span>
                  </div>
                  <p className="text-slate-400 text-sm">
                    Este mensaje se envía automáticamente cada vez que se registra un nuevo socio en el sistema.
                  </p>
                </div>

                {/* Panel de Edición */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="welcome-subject" className="text-slate-300 text-base font-medium">
                      Asunto del email
                    </Label>
                    <Input
                      id="welcome-subject"
                      value={welcomeTemplate.subject}
                      onChange={(e) => setWelcomeTemplate((prev) => ({ ...prev, subject: e.target.value }))}
                      placeholder="Ej: ¡Bienvenido a FitHouse Gym! 🏋️"
                      className="bg-slate-700 border-slate-600 text-white mt-2"
                      maxLength={200}
                    />
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-slate-400">Este será el asunto que verán en su bandeja de entrada</p>
                      <p className="text-xs text-slate-400">{welcomeTemplate.subject.length}/200</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-slate-300 text-base font-medium">Contenido del mensaje</Label>
                    <div className="mt-2">
                      <WelcomeMessageEditor
                        value={welcomeTemplate.content}
                        onChange={(content) => setWelcomeTemplate((prev) => ({ ...prev, content }))}
                        previewData={previewData}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-slate-400">
                        💡 Variables: {"{{memberName}}"}, {"{{membershipName}}"}, {"{{joinDate}}"}, {"{{expiryDate}}"},{" "}
                        {"{{price}}"}
                      </p>
                      <p className="text-xs text-slate-400">{welcomeTemplate.content.length}/5000</p>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={saveWelcomeTemplate}
                      disabled={savingWelcome || !welcomeTemplate.subject.trim() || !welcomeTemplate.content.trim()}
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      type="button"
                    >
                      {savingWelcome ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Guardar Template
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Información adicional */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <h4 className="text-blue-300 font-medium mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      ¿Cuándo se envía?
                    </h4>
                    <ul className="text-slate-400 text-sm space-y-1">
                      <li>• Automáticamente al registrar un nuevo socio</li>
                      <li>• Solo si el socio tiene email válido</li>
                      <li>• Se registra en el historial de emails</li>
                      <li>• Incluye datos reales del socio y membresía</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <h4 className="text-green-300 font-medium mb-2 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Consejos de redacción
                    </h4>
                    <ul className="text-slate-400 text-sm space-y-1">
                      <li>• Usa un tono cálido y acogedor</li>
                      <li>• Incluye información práctica</li>
                      <li>• Menciona los beneficios principales</li>
                      <li>• Agrega datos de contacto</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pestaña de Recordatorios */}
          <TabsContent value="reminders" className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-400" />
                  Sistema de Recordatorios Automático
                  <Badge
                    className={
                      reminderStats?.isConfigured ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
                    }
                  >
                    {reminderStats?.isConfigured ? "Activo" : "Inactivo"}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Sistema automático que se ejecuta cada 3 horas para enviar recordatorios de vencimiento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Estado del sistema en tiempo real */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-slate-700 border-slate-600">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="h-4 w-4 text-green-400" />
                        <span className="text-white font-medium text-sm">Estado</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${reminderStats?.isConfigured ? "bg-green-500" : "bg-red-500"}`}
                        />
                        <span className="text-slate-300 text-sm">
                          {reminderStats?.isConfigured ? "Funcionando" : "Desconfigurado"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-700 border-slate-600">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Send className="h-4 w-4 text-blue-400" />
                        <span className="text-white font-medium text-sm">Enviados Hoy</span>
                      </div>
                      <p className="text-slate-300 text-lg font-bold">
                        {reminderLoading ? "..." : reminderStats?.todaysSent || 0}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-700 border-slate-600">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-orange-400" />
                        <span className="text-white font-medium text-sm">Pendientes</span>
                      </div>
                      <p className="text-slate-300 text-lg font-bold">
                        {reminderLoading ? "..." : reminderStats?.pendingReminders || 0}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-700 border-slate-600">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4 text-red-400" />
                        <span className="text-white font-medium text-sm">Blacklist</span>
                      </div>
                      <p className="text-slate-300 text-lg font-bold">
                        {reminderLoading ? "..." : reminderStats?.blacklistedEmails || 0}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Controles del sistema */}
                <div className="p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-orange-300 font-medium mb-1 flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Control del Sistema
                      </h4>
                      <p className="text-slate-400 text-sm">
                        El sistema se ejecuta automáticamente cada 3 horas desde que se inicia la app
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={updateStats}
                        variant="outline"
                        size="sm"
                        disabled={reminderLoading}
                        className="border-blue-500/50 text-blue-300 bg-blue-500/10 hover:bg-blue-600 hover:border-blue-600 hover:text-white"
                      >
                        {reminderLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-1" />
                        )}
                        Actualizar
                      </Button>
                      <Button
                        onClick={handleManualCheck}
                        disabled={reminderLoading}
                        className="bg-orange-600 hover:bg-orange-700"
                        size="sm"
                      >
                        {reminderLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Zap className="h-4 w-4 mr-1" />
                        )}
                        Ejecutar Ahora
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                      <span className="text-slate-300">Ejecución automática cada 3 horas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                      <span className="text-slate-300">Solo 1 email por persona por día</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                      <span className="text-slate-300">Blacklist automática de emails problemáticos</span>
                    </div>
                  </div>
                </div>

                {/* Editor de Template de Recordatorio */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="reminder-subject" className="text-slate-300 text-base font-medium">
                      Asunto del recordatorio
                    </Label>
                    <Input
                      id="reminder-subject"
                      value={reminderTemplate.subject}
                      onChange={(e) => setReminderTemplate((prev) => ({ ...prev, subject: e.target.value }))}
                      placeholder="Ej: 🏋️ Tu membresía vence pronto - FitHouse Gym"
                      className="bg-slate-700 border-slate-600 text-white mt-2"
                      maxLength={200}
                    />
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-slate-400">Asunto que verán los socios con membresías por vencer</p>
                      <p className="text-xs text-slate-400">{reminderTemplate.subject.length}/200</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-slate-300 text-base font-medium">Contenido del recordatorio</Label>
                    <div className="mt-2">
                      <ReminderMessageEditor
                        value={reminderTemplate.content}
                        onChange={(content) => setReminderTemplate((prev) => ({ ...prev, content }))}
                        previewData={previewData}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-slate-400">
                        💡 Variables: {"{{memberName}}"}, {"{{membershipName}}"}, {"{{expiryDate}}"},{" "}
                        {"{{daysUntilExpiry}}"}, {"{{price}}"}
                      </p>
                      <p className="text-xs text-slate-400">{reminderTemplate.content.length}/5000</p>
                    </div>
                  </div>

                  {/* Botones de acción para recordatorio */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={saveReminderTemplate}
                      disabled={savingReminder || !reminderTemplate.subject.trim() || !reminderTemplate.content.trim()}
                      className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      type="button"
                    >
                      {savingReminder ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Guardar Template
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Información del sistema */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                    <h4 className="text-orange-300 font-medium mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Configuración Actual
                    </h4>
                    <ul className="text-slate-400 text-sm space-y-1">
                      <li>• Se ejecuta automáticamente cada 3 horas</li>
                      <li>• Envía recordatorios 3 días antes del vencimiento</li>
                      <li>• Solo a socios con membresías activas</li>
                      <li>• Registra todos los envíos en el historial</li>
                      <li>• Evita envíos duplicados (1 por día máximo)</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <h4 className="text-blue-300 font-medium mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Protecciones Anti-Spam
                    </h4>
                    <ul className="text-slate-400 text-sm space-y-1">
                      <li>• Envío por tandas con pausas inteligentes</li>
                      <li>• Máximo 100 emails por día</li>
                      <li>• Blacklist automática de emails problemáticos</li>
                      <li>• Detección de errores permanentes vs temporales</li>
                      <li>• Logging completo para auditoría</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal de Edición de Template */}
        {editingTemplate && (
          <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
            <DialogContent className="max-w-4xl bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  Editar Template: {editingTemplate.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name" className="text-slate-300">
                    Nombre del template
                  </Label>
                  <Input
                    id="edit-name"
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-subject" className="text-slate-300">
                    Asunto
                  </Label>
                  <Input
                    id="edit-subject"
                    value={editingTemplate.subject}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Contenido</Label>
                  <VisualEditor
                    value={editingTemplate.content}
                    onChange={(content) => setEditingTemplate({ ...editingTemplate, content })}
                    placeholder="Escribe el contenido del template..."
                    previewData={previewData}
                    className="mt-2"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button onClick={() => setEditingTemplate(null)} variant="outline" className="border-slate-600">
                    Cancelar
                  </Button>
                  <Button onClick={saveTemplate} className="bg-green-600 hover:bg-green-700">
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Cambios
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  )
}
