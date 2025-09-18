"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Loader2, Save, User, Mail, Calendar, AlertTriangle, Edit, Phone, MapPin, Shield } from "lucide-react"

interface Membership {
  id: number
  name: string
  description: string
  price: number
  duration_days: number
}

interface Member {
  id: number
  name: string
  email: string
  phone: string
  document_id: string
  gender: string
  birth_date: string
  address: string
  emergency_contact: string
  notes: string
  membership_id: number
  membership_name: string
  monthly_fee: number
  status: string
  expiry_date: string
  join_date: string
  last_payment_date: string | null
  inactive_since: string | null
  auto_suspended: boolean
}

interface EditMemberModalProps {
  member: Member | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onMemberUpdated?: () => void
}

export default function EditMemberModal({ member, open, onOpenChange, onMemberUpdated }: EditMemberModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  // Form data
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    document_id: "",
    gender: "", // Agregar esta línea
    birth_date: "",
    address: "",
    emergency_contact: "",
    notes: "",
    membership_id: "",
    status: "",
  })

  // Cargar membresías disponibles
  useEffect(() => {
    async function fetchMemberships() {
      try {
        const response = await fetch("/api/memberships")
        if (response.ok) {
          const data = await response.json()
          setMemberships(data)
        }
      } catch (error) {
        console.error("Error fetching memberships:", error)
      }
    }
    fetchMemberships()
  }, [])

  // Cargar datos del socio cuando se abre el modal
  useEffect(() => {
    if (member && open) {
      setFormData({
        name: member.name || "",
        email: member.email || "",
        phone: member.phone || "",
        document_id: member.document_id || "",
        gender: member.gender || "", // Agregar esta línea
        birth_date: member.birth_date || "",
        address: member.address || "",
        emergency_contact: member.emergency_contact || "",
        notes: member.notes || "",
        membership_id: member.membership_id?.toString() || "",
        status: member.status || "",
      })
      setError("")
      setSuccess("")
      setFieldErrors({})
      setHasChanges(false)
    }
  }, [member, open])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))

    // Marcar que hay cambios
    setHasChanges(true)

    // Validar campo en tiempo real
    validateField(field, value)
  }

  const validateField = (field: string, value: string) => {
    const errors = { ...fieldErrors }

    switch (field) {
      case "name":
        if (!value.trim()) {
          errors.name = "El nombre es obligatorio"
        } else if (value.trim().length < 2) {
          errors.name = "Mínimo 2 caracteres"
        } else {
          delete errors.name
        }
        break
      case "email":
        if (value && !value.includes("@")) {
          errors.email = "Formato de email inválido"
        } else {
          delete errors.email
        }
        break
      case "phone":
        if (value && value.length < 8) {
          errors.phone = "Mínimo 8 dígitos"
        } else {
          delete errors.phone
        }
        break
      case "membership_id":
        if (!value) {
          errors.membership_id = "Selecciona una membresía"
        } else {
          delete errors.membership_id
        }
        break
    }

    setFieldErrors(errors)
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}

    // Validar nombre
    if (!formData.name.trim()) {
      errors.name = "El nombre es obligatorio"
    } else if (formData.name.trim().length < 2) {
      errors.name = "El nombre debe tener al menos 2 caracteres"
    }

    // Validar email si se proporciona
    if (formData.email && !formData.email.includes("@")) {
      errors.email = "El formato del email no es válido"
    }

    // Validar teléfono si se proporciona
    if (formData.phone && formData.phone.length < 8) {
      errors.phone = "El teléfono debe tener al menos 8 dígitos"
    }

    // Validar membresía
    if (!formData.membership_id) {
      errors.membership_id = "Debe seleccionar un tipo de membresía"
    }

    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      setError(`Faltan campos obligatorios: ${Object.values(errors).join(", ")}`)
      return false
    }

    return true
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Activo</Badge>
      case "expired":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Vencido</Badge>
      case "suspended":
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Suspendido</Badge>
      case "inactive":
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Inactivo</Badge>
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">Desconocido</Badge>
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!validateForm()) {
      return
    }

    if (!member) {
      setError("No se pudo identificar el socio a editar")
      return
    }

    setLoading(true)

    try {
      // Preparar datos para enviar
      const updateData = {
        ...formData,
        membership_id: Number.parseInt(formData.membership_id),
      }

      const response = await fetch(`/api/members/${member.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("¡Información del socio actualizada exitosamente!")
        setHasChanges(false)

        // Llamar callback para actualizar la lista
        if (onMemberUpdated) {
          onMemberUpdated()
        }

        setTimeout(() => {
          onOpenChange(false)
        }, 2000)
      } else {
        setError(data.error || "Error al actualizar la información del socio")
      }
    } catch (error) {
      console.error("Error updating member:", error)
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (hasChanges) {
      const confirmClose = window.confirm(
        "Tienes cambios sin guardar. ¿Estás seguro de que quieres cerrar sin guardar?",
      )
      if (!confirmClose) return
    }
    onOpenChange(false)
  }

  if (!member) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-white text-xl">
            <Edit className="h-6 w-6 text-yellow-400" />
            <span>Editar Información del Socio</span>
          </DialogTitle>
          <div className="flex items-center space-x-4 mt-2">
            <div className="text-sm text-slate-400">
              Socio desde: {new Date(member.join_date).toLocaleDateString("es-ES")}
            </div>
            <div className="text-sm text-slate-400">•</div>
            <div className="text-sm text-slate-400">Estado actual:</div>
            {getStatusBadge(member.status)}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {error && (
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 backdrop-blur-sm">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-300">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-500/10 border-green-500/20 backdrop-blur-sm">
              <AlertDescription className="text-green-300">{success}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información Personal */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <User className="h-5 w-5 text-yellow-400" />
                <h3 className="text-lg font-semibold text-white">Información Personal</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-300 flex items-center space-x-1">
                  <span>Nombre Completo *</span>
                  {fieldErrors.name && <span className="text-red-400 text-xs">⚠️</span>}
                  {!fieldErrors.name && formData.name && <span className="text-green-400 text-xs">✓</span>}
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Juan Pérez"
                  className={`bg-slate-800/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-yellow-400 focus:ring-yellow-400/20 ${
                    fieldErrors.name ? "border-red-500/50 focus:border-red-400" : ""
                  } ${!fieldErrors.name && formData.name ? "border-green-500/50" : ""}`}
                  required
                />
                {fieldErrors.name && (
                  <div className="text-red-400 text-xs flex items-center space-x-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span>{fieldErrors.name}</span>
                  </div>
                )}
              </div>

              

              <div className="space-y-2">
                <Label htmlFor="gender" className="text-slate-300">
                  Género
                </Label>
                <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-600/50 text-white focus:border-yellow-400 focus:ring-yellow-400/20">
                    <SelectValue placeholder="Selecciona el género" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="masculino" className="text-white hover:bg-slate-700">
                      Masculino
                    </SelectItem>
                    <SelectItem value="femenino" className="text-white hover:bg-slate-700">
                      Femenino
                    </SelectItem>
                    <SelectItem value="no_especificado" className="text-white hover:bg-slate-700">
                      Prefiero no especificar
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="birth_date" className="text-slate-300">
                  Fecha de Nacimiento
                </Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => handleInputChange("birth_date", e.target.value)}
                  className="bg-slate-800/50 border-slate-600/50 text-white focus:border-yellow-400 focus:ring-yellow-400/20"
                />
              </div>
            </div>

            {/* Información de Contacto */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Mail className="h-5 w-5 text-yellow-400" />
                <h3 className="text-lg font-semibold text-white">Información de Contacto</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300 flex items-center space-x-1">
                  <span>Email</span>
                  {fieldErrors.email && <span className="text-red-400 text-xs">⚠️</span>}
                  {!fieldErrors.email && formData.email && <span className="text-green-400 text-xs">✓</span>}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="juan@email.com"
                  className={`bg-slate-800/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-yellow-400 focus:ring-yellow-400/20 ${
                    fieldErrors.email ? "border-red-500/50 focus:border-red-400" : ""
                  } ${!fieldErrors.email && formData.email ? "border-green-500/50" : ""}`}
                />
                {fieldErrors.email && (
                  <div className="text-red-400 text-xs flex items-center space-x-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span>{fieldErrors.email}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-300 flex items-center space-x-1">
                  <span>Teléfono</span>
                  {fieldErrors.phone && <span className="text-red-400 text-xs">⚠️</span>}
                  {!fieldErrors.phone && formData.phone && <span className="text-green-400 text-xs">✓</span>}
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="+54 11 1234-5678"
                  className={`bg-slate-800/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-yellow-400 focus:ring-yellow-400/20 ${
                    fieldErrors.phone ? "border-red-500/50 focus:border-red-400" : ""
                  } ${!fieldErrors.phone && formData.phone ? "border-green-500/50" : ""}`}
                />
                {fieldErrors.phone && (
                  <div className="text-red-400 text-xs flex items-center space-x-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span>{fieldErrors.phone}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-slate-300">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Dirección
                </Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Calle 123, Ciudad"
                  rows={3}
                  className="bg-slate-800/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-yellow-400 focus:ring-yellow-400/20"
                />
              </div>
            </div>
          </div>

          {/* Membresía */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <Calendar className="h-5 w-5 text-yellow-400" />
              <h3 className="text-lg font-semibold text-white">Membresía</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="membership" className="text-slate-300 flex items-center space-x-1">
                  <span>Tipo de Membresía *</span>
                  {fieldErrors.membership_id && <span className="text-red-400 text-xs">⚠️</span>}
                  {!fieldErrors.membership_id && formData.membership_id && (
                    <span className="text-green-400 text-xs">✓</span>
                  )}
                </Label>
                <Select
                  value={formData.membership_id}
                  onValueChange={(value) => handleInputChange("membership_id", value)}
                >
                  <SelectTrigger
                    className={`bg-slate-800/50 border-slate-600/50 text-white focus:border-yellow-400 focus:ring-yellow-400/20 ${
                      fieldErrors.membership_id ? "border-red-500/50 focus:border-red-400" : ""
                    } ${!fieldErrors.membership_id && formData.membership_id ? "border-green-500/50" : ""}`}
                  >
                    <SelectValue placeholder="Selecciona una membresía" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    {memberships.map((membership) => (
                      <SelectItem
                        key={membership.id}
                        value={membership.id.toString()}
                        className="text-white hover:bg-slate-700"
                      >
                        <div className="flex justify-between items-center w-full">
                          <span>{membership.name}</span>
                          <span className="text-sm text-slate-400 ml-4">
                            ${membership.price.toLocaleString()} - {membership.duration_days} días
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.membership_id && (
                  <div className="text-red-400 text-xs flex items-center space-x-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span>{fieldErrors.membership_id}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="text-slate-300">
                  Estado del Socio
                </Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-600/50 text-white focus:border-yellow-400 focus:ring-yellow-400/20">
                    <SelectValue placeholder="Selecciona un estado" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="active" className="text-white hover:bg-slate-700">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span>Activo</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="expired" className="text-white hover:bg-slate-700">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                        <span>Vencido</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="suspended" className="text-white hover:bg-slate-700">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                        <span>Suspendido</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="inactive" className="text-white hover:bg-slate-700">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span>Inactivo</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Información Adicional */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <Shield className="h-5 w-5 text-yellow-400" />
              <h3 className="text-lg font-semibold text-white">Información Adicional</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergency_contact" className="text-slate-300">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Contacto de Emergencia
                </Label>
                <Input
                  id="emergency_contact"
                  value={formData.emergency_contact}
                  onChange={(e) => handleInputChange("emergency_contact", e.target.value)}
                  placeholder="María Pérez +54 11 8765-4321"
                  className="bg-slate-800/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-yellow-400 focus:ring-yellow-400/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-slate-300">
                  Notas y Observaciones
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Observaciones médicas, preferencias, comentarios..."
                  rows={3}
                  className="bg-slate-800/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-yellow-400 focus:ring-yellow-400/20"
                />
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-slate-700/50">
            <Button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="bg-transparent border border-red-600 text-red-500 hover:bg-red-600 hover:text-white"
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              disabled={loading || Object.keys(fieldErrors).length > 0 || !hasChanges}
              className="bg-green-600 hover:bg-green-700 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              {loading
                ? "Guardando cambios..."
                : Object.keys(fieldErrors).length > 0
                  ? "Corrige los errores"
                  : !hasChanges
                    ? "Sin cambios"
                    : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
