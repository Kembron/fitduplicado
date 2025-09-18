"use client"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Loader2,
  Save,
  User,
  Mail,
  Calendar,
  AlertTriangle,
  Plus,
  UserPlus,
  CreditCard,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Check,
} from "lucide-react"
import { useMembershipEvents } from "@/lib/membership-events"
import { getTodayLocalDate, debugDate } from "@/lib/date-utils"
import { addDaysToToday } from "@/lib/date-utils"

interface Membership {
  id: number
  name: string
  description: string
  price: number
  duration_days: number
}

function NewMemberModalMobile() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMemberships, setLoadingMemberships] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [currentStep, setCurrentStep] = useState(1)
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

  const steps = [
    { id: 1, title: "Información Personal", icon: User },
    { id: 2, title: "Contacto", icon: Mail },
    { id: 3, title: "Membresía", icon: Calendar },
    { id: 4, title: "Confirmación", icon: Check },
  ]

  useEffect(() => {
    if (open) {
      debugDate("NewMemberModal - Modal abierto")
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.body.style.overflow = "unset"
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
    setCurrentStep(1)
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
        if (!value) errors.membership_id = "Selecciona membresía"
        else delete errors.membership_id
        break
      case "payment_method":
        if (!value) errors.payment_method = "Selecciona método"
        else delete errors.payment_method
        break
    }

    setFieldErrors(errors)
  }

  const validateStep = (step: number) => {
    const errors: Record<string, string> = {}

    if (step === 1) {
      if (!formData.name.trim()) errors.name = "Nombre requerido"
    }
    if (step === 3) {
      if (!formData.membership_id) errors.membership_id = "Selecciona membresía"
      if (!formData.payment_method) errors.payment_method = "Selecciona método"

      // Validar precio personalizado
      const price = Number.parseFloat(customPrice)
      if (!customPrice || isNaN(price) || price <= 0) {
        errors.customPrice = "Precio inválido"
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4))
    }
  }

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const getSelectedMembership = () => {
    return memberships.find((m) => m.id === Number.parseInt(formData.membership_id))
  }

  const handleSubmit = async () => {
    if (!validateStep(3)) return

    setLoading(true)
    try {
      const joinDate = getTodayLocalDate()
      const selectedMembership = memberships.find((m) => m.id === Number.parseInt(formData.membership_id))
      const expiryDate = addDaysToToday(selectedMembership?.duration_days || 30)

      // Preparar los datos, convirtiendo campos vacíos a null cuando sea necesario
      const memberData = {
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        document_id: formData.document_id.trim() || null,
        gender: formData.gender || "no_especificado",
        birth_date: formData.birth_date || null, // Convertir cadena vacía a null
        address: formData.address.trim() || null,
        emergency_contact: formData.emergency_contact.trim() || null,
        notes: formData.notes.trim() || null,
        membership_id: Number.parseInt(formData.membership_id),
        status: "active",
        join_date: joinDate,
        expiry_date: expiryDate,
        custom_price: Number.parseFloat(customPrice), // Agregar precio personalizado
      }

      console.log("Sending member data:", memberData) // Para debug

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

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-base font-medium text-slate-200 mb-2 block">
                  Nombre Completo *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className={`h-12 text-base bg-slate-800/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-blue-400/20 ${
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
                  <SelectTrigger className="h-12 text-base bg-slate-800/50 border-slate-600/50 text-white focus:border-blue-400">
                    <SelectValue placeholder="Selecciona género" />
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
                  Fecha de Nacimiento <span className="text-slate-400 text-sm">(opcional)</span>
                </Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => handleInputChange("birth_date", e.target.value)}
                  className="h-12 text-base bg-slate-800/50 border-slate-600/50 text-white focus:border-blue-400 focus:ring-blue-400/20"
                />
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-base font-medium text-slate-200 mb-2 block">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="Ej: juan@email.com"
                  className={`h-12 text-base bg-slate-800/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-blue-400/20 ${
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
                  placeholder="Ej: +598 99 123 456"
                  className={`h-12 text-base bg-slate-800/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-blue-400/20 ${
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

              <div>
                <Label htmlFor="address" className="text-base font-medium text-slate-200 mb-2 block">
                  Dirección
                </Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Ej: Calle 123, Ciudad"
                  rows={3}
                  className="text-base bg-slate-800/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-blue-400/20"
                />
              </div>

              <div>
                <Label htmlFor="emergency_contact" className="text-base font-medium text-slate-200 mb-2 block">
                  Contacto de Emergencia
                </Label>
                <Input
                  id="emergency_contact"
                  value={formData.emergency_contact}
                  onChange={(e) => handleInputChange("emergency_contact", e.target.value)}
                  placeholder="Ej: María Pérez +598 99 876 543"
                  className="h-12 text-base bg-slate-800/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-blue-400/20"
                />
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base font-medium text-slate-200">Tipo de Membresía *</Label>
                  <Button
                    type="button"
                    size="sm"
                    onClick={fetchMemberships}
                    disabled={loadingMemberships}
                    className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {loadingMemberships ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {loadingMemberships ? (
                  <div className="flex items-center justify-center p-6 border border-slate-600/50 rounded-lg bg-slate-800/30">
                    <Loader2 className="h-5 w-5 animate-spin mr-3 text-blue-400" />
                    <span className="text-slate-400">Cargando membresías...</span>
                  </div>
                ) : memberships.length === 0 ? (
                  <div className="p-4 border border-yellow-500/20 rounded-lg bg-yellow-500/10">
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
                            : "border-slate-600/50 bg-slate-800/30 hover:border-slate-500"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-white">{membership.name}</h4>
                            <p className="text-sm text-slate-400">{membership.duration_days} días</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-white">${membership.price.toLocaleString()}</p>
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
                  <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    {fieldErrors.membership_id}
                  </p>
                )}
              </div>

              {/* Precio personalizado */}
              {formData.membership_id && (
                <div>
                  <Label htmlFor="custom_price" className="text-base font-medium text-slate-200 mb-2 block">
                    Precio de la Membresía *
                  </Label>
                  <Input
                    id="custom_price"
                    value={customPrice}
                    onChange={(e) => handleCustomPriceChange(e.target.value)}
                    placeholder="0.00"
                    className={`h-12 text-base bg-slate-800/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-blue-400/20 ${
                      fieldErrors.customPrice ? "border-red-500/50" : ""
                    }`}
                  />
                  {fieldErrors.customPrice && (
                    <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      {fieldErrors.customPrice}
                    </p>
                  )}
                </div>
              )}

              <div>
                <Label className="text-base font-medium text-slate-200 mb-2 block">Método de Pago *</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "efectivo", label: "Efectivo" },
                    { value: "tarjeta", label: "Tarjeta" },
                    { value: "transferencia", label: "Transferencia" },
                    { value: "mercadopago", label: "MercadoPago" },
                  ].map((method) => (
                    <div
                      key={method.value}
                      onClick={() => handleInputChange("payment_method", method.value)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all text-center ${
                        formData.payment_method === method.value
                          ? "border-blue-500 bg-blue-500/10 text-blue-300"
                          : "border-slate-600/50 bg-slate-800/30 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      {method.label}
                    </div>
                  ))}
                </div>
                {fieldErrors.payment_method && (
                  <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    {fieldErrors.payment_method}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="notes" className="text-base font-medium text-slate-200 mb-2 block">
                  Notas Adicionales
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Observaciones médicas, preferencias..."
                  rows={3}
                  className="text-base bg-slate-800/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-blue-400/20"
                />
              </div>
            </div>
          </div>
        )

      case 4:
        const selectedMembership = getSelectedMembership()
        return (
          <div className="space-y-6">
            {success ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">¡Socio Creado!</h3>
                <p className="text-slate-300">{success}</p>
              </div>
            ) : (
              <>
                <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-400" />
                    Información Personal
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-slate-300">
                      <span className="text-slate-400">Nombre:</span> {formData.name}
                    </p>
                    {formData.gender && (
                      <p className="text-slate-300">
                        <span className="text-slate-400">Género:</span> {formData.gender}
                      </p>
                    )}
                    {formData.birth_date && (
                      <p className="text-slate-300">
                        <span className="text-slate-400">Nacimiento:</span> {formData.birth_date}
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Mail className="h-5 w-5 text-blue-400" />
                    Contacto
                  </h3>
                  <div className="space-y-1 text-sm">
                    {formData.email && (
                      <p className="text-slate-300">
                        <span className="text-slate-400">Email:</span> {formData.email}
                      </p>
                    )}
                    {formData.phone && (
                      <p className="text-slate-300">
                        <span className="text-slate-400">Teléfono:</span> {formData.phone}
                      </p>
                    )}
                    {formData.address && (
                      <p className="text-slate-300">
                        <span className="text-slate-400">Dirección:</span> {formData.address}
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-blue-300 flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Membresía y Pago
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-blue-200">
                      <span className="text-blue-300">Membresía:</span> {selectedMembership?.name}
                    </p>
                    <p className="text-blue-200">
                      <span className="text-blue-300">Precio:</span> $
                      {Number.parseFloat(customPrice || "0").toLocaleString()}
                    </p>
                    <p className="text-blue-200">
                      <span className="text-blue-300">Duración:</span> {selectedMembership?.duration_days} días
                    </p>
                    <p className="text-blue-200">
                      <span className="text-blue-300">Método:</span> {formData.payment_method}
                    </p>
                    <p className="text-blue-200">
                      <span className="text-blue-300">Inicio:</span> {getTodayLocalDate()}
                    </p>
                    <p className="text-blue-200">
                      <span className="text-blue-300">Vencimiento:</span>{" "}
                      {addDaysToToday(selectedMembership?.duration_days || 30)}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        )

      default:
        return null
    }
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

      <DialogContent className="p-0 gap-0 max-w-full max-h-full h-full w-full bg-slate-900/95 backdrop-blur-xl border-slate-700/50">
        {/* Header */}
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                className="bg-slate-800/80 border-slate-600/50 text-slate-200 hover:text-white hover:bg-slate-700 hover:border-slate-500 rounded-full p-2 transition-all duration-200 shadow-lg backdrop-blur-sm"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <DialogTitle className="flex items-center gap-2 text-white text-lg">
                <UserPlus className="h-5 w-5 text-blue-400" />
                Nuevo Socio
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    currentStep >= step.id ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-400"
                  }`}
                >
                  {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-2 ${currentStep > step.id ? "bg-blue-500" : "bg-slate-700"}`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2">
            <p className="text-sm text-slate-400 text-center">{steps.find((s) => s.id === currentStep)?.title}</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4">
          {error && (
            <Alert variant="destructive" className="mb-4 bg-red-500/10 border-red-500/20">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-300">{error}</AlertDescription>
            </Alert>
          )}

          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="p-4 pt-4 pb-6 border-t border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex gap-3 mb-4">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={loading}
                className="flex-1 bg-transparent border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white h-12 rounded-xl transition-all duration-200"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>
            )}

            {currentStep < 4 ? (
              <Button
                onClick={nextStep}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white h-12 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading || success}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white h-12 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : success ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Completado
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Crear Socio
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Safe area for mobile */}
          <div className="h-2" />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default NewMemberModalMobile
