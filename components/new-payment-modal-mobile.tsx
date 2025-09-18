"use client"
import { useState, useEffect, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Loader2,
  Save,
  CreditCard,
  User,
  Calendar,
  AlertTriangle,
  DollarSign,
  Search,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Receipt,
  Banknote,
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

interface NewPaymentModalMobileProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function NewPaymentModalMobile({ open, onOpenChange }: NewPaymentModalMobileProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
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
        setLoading(true)

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
          setMemberships(membershipsData)
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error fetching data:", error)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
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
    setCurrentStep(1)
  }

  const validateField = (field: string, value: string) => {
    const errors = { ...fieldErrors }

    switch (field) {
      case "member_id":
        if (!value) {
          errors.member_id = "Selecciona un socio"
        } else {
          delete errors.member_id
        }
        break
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

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return formData.member_id && !fieldErrors.member_id
      case 2:
        return formData.membership_id && formData.amount && !fieldErrors.membership_id && !fieldErrors.amount
      case 3:
        return formData.payment_method && !fieldErrors.payment_method
      default:
        return true
    }
  }

  const getStepProgress = () => {
    return Math.round((currentStep / 4) * 100)
  }

  const handleNext = () => {
    if (canProceedToNextStep() && currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    } else {
      onOpenChange(false)
    }
  }

  const handleSubmit = async () => {
    setError("")
    setSuccess("")
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Seleccionar Socio</h2>
              <p className="text-slate-400 text-sm">Busca y selecciona el socio para el pago</p>
            </div>

            <div className="space-y-4">
              <Label htmlFor="member" className="text-slate-300 text-base font-medium">
                Socio *
              </Label>

              <Popover open={memberSearchOpen} onOpenChange={setMemberSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={memberSearchOpen}
                    className={cn(
                      "w-full justify-between bg-slate-800/50 border-slate-600/50 text-white hover:bg-slate-700/50 h-14 text-left",
                      fieldErrors.member_id ? "border-red-500/50" : "",
                      !fieldErrors.member_id && formData.member_id ? "border-green-500/50" : "",
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <Search className="h-5 w-5 text-slate-400" />
                      <span className="truncate text-base">
                        {formData.member_id
                          ? members.find((member) => member.id === Number.parseInt(formData.member_id))?.name ||
                            "Selecciona un socio"
                          : "Buscar socio..."}
                      </span>
                    </div>
                    <ChevronDown className="ml-2 h-5 w-5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-[calc(100vw-2rem)] p-0 bg-slate-800 border-slate-600 shadow-xl">
                  <div className="flex flex-col max-h-80">
                    <div className="flex items-center border-b border-slate-600 px-4 py-3 bg-slate-800 sticky top-0 z-10">
                      <Search className="mr-3 h-5 w-5 shrink-0 opacity-50 text-slate-400" />
                      <input
                        placeholder="Buscar por nombre, email o documento..."
                        onChange={(e) => debouncedSearch(e.target.value)}
                        className="flex h-10 w-full bg-transparent text-base text-white placeholder:text-slate-400 focus:outline-none"
                        autoFocus
                      />
                    </div>

                    <div className="flex-1 overflow-y-auto" style={{ maxHeight: "240px" }}>
                      {filteredMembers.length === 0 ? (
                        <div className="text-slate-400 text-center py-8 px-4">
                          {memberSearchValue.trim()
                            ? `No se encontraron socios para "${memberSearchValue}"`
                            : members.length === 0
                              ? "Cargando socios..."
                              : "Escribe para buscar socios..."}
                        </div>
                      ) : (
                        <div className="py-2">
                          {filteredMembers.map((member) => (
                            <div
                              key={member.id}
                              onClick={() => {
                                handleInputChange("member_id", member.id.toString())
                                setMemberSearchOpen(false)
                                setMemberSearchValue("")
                              }}
                              className="relative flex cursor-pointer select-none items-center px-4 py-4 text-white hover:bg-slate-700/80 transition-colors duration-150"
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex flex-col flex-1 min-w-0">
                                  <span className="font-medium text-base truncate">{member.name}</span>
                                  <div className="flex items-center space-x-2 text-sm text-slate-400 mt-1">
                                    <span className="truncate">{member.email || "Sin email"}</span>
                                    <span>•</span>
                                    <span>{member.document_id}</span>
                                  </div>
                                  <span
                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 w-fit ${
                                      member.status === "active"
                                        ? "bg-green-500/20 text-green-300"
                                        : member.status === "expired"
                                          ? "bg-red-500/20 text-red-300"
                                          : member.status === "suspended"
                                            ? "bg-orange-500/20 text-orange-300"
                                            : "bg-gray-500/20 text-gray-300"
                                    }`}
                                  >
                                    {member.status === "active"
                                      ? "Activo"
                                      : member.status === "expired"
                                        ? "Vencido"
                                        : member.status === "suspended"
                                          ? "Suspendido"
                                          : "Inactivo"}
                                  </span>
                                </div>
                                <Check
                                  className={cn(
                                    "ml-3 h-5 w-5 flex-shrink-0",
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
                <div className="text-red-400 text-sm flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{fieldErrors.member_id}</span>
                </div>
              )}

              {selectedMember && (
                <div className="bg-slate-900/50 rounded-xl p-4 space-y-3 border border-slate-700/50">
                  <div className="flex items-center space-x-3">
                    <UserCheck className="h-5 w-5 text-green-400" />
                    <span className="text-base font-medium text-white">Socio Seleccionado</span>
                  </div>
                  <div className="text-sm text-slate-300 space-y-2">
                    <div className="flex justify-between">
                      <span>Email:</span>
                      <span>{selectedMember.email || "No registrado"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Membresía:</span>
                      <span>{selectedMember.membership_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Vence:</span>
                      <span>{new Date(selectedMember.expiry_date).toLocaleDateString("es-ES")}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Receipt className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Membresía y Monto</h2>
              <p className="text-slate-400 text-sm">Selecciona la membresía y confirma el monto</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="membership" className="text-slate-300 text-base font-medium">
                  Membresía *
                </Label>
                <Select
                  value={formData.membership_id}
                  onValueChange={(value) => handleInputChange("membership_id", value)}
                >
                  <SelectTrigger
                    className={cn(
                      "bg-slate-800/50 border-slate-600/50 text-white focus:border-cyan-400 focus:ring-cyan-400/20 h-14 text-base",
                      fieldErrors.membership_id ? "border-red-500/50" : "",
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
                        className="text-white hover:bg-slate-700 py-4"
                      >
                        <div className="flex flex-col w-full">
                          <span className="font-medium text-base">{membership.name}</span>
                          <span className="text-sm text-slate-400">
                            ${membership.price.toLocaleString()} - {membership.duration_days} días
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.membership_id && (
                  <div className="text-red-400 text-sm flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{fieldErrors.membership_id}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="amount" className="text-slate-300 text-base font-medium">
                  Monto *
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => handleInputChange("amount", e.target.value)}
                    placeholder="0.00"
                    className={cn(
                      "bg-slate-800/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-cyan-400 focus:ring-cyan-400/20 h-14 text-base pl-12",
                      fieldErrors.amount ? "border-red-500/50" : "",
                      !fieldErrors.amount && formData.amount ? "border-green-500/50" : "",
                    )}
                    required
                  />
                </div>
                {fieldErrors.amount && (
                  <div className="text-red-400 text-sm flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{fieldErrors.amount}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Banknote className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Método de Pago</h2>
              <p className="text-slate-400 text-sm">Selecciona cómo se realizó el pago</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="payment_method" className="text-slate-300 text-base font-medium">
                  Método de Pago *
                </Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => handleInputChange("payment_method", value)}
                >
                  <SelectTrigger
                    className={cn(
                      "bg-slate-800/50 border-slate-600/50 text-white focus:border-cyan-400 focus:ring-cyan-400/20 h-14 text-base",
                      fieldErrors.payment_method ? "border-red-500/50" : "",
                      !fieldErrors.payment_method && formData.payment_method ? "border-green-500/50" : "",
                    )}
                  >
                    <SelectValue placeholder="Selecciona método de pago" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="efectivo" className="text-white hover:bg-slate-700 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <Banknote className="h-4 w-4 text-green-400" />
                        </div>
                        <span className="text-base">Efectivo</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="tarjeta" className="text-white hover:bg-slate-700 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <CreditCard className="h-4 w-4 text-blue-400" />
                        </div>
                        <span className="text-base">Tarjeta</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="transferencia" className="text-white hover:bg-slate-700 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <DollarSign className="h-4 w-4 text-purple-400" />
                        </div>
                        <span className="text-base">Transferencia</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="mercadopago" className="text-white hover:bg-slate-700 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                          <CreditCard className="h-4 w-4 text-cyan-400" />
                        </div>
                        <span className="text-base">MercadoPago</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {fieldErrors.payment_method && (
                  <div className="text-red-400 text-sm flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{fieldErrors.payment_method}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="payment_date" className="text-slate-300 text-base font-medium">
                  Fecha de Pago *
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    id="payment_date"
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => handleInputChange("payment_date", e.target.value)}
                    className="bg-slate-800/50 border-slate-600/50 text-white focus:border-cyan-400 focus:ring-cyan-400/20 h-14 text-base pl-12"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Save className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Confirmar Pago</h2>
              <p className="text-slate-400 text-sm">Revisa los datos antes de registrar</p>
            </div>

            <div className="space-y-4">
              {/* Resumen del pago */}
              <div className="bg-slate-900/50 rounded-xl p-4 space-y-4 border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-3">Resumen del Pago</h3>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Socio:</span>
                    <span className="text-white font-medium">{selectedMember?.name}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Membresía:</span>
                    <span className="text-white font-medium">
                      {memberships.find((m) => m.id === Number.parseInt(formData.membership_id))?.name}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Monto:</span>
                    <span className="text-white font-bold text-lg">
                      ${Number.parseFloat(formData.amount).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Método:</span>
                    <span className="text-white font-medium capitalize">{formData.payment_method}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Fecha:</span>
                    <span className="text-white font-medium">
                      {new Date(formData.payment_date).toLocaleDateString("es-ES")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Descripción opcional */}
              <div className="space-y-3">
                <Label htmlFor="description" className="text-slate-300 text-base font-medium">
                  Descripción (Opcional)
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Notas adicionales sobre el pago..."
                  rows={3}
                  className="bg-slate-800/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-cyan-400 focus:ring-cyan-400/20 text-base"
                />
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-0 max-w-none w-screen h-screen border-0 rounded-none m-0 translate-x-0 translate-y-0"
        style={{
          transform: "none",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      >
        <style jsx global>{`
          [data-radix-dialog-content] {
            transform: none !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            max-width: none !important;
            width: 100vw !important;
            height: 100vh !important;
            margin: 0 !important;
          }
        `}</style>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBack}
              className="bg-slate-800/80 border-slate-600/50 text-slate-200 hover:bg-slate-700 hover:border-slate-500 rounded-xl shadow-lg backdrop-blur-sm transition-all duration-200"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center space-x-3">
              <CreditCard className="h-6 w-6 text-cyan-400" />
              <h1 className="text-xl font-bold text-white">Registrar Pago</h1>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="px-4 py-3 bg-slate-800/30 border-b border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Paso {currentStep} de 4</span>
            <span className="text-sm font-medium text-white">{getStepProgress()}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getStepProgress()}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 pb-24">
          {error && (
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 backdrop-blur-sm mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-300">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-500/10 border-green-500/20 backdrop-blur-sm mb-4">
              <AlertDescription className="text-green-300">{success}</AlertDescription>
            </Alert>
          )}

          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-800/50 backdrop-blur-xl border-t border-slate-700/50 p-4 pb-6 md:pb-4">
          <div className="flex space-x-3">
            {currentStep < 4 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceedToNextStep() || loading}
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed h-12 text-base font-medium rounded-xl transition-all duration-200 transform hover:scale-[1.02]"
              >
                <span>Siguiente</span>
                <ChevronRight className="h-5 w-5 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed h-12 text-base font-medium rounded-xl transition-all duration-200 transform hover:scale-[1.02]"
              >
                {loading && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
                <Save className="h-5 w-5 mr-2" />
                {loading ? "Registrando..." : "Registrar Pago"}
              </Button>
            )}
          </div>
          {/* Safe area for mobile */}
          <div className="h-2 md:hidden" />
        </div>
      </DialogContent>
    </Dialog>
  )
}
