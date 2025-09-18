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
import { Loader2, Save, CreditCard, User, Calendar, AlertTriangle, DollarSign, CheckCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface Member {
  id: number
  name: string
  email: string
  document_id: string
  membership_name: string
  membership_id: number
  status: string
  expiry_date: string
  monthly_fee: number
}

interface Membership {
  id: number
  name: string
  description: string
  price: number
  duration_days: number
}

interface QuickPaymentModalProps {
  member: Member | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onPaymentSuccess?: () => void
}

export default function QuickPaymentModal({ member, open, onOpenChange, onPaymentSuccess }: QuickPaymentModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [memberships, setMemberships] = useState<Membership[]>([])

  // Form data
  const [formData, setFormData] = useState({
    membership_id: "",
    amount: "",
    payment_method: "",
    description: "",
    payment_date: new Date().toISOString().split("T")[0],
  })

  // Cargar membresías y precargar datos del socio
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

  // Precargar datos cuando se selecciona un socio
  useEffect(() => {
    if (member && open) {
      const memberMembership = memberships.find((m) => m.id === member.membership_id)
      setFormData({
        membership_id: member.membership_id.toString(),
        amount: member.monthly_fee?.toString() || memberMembership?.price.toString() || "",
        payment_method: "",
        description: `Pago de membresía ${member.membership_name}`,
        payment_date: new Date().toISOString().split("T")[0],
      })
      setError("")
      setSuccess("")
      setFieldErrors({})
    }
  }, [member, open, memberships])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))

    // Si se selecciona una membresía, actualizar el monto
    if (field === "membership_id" && value) {
      const membership = memberships.find((m) => m.id === Number.parseInt(value))
      if (membership) {
        setFormData((prev) => ({
          ...prev,
          amount: membership.price.toString(),
        }))
      }
    }

    // Validar campo en tiempo real
    validateField(field, value)
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}

    // Validar membresía
    if (!formData.membership_id) {
      errors.membership_id = "Debe seleccionar una membresía"
    }

    // Validar monto
    if (!formData.amount) {
      errors.amount = "El monto es obligatorio"
    } else if (Number.parseFloat(formData.amount) <= 0) {
      errors.amount = "El monto debe ser mayor a 0"
    }

    // Validar método de pago
    if (!formData.payment_method) {
      errors.payment_method = "Debe seleccionar un método de pago"
    }

    // Validar fecha
    if (!formData.payment_date) {
      errors.payment_date = "La fecha es obligatoria"
    }

    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      setError(`Faltan campos obligatorios: ${Object.values(errors).join(", ")}`)
      return false
    }

    return true
  }

  const validateField = (field: string, value: string) => {
    const errors = { ...fieldErrors }

    switch (field) {
      case "membership_id":
        if (!value) {
          errors.membership_id = "Selecciona una membresía"
        } else {
          delete errors.membership_id
        }
        break
      case "amount":
        if (!value) {
          errors.amount = "Ingresa el monto"
        } else if (Number.parseFloat(value) <= 0) {
          errors.amount = "Monto inválido"
        } else {
          delete errors.amount
        }
        break
      case "payment_method":
        if (!value) {
          errors.payment_method = "Selecciona método de pago"
        } else {
          delete errors.payment_method
        }
        break
    }

    setFieldErrors(errors)
  }

  const getStatusInfo = () => {
    if (!member) return null

    const today = new Date()
    const expiryDate = new Date(member.expiry_date)
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    switch (member.status) {
      case "active":
        return {
          icon: <CheckCircle className="h-4 w-4 text-green-400" />,
          text: `Activo - Vence en ${daysUntilExpiry} días`,
          color: "text-green-400",
        }
      case "expired":
        return {
          icon: <AlertTriangle className="h-4 w-4 text-red-400" />,
          text: `Vencido hace ${Math.abs(daysUntilExpiry)} días`,
          color: "text-red-400",
        }
      case "pending":
        return {
          icon: <Clock className="h-4 w-4 text-yellow-400" />,
          text: `Próximo a vencer - ${daysUntilExpiry} días`,
          color: "text-yellow-400",
        }
      default:
        return {
          icon: <AlertTriangle className="h-4 w-4 text-orange-400" />,
          text: "Estado inactivo",
          color: "text-orange-400",
        }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!member || !validateForm()) {
      return
    }

    setLoading(true)

    try {
      // Calcular fechas de inicio y fin de la membresía
      const selectedMembership = memberships.find((m) => m.id === Number.parseInt(formData.membership_id))
      const startDate = new Date(formData.payment_date)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + (selectedMembership?.duration_days || 30))

      const paymentData = {
        member_id: member.id,
        membership_id: Number.parseInt(formData.membership_id),
        amount: Number.parseFloat(formData.amount),
        payment_method: formData.payment_method,
        description: formData.description || `Pago de membresía ${selectedMembership?.name}`,
        payment_date: formData.payment_date,
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
      }

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentData),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("¡Pago registrado exitosamente!")
        setTimeout(() => {
          onOpenChange(false)
          onPaymentSuccess?.()
        }, 2000)
      } else {
        setError(data.error || "Error al registrar el pago")
      }
    } catch (error) {
      console.error("Error creating payment:", error)
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-white text-xl">
            <CreditCard className="h-6 w-6 text-green-400" />
            <span>Registrar Pago Rápido</span>
          </DialogTitle>
        </DialogHeader>

        {member && (
          <div className="bg-slate-900/50 rounded-lg p-4 space-y-3 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-blue-400" />
                <div>
                  <div className="font-medium text-white">{member.name}</div>
                  <div className="text-sm text-slate-400">{member.document_id}</div>
                </div>
              </div>
              {statusInfo && (
                <div className={`flex items-center space-x-2 ${statusInfo.color}`}>
                  {statusInfo.icon}
                  <span className="text-sm font-medium">{statusInfo.text}</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Email:</span>
                <div className="text-white">{member.email || "No registrado"}</div>
              </div>
              <div>
                <span className="text-slate-400">Membresía actual:</span>
                <div className="text-white">{member.membership_name}</div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 backdrop-blur-sm">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-300">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-500/10 border-green-500/20 backdrop-blur-sm">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-green-300">{success}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información del Pago */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <DollarSign className="h-5 w-5 text-green-400" />
                <h3 className="text-lg font-semibold text-white">Información del Pago</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="membership" className="text-slate-300 flex items-center space-x-1">
                  <span>Membresía *</span>
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
                    className={cn(
                      "bg-slate-800/50 border-slate-600/50 text-white focus:border-green-400 focus:ring-green-400/20",
                      fieldErrors.membership_id ? "border-red-500/50 focus:border-red-400" : "",
                      !fieldErrors.membership_id && formData.membership_id ? "border-green-500/50" : "",
                    )}
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
                <Label htmlFor="amount" className="text-slate-300 flex items-center space-x-1">
                  <span>Monto *</span>
                  {fieldErrors.amount && <span className="text-red-400 text-xs">⚠️</span>}
                  {!fieldErrors.amount && formData.amount && <span className="text-green-400 text-xs">✓</span>}
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleInputChange("amount", e.target.value)}
                  placeholder="0.00"
                  className={cn(
                    "bg-slate-800/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-green-400 focus:ring-green-400/20",
                    fieldErrors.amount ? "border-red-500/50 focus:border-red-400" : "",
                    !fieldErrors.amount && formData.amount ? "border-green-500/50" : "",
                  )}
                  required
                />
                {fieldErrors.amount && (
                  <div className="text-red-400 text-xs flex items-center space-x-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span>{fieldErrors.amount}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Detalles del Pago */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Calendar className="h-5 w-5 text-green-400" />
                <h3 className="text-lg font-semibold text-white">Detalles del Pago</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_method" className="text-slate-300 flex items-center space-x-1">
                  <span>Método de Pago *</span>
                  {fieldErrors.payment_method && <span className="text-red-400 text-xs">⚠️</span>}
                  {!fieldErrors.payment_method && formData.payment_method && (
                    <span className="text-green-400 text-xs">✓</span>
                  )}
                </Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => handleInputChange("payment_method", value)}
                >
                  <SelectTrigger
                    className={cn(
                      "bg-slate-800/50 border-slate-600/50 text-white focus:border-green-400 focus:ring-green-400/20",
                      fieldErrors.payment_method ? "border-red-500/50 focus:border-red-400" : "",
                      !fieldErrors.payment_method && formData.payment_method ? "border-green-500/50" : "",
                    )}
                  >
                    <SelectValue placeholder="Selecciona método de pago" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="efectivo" className="text-white hover:bg-slate-700">
                      Efectivo
                    </SelectItem>
                    <SelectItem value="tarjeta" className="text-white hover:bg-slate-700">
                      Tarjeta de Débito/Crédito
                    </SelectItem>
                    <SelectItem value="transferencia" className="text-white hover:bg-slate-700">
                      Transferencia Bancaria
                    </SelectItem>
                    <SelectItem value="mercadopago" className="text-white hover:bg-slate-700">
                      MercadoPago
                    </SelectItem>
                    <SelectItem value="otro" className="text-white hover:bg-slate-700">
                      Otro
                    </SelectItem>
                  </SelectContent>
                </Select>
                {fieldErrors.payment_method && (
                  <div className="text-red-400 text-xs flex items-center space-x-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span>{fieldErrors.payment_method}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_date" className="text-slate-300">
                  Fecha de Pago *
                </Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => handleInputChange("payment_date", e.target.value)}
                  className="bg-slate-800/50 border-slate-600/50 text-white focus:border-green-400 focus:ring-green-400/20"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-slate-300">
                  Descripción
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Observaciones del pago..."
                  rows={3}
                  className="bg-slate-800/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-green-400 focus:ring-green-400/20"
                />
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-slate-700/50">
            <Button
  type="button"
  variant="outline"
  onClick={() => onOpenChange(false)}
  disabled={loading}
  className="bg-red-600 text-white hover:bg-red-700 border-red-600"
>
  Cancelar
</Button>
            <Button
              type="submit"
              disabled={loading || Object.keys(fieldErrors).length > 0}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              {loading
                ? "Registrando pago..."
                : Object.keys(fieldErrors).length > 0
                  ? "Corrige los errores"
                  : "Registrar Pago"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
