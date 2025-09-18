"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Save, User, Mail, Calendar, AlertTriangle, CreditCard, RefreshCw } from "lucide-react"
import { getTodayLocalDate, addDaysToToday, debugDate, formatDateForDisplay } from "@/lib/date-utils"

interface Membership {
  id: number
  name: string
  description: string
  price: number
  duration_days: number
}

export default function NewMemberForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingMemberships, setLoadingMemberships] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [memberships, setMemberships] = useState<Membership[]>([])

  // Form data
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    document_id: "",
    gender: "",
    birth_date: "",
    address: "",
    emergency_contact: "",
    notes: "",
    membership_id: "",
    payment_method: "efectivo",
  })

  // Debug de fechas al cargar el componente
  useEffect(() => {
    debugDate("NewMemberForm - Componente cargado")
  }, [])

  // Función para cargar membresías
  const fetchMemberships = async () => {
    try {
      setLoadingMemberships(true)
      console.log("NewMemberForm: Fetching memberships...")

      const timestamp = new Date().getTime()
      const response = await fetch(`/api/memberships?t=${timestamp}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log("NewMemberForm: Memberships received:", data)

        const activeMemberships = data
          .filter((m: any) => m.is_active === true)
          .sort((a: any, b: any) => a.price - b.price)

        setMemberships(activeMemberships)
        console.log("NewMemberForm: Active memberships set:", activeMemberships)
      } else {
        console.error("NewMemberForm: Error response:", response.status)
        setError("Error al cargar las membresías")
      }
    } catch (error) {
      console.error("NewMemberForm: Error fetching memberships:", error)
      setError("Error de conexión al cargar membresías")
    } finally {
      setLoadingMemberships(false)
    }
  }

  useEffect(() => {
    fetchMemberships()
  }, [])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("El nombre es requerido")
      return false
    }
    if (!formData.membership_id) {
      setError("Debe seleccionar una membresía")
      return false
    }
    if (formData.email && !formData.email.includes("@")) {
      setError("El email no es válido")
      return false
    }
    return true
  }

  const getSelectedMembership = () => {
    return memberships.find((m) => m.id === Number.parseInt(formData.membership_id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      // Usar las funciones de date-utils para fechas correctas
      const joinDate = getTodayLocalDate()
      const selectedMembership = memberships.find((m) => m.id === Number.parseInt(formData.membership_id))
      const expiryDate = addDaysToToday(selectedMembership?.duration_days || 30)

      // Debug de las fechas calculadas
      debugDate("NewMemberForm - Antes de enviar")
      console.log("📅 NewMemberForm - Fechas calculadas:")
      console.log("   Join date:", joinDate)
      console.log("   Expiry date:", expiryDate)
      console.log("   Membership duration:", selectedMembership?.duration_days, "días")

      const memberData = {
        ...formData,
        membership_id: Number.parseInt(formData.membership_id),
        status: "active",
        join_date: joinDate,
        expiry_date: expiryDate,
      }

      console.log("📤 NewMemberForm: Enviando datos al servidor:", memberData)

      const response = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(memberData),
      })

      const data = await response.json()

      if (response.ok) {
        console.log("✅ NewMemberForm: Respuesta exitosa del servidor:", data)
        setSuccess(`Socio creado exitosamente. ${data.message}`)
        setTimeout(() => {
          router.push(`/members`)
        }, 2000)
      } else {
        console.error("❌ NewMemberForm: Error del servidor:", data)
        setError(data.error || "Error al crear el socio")
      }
    } catch (error) {
      console.error("❌ NewMemberForm: Error de conexión:", error)
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  // Calcular fechas para mostrar en tiempo real
  const todayDate = getTodayLocalDate()
  const selectedMembership = getSelectedMembership()
  const calculatedExpiryDate = selectedMembership ? addDaysToToday(selectedMembership.duration_days) : null

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <style jsx>{`
  input, textarea, select {
    font-size: 16px !important;
  }
  @media (min-width: 768px) {
    input, textarea, select {
      font-size: 14px !important;
    }
  }
`}</style>

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Mostrar fecha actual para verificación */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="text-sm text-blue-700">
          <strong>📅 Fecha actual del sistema:</strong> {formatDateForDisplay(todayDate)} ({todayDate})
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Información Personal */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 mb-4">
            <User className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Información Personal</h3>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nombre Completo *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Juan Pérez"
              required
              className="text-base md:text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="document_id">Cédula de Identidad</Label>
            <Input
              id="document_id"
              value={formData.document_id}
              onChange={(e) => handleInputChange("document_id", e.target.value)}
              placeholder="1.234.567-8"
              className="text-base md:text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Género</Label>
            <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
              <SelectTrigger className="text-base md:text-sm">
                <SelectValue placeholder="Selecciona el género" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="masculino">Masculino</SelectItem>
                <SelectItem value="femenino">Femenino</SelectItem>
                <SelectItem value="no_especificado">Prefiero no especificar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
            <Input
              id="birth_date"
              type="date"
              value={formData.birth_date}
              onChange={(e) => handleInputChange("birth_date", e.target.value)}
              className="text-base md:text-sm"
            />
          </div>
        </div>

        {/* Información de Contacto */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 mb-4">
            <Mail className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Información de Contacto</h3>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="juan@email.com"
              className="text-base md:text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              placeholder="+598 99 123 456"
              className="text-base md:text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="Calle 123, Ciudad"
              rows={3}
              className="text-base md:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Membresía y Pago */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 mb-4">
          <Calendar className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Membresía y Pago</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="membership">Tipo de Membresía *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fetchMemberships}
                disabled={loadingMemberships}
                className="h-8 px-2"
              >
                {loadingMemberships ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              </Button>
            </div>

            {loadingMemberships ? (
              <div className="flex items-center justify-center p-4 border rounded-md">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-gray-500">Cargando membresías...</span>
              </div>
            ) : memberships.length === 0 ? (
              <div className="p-4 border rounded-md bg-yellow-50 border-yellow-200">
                <p className="text-sm text-yellow-800">
                  No hay membresías activas disponibles.
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-yellow-800 underline ml-1"
                    onClick={fetchMemberships}
                  >
                    Recargar
                  </Button>
                </p>
              </div>
            ) : (
              <Select
                value={formData.membership_id}
                onValueChange={(value) => handleInputChange("membership_id", value)}
              >
                <SelectTrigger className="text-base md:text-sm">
                  <SelectValue placeholder="Selecciona una membresía" />
                </SelectTrigger>
                <SelectContent>
                  {memberships.map((membership) => (
                    <SelectItem key={membership.id} value={membership.id.toString()}>
                      <div className="flex justify-between items-center w-full">
                        <span>{membership.name}</span>
                        <span className="text-sm text-gray-500 ml-4">
                          ${membership.price.toLocaleString()} - {membership.duration_days} días
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_method">Método de Pago *</Label>
            <Select
              value={formData.payment_method}
              onValueChange={(value) => handleInputChange("payment_method", value)}
            >
              <SelectTrigger className="text-base md:text-sm">
                <SelectValue placeholder="Selecciona método de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="tarjeta">Tarjeta</SelectItem>
                <SelectItem value="transferencia">Transferencia</SelectItem>
                <SelectItem value="mercadopago">MercadoPago</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Resumen del Pago */}
        {formData.membership_id && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <h4 className="font-semibold text-blue-800">Resumen del Pago</h4>
            </div>
            <div className="text-sm text-blue-700">
              <p>
                <strong>Membresía:</strong> {selectedMembership?.name}
              </p>
              <p>
                <strong>Precio:</strong> ${selectedMembership?.price.toLocaleString()}
              </p>
              <p>
                <strong>Duración:</strong> {selectedMembership?.duration_days} días
              </p>
              <p>
                <strong>Método de Pago:</strong> {formData.payment_method}
              </p>
              <p>
                <strong>📅 Fecha de inicio:</strong> {formatDateForDisplay(todayDate)} ({todayDate})
              </p>
              {calculatedExpiryDate && (
                <p>
                  <strong>📅 Fecha de vencimiento:</strong> {formatDateForDisplay(calculatedExpiryDate)} (
                  {calculatedExpiryDate})
                </p>
              )}
              <p className="mt-2 text-blue-600 font-medium">
                ⚠️ Se registrará automáticamente el pago de la membresía al crear el socio
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Información Adicional */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Información Adicional</h3>
        </div>

        <div className="space-y-2">
          <Label htmlFor="emergency_contact">Contacto de Emergencia</Label>
          <Input
            id="emergency_contact"
            value={formData.emergency_contact}
            onChange={(e) => handleInputChange("emergency_contact", e.target.value)}
            placeholder="María Pérez +598 99 876 543"
            className="text-base md:text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notas</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleInputChange("notes", e.target.value)}
            placeholder="Observaciones médicas, preferencias de entrenamiento, etc."
            rows={3}
            className="text-base md:text-sm"
          />
        </div>
      </div>

      {/* Botones */}
      <div className="flex justify-end space-x-4 pt-6 border-t">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading || loadingMemberships || memberships.length === 0}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Save className="h-4 w-4 mr-2" />
          {loading ? "Creando socio y registrando pago..." : "Crear Socio y Registrar Pago"}
        </Button>
      </div>
    </form>
  )
}
