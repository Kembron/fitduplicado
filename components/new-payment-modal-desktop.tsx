"use client"
import { useState, useEffect, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Loader2,
  Save,
  CreditCard,
  User,
  AlertTriangle,
  DollarSign,
  Search,
  Check,
  ChevronDown,
  FileText,
  RefreshCw,
  ArrowLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { debounce } from "lodash"

interface Member {
  id: number
  name: string
  email: string
  document_id: string
  membership_name: string
  status: string
  expiry_date: string
}

interface Membership {
  id: number
  name: string
  description: string
  price: number
  duration_days: number
}

interface NewPaymentModalDesktopProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function NewPaymentModalDesktop({ open, onOpenChange }: NewPaymentModalDesktopProps) {
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [members, setMembers] = useState<Member[]>([])
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  // Estados para la búsqueda de socios
  const [memberSearchOpen, setMemberSearchOpen] = useState(false)
  const [memberSearchValue, setMemberSearchValue] = useState("")

  // Form data
  const [formData, setFormData] = useState({
    member_id: "",
    membership_id: "",
    amount: "",
    payment_method: "",
    description: "",
    payment_date: new Date().toISOString().split("T")[0],
  })

  const debouncedSearch = useRef(
    debounce((value) => {
      setMemberSearchValue(value)
    }, 300),
  ).current

  useEffect(() => {
    return () => {
      debouncedSearch.cancel()
    }
  }, [debouncedSearch])

  const filteredMembers = useMemo(() => {
    if (!memberSearchValue.trim()) {
      return members.slice(0, 50)
    }

    const searchTerm = memberSearchValue.toLowerCase().trim()

    return members
      .filter((member) => {
        const memberName = (member.name || "").toLowerCase()
        const memberEmail = (member.email || "").toLowerCase()
        const memberDocument = (member.document_id || "").toLowerCase()

        if (memberName === searchTerm || memberEmail === searchTerm || memberDocument === searchTerm) {
          return true
        }

        return (
          memberName.includes(searchTerm) || memberEmail.includes(searchTerm) || memberDocument.includes(searchTerm)
        )
      })
      .slice(0, 100)
  }, [members, memberSearchValue])

  useEffect(() => {
    let isMounted = true

    async function fetchData() {
      try {
        setLoadingData(true)
        const controller = new AbortController()
        const signal = controller.signal

        const [membersRes, membershipsRes] = await Promise.all([
          fetch("/api/members", { signal }),
          fetch("/api/memberships", { signal }),
        ])

        if (!isMounted) return

        if (membersRes.ok) {
          const membersData = await membersRes.json()
          setMembers(membersData)
        }

        if (membershipsRes.ok) {
          const membershipsData = await membershipsRes.json()
          setMemberships(membershipsData.filter((m: any) => m.is_active === true))
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error fetching data:", error)
          setError("Error al cargar los datos")
        }
      } finally {
        if (isMounted) {
          setLoadingData(false)
        }
      }
    }

    if (open) {
      fetchData()
    }

    return () => {
      isMounted = false
    }
  }, [open])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))

    if (field === "member_id" && value) {
      const member = members.find((m) => m.id === Number.parseInt(value))
      setSelectedMember(member || null)
    }

    if (field === "membership_id" && value) {
      const membership = memberships.find((m) => m.id === Number.parseInt(value))
      if (membership) {
        setFormData((prev) => ({
          ...prev,
          amount: membership.price.toString(),
        }))
      }
    }

    validateField(field, value)
  }

  const resetForm = () => {
    setFormData({
      member_id: "",
      membership_id: "",
      amount: "",
      payment_method: "",
      description: "",
      payment_date: new Date().toISOString().split("T")[0],
    })
    setSelectedMember(null)
    setMemberSearchOpen(false)
    setMemberSearchValue("")
    setError("")
    setSuccess("")
    setFieldErrors({})
  }

  const validateField = (field: string, value: string) => {
    const errors = { ...fieldErrors }

    switch (field) {
      case "member_id":
        if (!value) errors.member_id = "Selecciona un socio"
        else delete errors.member_id
        break
      case "membership_id":
        if (!value) errors.membership_id = "Selecciona una membresía"
        else delete errors.membership_id
        break
      case "amount":
        if (!value) errors.amount = "Ingresa el monto"
        else if (Number.parseFloat(value) <= 0) errors.amount = "Monto inválido"
        else delete errors.amount
        break
      case "payment_method":
        if (!value) errors.payment_method = "Selecciona método de pago"
        else delete errors.payment_method
        break
    }

    setFieldErrors(errors)
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.member_id) errors.member_id = "Debe seleccionar un socio"
    if (!formData.membership_id) errors.membership_id = "Debe seleccionar una membresía"
    if (!formData.amount) errors.amount = "El monto es obligatorio"
    else if (Number.parseFloat(formData.amount) <= 0) errors.amount = "El monto debe ser mayor a 0"
    if (!formData.payment_method) errors.payment_method = "Debe seleccionar un método de pago"
    if (!formData.payment_date) errors.payment_date = "La fecha es obligatoria"

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setLoading(true)

    try {
      const selectedMembership = memberships.find((m) => m.id === Number.parseInt(formData.membership_id))
      const startDate = new Date(formData.payment_date)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + (selectedMembership?.duration_days || 30))

      const paymentData = {
        member_id: Number.parseInt(formData.member_id),
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
          resetForm()
          window.location.reload()
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] h-[95vh] p-0 gap-0 bg-slate-900/95 backdrop-blur-xl border-slate-700/50 rounded-xl shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-8 pb-6 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white">Registrar Nuevo Pago</DialogTitle>
                <p className="text-slate-400 mt-1">Complete la información del pago de membresía</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg p-2 flex items-center gap-2"
            >
              <ArrowLeft className="h-5 w-5" />
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
              <h3 className="text-2xl font-bold text-white mb-3">¡Pago Registrado Exitosamente!</h3>
              <p className="text-slate-300 text-center max-w-md">{success}</p>
            </div>
          ) : loadingData ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-blue-400 mb-4" />
              <p className="text-slate-300">Cargando datos...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Member Selection */}
              <div className="lg:col-span-2 space-y-8">
                {/* Member Selection */}
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-white">
                      <User className="h-5 w-5 text-blue-400" />
                      Selección de Socio
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Busca y selecciona el socio que realizará el pago
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label htmlFor="member" className="text-base font-medium text-slate-200 mb-2 block">
                        Socio *
                      </Label>
                      <Popover open={memberSearchOpen} onOpenChange={setMemberSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={memberSearchOpen}
                            className={cn(
                              "w-full h-11 justify-between bg-slate-700/50 border-slate-600/50 text-white hover:bg-slate-700/50",
                              fieldErrors.member_id ? "border-red-500/50" : "",
                              !fieldErrors.member_id && formData.member_id ? "border-green-500/50" : "",
                            )}
                          >
                            <div className="flex items-center space-x-2">
                              <Search className="h-4 w-4 text-slate-400" />
                              <span className="truncate">
                                {formData.member_id
                                  ? members.find((member) => member.id === Number.parseInt(formData.member_id))?.name ||
                                    "Selecciona un socio"
                                  : "Buscar socio..."}
                              </span>
                            </div>
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>

                        <PopoverContent className="w-[500px] p-0 bg-slate-800 border-slate-600 shadow-xl" align="start">
                          <div className="flex flex-col max-h-80">
                            <div className="flex items-center border-b border-slate-600 px-3 py-2 bg-slate-800 sticky top-0 z-10">
                              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-slate-400" />
                              <input
                                placeholder="Buscar por nombre, email o documento..."
                                onChange={(e) => debouncedSearch(e.target.value)}
                                className="flex h-8 w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
                                autoFocus
                              />
                            </div>

                            <div className="flex-1 overflow-y-auto" style={{ maxHeight: "240px" }}>
                              {filteredMembers.length === 0 ? (
                                <div className="text-slate-400 text-center py-6 px-4">
                                  {memberSearchValue.trim()
                                    ? `No se encontraron socios para "${memberSearchValue}"`
                                    : members.length === 0
                                      ? "Cargando socios..."
                                      : "Escribe para buscar socios..."}
                                </div>
                              ) : (
                                <div className="py-1">
                                  {filteredMembers.map((member) => (
                                    <div
                                      key={member.id}
                                      onClick={() => {
                                        handleInputChange("member_id", member.id.toString())
                                        setMemberSearchOpen(false)
                                        setMemberSearchValue("")
                                      }}
                                      className="relative flex cursor-pointer select-none items-center px-3 py-3 text-sm text-white hover:bg-slate-700/80 transition-colors duration-150"
                                    >
                                      <div className="flex items-center justify-between w-full">
                                        <div className="flex flex-col flex-1 min-w-0">
                                          <span className="font-medium truncate">{member.name}</span>
                                          <div className="flex items-center space-x-2 text-xs text-slate-400 mt-1">
                                            <span className="truncate">{member.email || "Sin email"}</span>
                                            <span>•</span>
                                            <span>{member.document_id}</span>
                                            <span>•</span>
                                            <span
                                              className={`px-1.5 py-0.5 rounded text-xs whitespace-nowrap ${
                                                member.status === "active"
                                                  ? "bg-green-500/20 text-green-300"
                                                  : member.status === "expired"
                                                    ? "bg-red-500/20 text-red-300"
                                                    : "bg-orange-500/20 text-orange-300"
                                              }`}
                                            >
                                              {member.status === "active"
                                                ? "Activo"
                                                : member.status === "expired"
                                                  ? "Vencido"
                                                  : "Suspendido"}
                                            </span>
                                          </div>
                                        </div>
                                        <Check
                                          className={cn(
                                            "ml-2 h-4 w-4 flex-shrink-0",
                                            formData.member_id === member.id.toString()
                                              ? "opacity-100 text-green-400"
                                              : "opacity-0",
                                          )}
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                      {fieldErrors.member_id && (
                        <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4" />
                          {fieldErrors.member_id}
                        </p>
                      )}
                    </div>

                    {selectedMember && (
                      <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/30">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-400" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-white">{selectedMember.name}</h4>
                            <p className="text-sm text-slate-400">{selectedMember.email || "Sin email registrado"}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-slate-400">Membresía actual:</span>
                            <p className="text-white font-medium">{selectedMember.membership_name}</p>
                          </div>
                          <div>
                            <span className="text-slate-400">Estado:</span>
                            <p
                              className={`font-medium ${
                                selectedMember.status === "active"
                                  ? "text-green-400"
                                  : selectedMember.status === "expired"
                                    ? "text-red-400"
                                    : "text-orange-400"
                              }`}
                            >
                              {selectedMember.status === "active"
                                ? "Activo"
                                : selectedMember.status === "expired"
                                  ? "Vencido"
                                  : "Suspendido"}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-400">Documento:</span>
                            <p className="text-white font-medium">{selectedMember.document_id}</p>
                          </div>
                          <div>
                            <span className="text-slate-400">Vence:</span>
                            <p className="text-white font-medium">
                              {new Date(selectedMember.expiry_date).toLocaleDateString("es-ES")}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Additional Notes */}
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-white">
                      <FileText className="h-5 w-5 text-purple-400" />
                      Información Adicional
                    </CardTitle>
                    <CardDescription className="text-slate-400">Notas o comentarios sobre el pago</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-base font-medium text-slate-200">
                        Descripción (Opcional)
                      </Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => handleInputChange("description", e.target.value)}
                        placeholder="Notas adicionales sobre el pago, descuentos aplicados, etc..."
                        rows={4}
                        className="text-base bg-slate-700/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-blue-400/20"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Payment Details */}
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
                        onClick={() => window.location.reload()}
                        className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="membership" className="text-base font-medium text-slate-200 mb-2 block">
                        Tipo de Membresía *
                      </Label>
                      <Select
                        value={formData.membership_id}
                        onValueChange={(value) => handleInputChange("membership_id", value)}
                      >
                        <SelectTrigger
                          className={cn(
                            "h-11 text-base bg-slate-700/50 border-slate-600/50 text-white focus:border-blue-400",
                            fieldErrors.membership_id ? "border-red-500/50" : "",
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
                              <div className="flex flex-col">
                                <span className="font-medium">{membership.name}</span>
                                <span className="text-xs text-slate-400">
                                  ${membership.price.toLocaleString()} - {membership.duration_days} días
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldErrors.membership_id && (
                        <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4" />
                          {fieldErrors.membership_id}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Details */}
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-white">
                      <DollarSign className="h-5 w-5 text-green-400" />
                      Detalles del Pago
                    </CardTitle>
                    <CardDescription className="text-slate-400">Información del pago a registrar</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label htmlFor="amount" className="text-base font-medium text-slate-200 mb-2 block">
                        Monto *
                      </Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => handleInputChange("amount", e.target.value)}
                        placeholder="0.00"
                        className={cn(
                          "h-11 text-base bg-slate-700/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-blue-400/20",
                          fieldErrors.amount ? "border-red-500/50" : "",
                        )}
                      />
                      {fieldErrors.amount && (
                        <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4" />
                          {fieldErrors.amount}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="payment_method" className="text-base font-medium text-slate-200 mb-2 block">
                        Método de Pago *
                      </Label>
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
                            className={`p-3 rounded-lg border cursor-pointer transition-all text-center ${
                              formData.payment_method === method.value
                                ? "border-blue-500 bg-blue-500/10 text-blue-300"
                                : "border-slate-600/50 bg-slate-700/30 text-slate-300 hover:border-slate-500"
                            }`}
                          >
                            <div className="text-xl mb-1">{method.icon}</div>
                            <div className="text-sm font-medium">{method.label}</div>
                          </div>
                        ))}
                      </div>
                      {fieldErrors.payment_method && (
                        <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4" />
                          {fieldErrors.payment_method}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="payment_date" className="text-base font-medium text-slate-200 mb-2 block">
                        Fecha de Pago *
                      </Label>
                      <Input
                        id="payment_date"
                        type="date"
                        value={formData.payment_date}
                        onChange={(e) => handleInputChange("payment_date", e.target.value)}
                        className="h-11 text-base bg-slate-700/50 border-slate-600/50 text-white focus:border-blue-400 focus:ring-blue-400/20"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Summary */}
                {formData.membership_id && formData.amount && (
                  <Card className="bg-slate-800/50 border-slate-700/50">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-cyan-500 rounded-lg flex items-center justify-center">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                        <CardTitle className="text-white">Resumen del Pago</CardTitle>
                      </div>
                      <CardDescription className="text-slate-400">
                        Revisa los detalles antes de confirmar
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {(() => {
                        const selectedMembership = memberships.find(
                          (m) => m.id === Number.parseInt(formData.membership_id),
                        )
                        const startDate = new Date(formData.payment_date)
                        const endDate = new Date(startDate)
                        endDate.setDate(endDate.getDate() + (selectedMembership?.duration_days || 30))

                        return (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-slate-700/30">
                              <span className="text-slate-400 text-sm">Membresía:</span>
                              <span className="text-white font-medium">{selectedMembership?.name}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-700/30">
                              <span className="text-slate-400 text-sm">Monto:</span>
                              <span className="text-green-400 font-bold text-lg">
                                ${Number.parseFloat(formData.amount).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-700/30">
                              <span className="text-slate-400 text-sm">Duración:</span>
                              <span className="text-white">{selectedMembership?.duration_days} días</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-700/30">
                              <span className="text-slate-400 text-sm">Método:</span>
                              <span className="text-white capitalize">{formData.payment_method}</span>
                            </div>
                            <div className="bg-slate-900/50 rounded-lg p-3 mt-4">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-slate-400 text-sm">Período de vigencia:</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <div className="text-center">
                                  <div className="text-xs text-slate-400">Inicio</div>
                                  <div className="text-white font-medium">{startDate.toLocaleDateString("es-ES")}</div>
                                </div>
                                <div className="flex-1 mx-3">
                                  <div className="h-px bg-gradient-to-r from-green-500 to-cyan-500"></div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs text-slate-400">Vencimiento</div>
                                  <div className="text-white font-medium">{endDate.toLocaleDateString("es-ES")}</div>
                                </div>
                              </div>
                            </div>
                          </div>
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
        {!success && !loadingData && (
          <div className="p-8 pt-6 border-t border-slate-700/50 bg-slate-900/50">
            <div className="flex gap-4 justify-end">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="px-8 bg-transparent border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  loading ||
                  !formData.member_id ||
                  !formData.membership_id ||
                  !formData.amount ||
                  !formData.payment_method
                }
                className="px-8 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Registrando Pago...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Registrar Pago
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
