"use client"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Loader2,
  Save,
  User,
  Mail,
  AlertTriangle,
  Plus,
  UserPlus,
  CreditCard,
  RefreshCw,
  Check,
  FileText,
  ArrowLeft,
} from "lucide-react"
import { useMembershipEvents } from "@/lib/membership-events"
import { getTodayLocalDate, addDaysToToday, debugDate } from "@/lib/date-utils"

interface Membership {
  id: number
  name: string
  description: string
  price: number
  duration_days: number
}

function NewMemberModalDesktop() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMemberships, setLoadingMemberships] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [customPrice, setCustomPrice] = useState("")
  const membershipEvents = useMembershipEvents()

  // Form data
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    document_id: "",
    birth_date: "",
    address: "",
    emergency_contact: "",
    notes: "",
    membership_id: "",
    payment_method: "efectivo",
    gender: "",
  })

  useEffect(() => {
    if (open) {
      debugDate("NewMemberModalDesktop - Modal abierto")
    }
  }, [open])

  const fetchMemberships = useCallback(async () => {
    try {
      setLoadingMemberships(true)
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/memberships?t=${timestamp}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      })

      if (response.ok) {
        const data = await response.json()
        const activeMemberships = data
          .filter((m: any) => m.is_active === true)
          .sort((a: any, b: any) => a.price - b.price)
        setMemberships(activeMemberships)
      } else {
        setError("Error al cargar las membresías")
      }
    } catch (error) {
      setError("Error de conexión al cargar membresías")
    } finally {
      setLoadingMemberships(false)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = membershipEvents.subscribe((event) => {
      if (["created", "updated", "deleted", "status_changed"].includes(event.type)) {
        fetchMemberships()
      }
    })
    return unsubscribe
  }, [fetchMemberships, membershipEvents])

  useEffect(() => {
    fetchMemberships()
  }, [fetchMemberships])

  // Actualizar precio personalizado cuando cambia la membresía
  useEffect(() => {
    if (formData.membership_id) {
      const selectedMembership = memberships.find((m) => m.id === Number.parseInt(formData.membership_id))
      if (selectedMembership) {
        setCustomPrice(selectedMembership.price.toString())
      }
    }
  }, [formData.membership_id, memberships])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    validateField(field, value)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      document_id: "",
      birth_date: "",
      address: "",
      emergency_contact: "",
      notes: "",
      membership_id: "",
      payment_method: "efectivo",
      gender: "",
    })
    setError("")
    setSuccess("")
    setFieldErrors({})
    setCustomPrice("")
  }

  const validateField = (field: string, value: string) => {
    const errors = { ...fieldErrors }

    switch (field) {
      case "name":
        if (!value.trim()) errors.name = "Nombre requerido"
        else if (value.trim().length < 2) errors.name = "Mínimo 2 caracteres"
        else delete errors.name
        break
      case "email":
        if (value && !value.includes("@")) errors.email = "Email inválido"
        else delete errors.email
        break
      case "phone":
        if (value && value.length < 8) errors.phone = "Mínimo 8 dígitos"
        else delete errors.phone
        break
      case "membership_id":
        if (!value) errors.membership_id = "Selecciona una membresía"
        else delete errors.membership_id
        break
      case "payment_method":
        if (!value) errors.payment_method = "Selecciona un método de pago"
        else delete errors.payment_method
        break
    }

    setFieldErrors(errors)
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.name.trim()) errors.name = "Nombre requerido"
    if (!formData.membership_id) errors.membership_id = "Selecciona una membresía"
    if (!formData.payment_method) errors.payment_method = "Selecciona un método de pago"
    if (formData.email && !formData.email.includes("@")) errors.email = "Email inválido"
    if (formData.phone && formData.phone.length < 8) errors.phone = "Mínimo 8 dígitos"

    // Validar precio personalizado
    const price = Number.parseFloat(customPrice)
    if (!customPrice || isNaN(price) || price <= 0) {
      errors.customPrice = "Precio inválido"
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      const joinDate = getTodayLocalDate()
      const selectedMembership = memberships.find((m) => m.id === Number.parseInt(formData.membership_id))
      const expiryDate = addDaysToToday(selectedMembership?.duration_days || 30)

      const memberData = {
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        document_id: formData.document_id.trim() || null,
        gender: formData.gender || "no_especificado",
        birth_date: formData.birth_date || null,
        address: formData.address.trim() || null,
        emergency_contact: formData.emergency_contact.trim() || null,
        notes: formData.notes.trim() || null,
        membership_id: Number.parseInt(formData.membership_id),
        status: "active",
        join_date: joinDate,
        expiry_date: expiryDate,
        custom_price: Number.parseFloat(customPrice), // Agregar precio personalizado
      }

      const response = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(memberData),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(`¡Socio creado exitosamente! ${data.message}`)
        setTimeout(() => {
          setOpen(false)
          resetForm()
          window.location.reload()
        }, 2000)
      } else {
        setError(data.error || "Error al crear el socio")
      }
    } catch (error) {
      console.error("Error creating member:", error)
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  const handleCustomPriceChange = (value: string) => {
    // Solo permitir números y punto decimal
    const cleanValue = value.replace(/[^0-9.]/g, "")
    setCustomPrice(cleanValue)

    // Validar en tiempo real
    const price = Number.parseFloat(cleanValue)
    const errors = { ...fieldErrors }
    if (!cleanValue || isNaN(price) || price <= 0) {
      errors.customPrice = "Precio inválido"
    } else {
      delete errors.customPrice
    }
    setFieldErrors(errors)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="bg-gradient-to-r from-blue-500 via-sky-500 to-cyan-500 hover:from-blue-600 hover:via-sky-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          onClick={resetForm}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Socio
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-6xl max-h-[95vh] h-[95vh] p-0 gap-0 bg-slate-900/95 backdrop-blur-xl border-slate-700/50 rounded-xl shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-8 pb-6 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white">Agregar Nuevo Socio</DialogTitle>
                <p className="text-slate-400 mt-1">Complete la información del nuevo miembro</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg p-2"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Volver
            </Button>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {error && (
            <Alert variant="destructive" className="mb-6 bg-red-500/10 border-red-500/20">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-300">{error}</AlertDescription>
            </Alert>
          )}

          {success ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                <Check className="h-10 w-10 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">¡Socio Creado Exitosamente!</h3>
              <p className="text-slate-300 text-center max-w-md">{success}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Personal Info */}
              <div className="lg:col-span-2 space-y-8">
                {/* Personal Information */}
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-white">
                      <User className="h-5 w-5 text-blue-400" />
                      Información Personal
                    </CardTitle>
                    <CardDescription className="text-slate-400">Datos básicos del nuevo socio</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <Label htmlFor="name" className="text-base font-medium text-slate-200 mb-2 block">
                          Nombre Completo *
                        </Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                          placeholder="Ej: Juan Pérez González"
                          className={`h-11 text-base bg-slate-700/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-blue-400/20 ${
                            fieldErrors.name ? "border-red-500/50" : ""
                          }`}
                        />
                        {fieldErrors.name && (
                          <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" />
                            {fieldErrors.name}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="gender" className="text-base font-medium text-slate-200 mb-2 block">
                          Género
                        </Label>
                        <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                          <SelectTrigger className="h-11 text-base bg-slate-700/50 border-slate-600/50 text-white focus:border-blue-400">
                            <SelectValue placeholder="Seleccionar género" />
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

                      <div>
                        <Label htmlFor="birth_date" className="text-base font-medium text-slate-200 mb-2 block">
                          Fecha de Nacimiento
                        </Label>
                        <Input
                          id="birth_date"
                          type="date"
                          value={formData.birth_date}
                          onChange={(e) => handleInputChange("birth_date", e.target.value)}
                          className="h-11 text-base bg-slate-700/50 border-slate-600/50 text-white focus:border-blue-400 focus:ring-blue-400/20"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Information */}
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Mail className="h-5 w-5 text-green-400" />
                      Información de Contacto
                    </CardTitle>
                    <CardDescription className="text-slate-400">Datos de contacto y ubicación</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="email" className="text-base font-medium text-slate-200 mb-2 block">
                          Email
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          placeholder="juan@ejemplo.com"
                          className={`h-11 text-base bg-slate-700/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-blue-400/20 ${
                            fieldErrors.email ? "border-red-500/50" : ""
                          }`}
                        />
                        {fieldErrors.email && (
                          <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" />
                            {fieldErrors.email}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="phone" className="text-base font-medium text-slate-200 mb-2 block">
                          Teléfono
                        </Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => handleInputChange("phone", e.target.value)}
                          placeholder="+598 99 123 456"
                          className={`h-11 text-base bg-slate-700/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-blue-400/20 ${
                            fieldErrors.phone ? "border-red-500/50" : ""
                          }`}
                        />
                        {fieldErrors.phone && (
                          <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" />
                            {fieldErrors.phone}
                          </p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor="address" className="text-base font-medium text-slate-200 mb-2 block">
                          Dirección
                        </Label>
                        <Textarea
                          id="address"
                          value={formData.address}
                          onChange={(e) => handleInputChange("address", e.target.value)}
                          placeholder="Calle, número, barrio, ciudad..."
                          rows={3}
                          className="text-base bg-slate-700/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-blue-400/20"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor="emergency_contact" className="text-base font-medium text-slate-200 mb-2 block">
                          Contacto de Emergencia
                        </Label>
                        <Input
                          id="emergency_contact"
                          value={formData.emergency_contact}
                          onChange={(e) => handleInputChange("emergency_contact", e.target.value)}
                          placeholder="Nombre y teléfono de contacto de emergencia"
                          className="h-11 text-base bg-slate-700/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-blue-400/20"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Additional Notes */}
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-white">
                      <FileText className="h-5 w-5 text-purple-400" />
                      Notas Adicionales
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Observaciones médicas, preferencias, etc.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => handleInputChange("notes", e.target.value)}
                      placeholder="Observaciones médicas, alergias, preferencias de entrenamiento..."
                      rows={4}
                      className="text-base bg-slate-700/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-blue-400/20"
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Membership & Payment */}
              <div className="space-y-8">
                {/* Membership Selection */}
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-white">
                          <CreditCard className="h-5 w-5 text-yellow-400" />
                          Membresía
                        </CardTitle>
                        <CardDescription className="text-slate-400">Selecciona el tipo de membresía</CardDescription>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={fetchMemberships}
                        disabled={loadingMemberships}
                        className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {loadingMemberships ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {loadingMemberships ? (
                      <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-6 w-6 animate-spin mr-3 text-blue-400" />
                        <span className="text-slate-400">Cargando membresías...</span>
                      </div>
                    ) : memberships.length === 0 ? (
                      <div className="p-6 border border-yellow-500/20 rounded-lg bg-yellow-500/10">
                        <p className="text-yellow-300 text-center">No hay membresías disponibles</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {memberships.map((membership) => (
                          <div
                            key={membership.id}
                            onClick={() => handleInputChange("membership_id", membership.id.toString())}
                            className={`p-4 rounded-lg border cursor-pointer transition-all ${
                              formData.membership_id === membership.id.toString()
                                ? "border-blue-500 bg-blue-500/10"
                                : "border-slate-600/50 bg-slate-700/30 hover:border-slate-500"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold text-white">{membership.name}</h4>
                                <p className="text-sm text-slate-400">{membership.duration_days} días</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-lg text-white">${membership.price.toLocaleString()}</p>
                                {formData.membership_id === membership.id.toString() && (
                                  <Check className="h-5 w-5 text-blue-400 ml-auto mt-1" />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {fieldErrors.membership_id && (
                      <p className="text-red-400 text-sm flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        {fieldErrors.membership_id}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Payment Method */}
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-white">
                      <CreditCard className="h-5 w-5 text-green-400" />
                      Método de Pago
                    </CardTitle>
                    <CardDescription className="text-slate-400">Selecciona cómo pagará la membresía</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: "efectivo", label: "Efectivo", icon: "💵" },
                        { value: "tarjeta", label: "Tarjeta", icon: "💳" },
                        { value: "transferencia", label: "Transferencia", icon: "🏦" },
                        { value: "mercadopago", label: "MercadoPago", icon: "📱" },
                      ].map((method) => (
                        <div
                          key={method.value}
                          onClick={() => handleInputChange("payment_method", method.value)}
                          className={`p-4 rounded-lg border cursor-pointer transition-all text-center ${
                            formData.payment_method === method.value
                              ? "border-blue-500 bg-blue-500/10 text-blue-300"
                              : "border-slate-600/50 bg-slate-700/30 text-slate-300 hover:border-slate-500"
                          }`}
                        >
                          <div className="text-2xl mb-2">{method.icon}</div>
                          <div className="font-medium">{method.label}</div>
                        </div>
                      ))}
                    </div>
                    {fieldErrors.payment_method && (
                      <p className="text-red-400 text-sm mt-3 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        {fieldErrors.payment_method}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Summary */}
                {formData.membership_id && (
                  <Card className="bg-slate-800/50 border-slate-700/50">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-white">
                        <FileText className="h-5 w-5 text-blue-400" />
                        Resumen
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      {(() => {
                        const selectedMembership = memberships.find(
                          (m) => m.id === Number.parseInt(formData.membership_id),
                        )
                        return (
                          <>
                            <div className="flex justify-between">
                              <span className="text-slate-300">Membresía:</span>
                              <span className="text-white font-medium">{selectedMembership?.name}</span>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="custom_price" className="text-slate-300">
                                Precio:
                              </Label>
                              <Input
                                id="custom_price"
                                value={customPrice}
                                onChange={(e) => handleCustomPriceChange(e.target.value)}
                                placeholder="0.00"
                                className={`h-10 text-base bg-slate-700/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-blue-400/20 ${
                                  fieldErrors.customPrice ? "border-red-500/50" : ""
                                }`}
                              />
                              {fieldErrors.customPrice && (
                                <p className="text-red-400 text-xs flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  {fieldErrors.customPrice}
                                </p>
                              )}
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-300">Duración:</span>
                              <span className="text-white">{selectedMembership?.duration_days} días</span>
                            </div>
                            <Separator className="bg-slate-600/30" />
                            <div className="flex justify-between">
                              <span className="text-slate-300">Inicio:</span>
                              <span className="text-white">{getTodayLocalDate()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-300">Vencimiento:</span>
                              <span className="text-white">
                                {addDaysToToday(selectedMembership?.duration_days || 30)}
                              </span>
                            </div>
                          </>
                        )
                      })()}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="p-8 pt-6 border-t border-slate-700/50 bg-slate-900/50">
            <div className="flex gap-4 justify-end">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="px-8 bg-transparent border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  loading ||
                  !formData.name.trim() ||
                  !formData.membership_id ||
                  !formData.payment_method ||
                  !customPrice
                }
                className="px-8 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando Socio...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Crear Socio
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default NewMemberModalDesktop
