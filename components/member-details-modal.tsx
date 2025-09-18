"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  User,
  CreditCard,
  Calendar,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Activity,
  Loader2,
} from "lucide-react"
import { formatDateForDisplay, formatDateWithMonth } from "@/lib/date-utils"

interface Member {
  id: number
  name: string
  email: string
  phone: string
  document_id: string
  birth_date: string
  address: string
  emergency_contact: string
  notes: string
  membership_name: string
  status: string
  join_date: string
  expiry_date: string
  monthly_fee: number
  last_payment_date: string | null
  inactive_since: string | null
  auto_suspended: boolean
  gender: string
}

interface Payment {
  id: number
  amount: number
  payment_date: string
  payment_method: string
  description: string
  membership_name: string
  start_date: string
  end_date: string
  created_by_name: string
}

interface MemberDetailsModalProps {
  member: Member | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function MemberDetailsModal({ member, open, onOpenChange }: MemberDetailsModalProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [paymentStats, setPaymentStats] = useState({
    totalPaid: 0,
    averageAmount: 0,
    onTimePayments: 0,
    latePayments: 0,
    totalPayments: 0,
  })

  // Cargar historial de pagos cuando se abre el modal
  useEffect(() => {
    if (open && member) {
      fetchMemberPayments()
    }
  }, [open, member])

  const fetchMemberPayments = async () => {
    if (!member) return

    try {
      setLoadingPayments(true)
      const response = await fetch(`/api/members/${member.id}/payments`)
      if (response.ok) {
        const data = await response.json()
        setPayments(data)
        calculatePaymentStats(data)
      }
    } catch (error) {
      console.error("Error fetching member payments:", error)
    } finally {
      setLoadingPayments(false)
    }
  }

  const calculatePaymentStats = (payments: Payment[]) => {
    if (payments.length === 0) {
      setPaymentStats({
        totalPaid: 0,
        averageAmount: 0,
        onTimePayments: 0,
        latePayments: 0,
        totalPayments: 0,
      })
      return
    }

    // Filter out payments with invalid amounts and convert to numbers
    const validPayments = payments.filter((payment) => {
      const amount = Number(payment.amount)
      return !isNaN(amount) && isFinite(amount) && amount >= 0
    })

    if (validPayments.length === 0) {
      setPaymentStats({
        totalPaid: 0,
        averageAmount: 0,
        onTimePayments: 0,
        latePayments: 0,
        totalPayments: payments.length, // Keep original count for reference
      })
      return
    }

    const totalPaid = validPayments.reduce((sum, payment) => {
      const amount = Number(payment.amount)
      return sum + amount
    }, 0)

    const averageAmount = totalPaid / validPayments.length

    // Calculate on-time vs late payments using valid payments only
    let onTimePayments = 0
    let latePayments = 0

    validPayments.forEach((payment) => {
      try {
        const paymentDate = new Date(payment.payment_date)
        const startDate = new Date(payment.start_date)

        // Validate dates
        if (isNaN(paymentDate.getTime()) || isNaN(startDate.getTime())) {
          return // Skip invalid dates
        }

        // If paid before or on the same day as the period started, it's on time
        if (paymentDate <= startDate) {
          onTimePayments++
        } else {
          latePayments++
        }
      } catch (error) {
        console.warn("Error processing payment date:", payment, error)
        // Skip this payment if date processing fails
      }
    })

    setPaymentStats({
      totalPaid: Math.max(0, totalPaid), // Ensure non-negative
      averageAmount: Math.max(0, averageAmount), // Ensure non-negative
      onTimePayments,
      latePayments,
      totalPayments: payments.length, // Original count including invalid payments
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Activo</Badge>
      case "expired":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Vencido</Badge>
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Próximo a Vencer</Badge>
      case "suspended":
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Suspendido</Badge>
      case "inactive":
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Inactivo</Badge>
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">Desconocido</Badge>
    }
  }

  const getPaymentMethodBadge = (method: string) => {
    const colors = {
      efectivo: "bg-green-500/20 text-green-400 border-green-500/30",
      tarjeta: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      transferencia: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      mercadopago: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    }

    return (
      <Badge className={colors[method as keyof typeof colors] || "bg-slate-500/20 text-slate-400 border-slate-500/30"}>
        {method.charAt(0).toUpperCase() + method.slice(1)}
      </Badge>
    )
  }

  const formatCurrency = (amount: number) => {
    // Handle NaN, null, undefined, or invalid numbers
    if (isNaN(amount) || !isFinite(amount) || amount == null) {
      return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
      }).format(0)
    }

    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(Math.max(0, amount)) // Ensure non-negative display
  }

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return 0
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }

    return age
  }

  const getDaysUntilExpiry = () => {
    if (!member || !member.expiry_date) return 0
    const today = new Date()
    const expiry = new Date(member.expiry_date)
    const diffTime = expiry.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const getMembershipDuration = () => {
    if (!member || !member.join_date) return 0
    const join = new Date(member.join_date)
    const today = new Date()
    const diffTime = today.getTime() - join.getTime()
    return Math.floor(diffTime / (1000 * 60 * 60 * 24))
  }

  if (!member) return null

  const daysUntilExpiry = getDaysUntilExpiry()
  const membershipDuration = getMembershipDuration()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-white text-xl">
            <div className="flex items-center space-x-3">
              <User className="h-6 w-6 text-blue-400" />
              <span>{member.name}</span>
              {getStatusBadge(member.status)}
            </div>
            <Button
  variant="outline"
  size="sm"
  onClick={() => onOpenChange(false)}
  className="bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
>
  Volver
</Button>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800/30 border border-slate-700/50">
            <TabsTrigger
              value="info"
              className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 text-slate-300"
            >
              <User className="h-4 w-4 mr-2" />
              Información
            </TabsTrigger>
            <TabsTrigger
              value="payments"
              className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 text-slate-300"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Pagos ({payments.length})
            </TabsTrigger>
            <TabsTrigger
              value="stats"
              className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 text-slate-300"
            >
              <Activity className="h-4 w-4 mr-2" />
              Estadísticas
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[600px] mt-4">
            <TabsContent value="info" className="space-y-4">
              {/* Información Personal */}
              <Card className="bg-slate-800/30 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <User className="h-5 w-5 text-blue-400" />
                    <span>Información Personal</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-slate-400">Nombre Completo</label>
                      <p className="text-white font-medium">{member.name}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-slate-400">Documento</label>
                      <p className="text-white">{member.document_id || "No especificado"}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-slate-400">Género</label>
                      <p className="text-white">
                        {member.gender === "masculino"
                          ? "Masculino"
                          : member.gender === "femenino"
                            ? "Femenino"
                            : "No especificado"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-slate-400">Fecha de Nacimiento</label>
                      <p className="text-white">
                        {member.birth_date
                          ? `${formatDateWithMonth(member.birth_date)} (${calculateAge(member.birth_date)} años)`
                          : "No especificada"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-slate-400">Teléfono</label>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <p className="text-white">{member.phone || "No especificado"}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-slate-400">Email</label>
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <p className="text-white">{member.email || "No especificado"}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-slate-400">Dirección</label>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <p className="text-white">{member.address || "No especificada"}</p>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-slate-700/50" />

                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">Contacto de Emergencia</label>
                    <p className="text-white">{member.emergency_contact || "No especificado"}</p>
                  </div>

                  {member.notes && (
                    <>
                      <Separator className="bg-slate-700/50" />
                      <div className="space-y-2">
                        <label className="text-sm text-slate-400">Notas</label>
                        <div className="bg-slate-700/30 rounded-lg p-3">
                          <p className="text-white whitespace-pre-wrap">{member.notes}</p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Información de Membresía */}
              <Card className="bg-slate-800/30 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <CreditCard className="h-5 w-5 text-blue-400" />
                    <span>Membresía</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-slate-400">Tipo de Membresía</label>
                      <p className="text-white font-medium">{member.membership_name}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-slate-400">Precio Mensual</label>
                      <p className="text-white font-medium">{formatCurrency(member.monthly_fee)}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-slate-400">Fecha de Ingreso</label>
                      <p className="text-white">{formatDateWithMonth(member.join_date)}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-slate-400">Duración como Socio</label>
                      <p className="text-white">
                        {membershipDuration} días ({Math.floor(membershipDuration / 30)} meses)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-slate-400">Fecha de Vencimiento</label>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <p className="text-white">{formatDateWithMonth(member.expiry_date)}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-slate-400">Días hasta Vencimiento</label>
                      <div className="flex items-center space-x-2">
                        {daysUntilExpiry > 0 ? (
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-400" />
                        )}
                        <p className={`font-medium ${daysUntilExpiry > 0 ? "text-green-400" : "text-red-400"}`}>
                          {daysUntilExpiry > 0
                            ? `${daysUntilExpiry} días`
                            : `Vencido hace ${Math.abs(daysUntilExpiry)} días`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {member.last_payment_date && (
                    <>
                      <Separator className="bg-slate-700/50" />
                      <div className="space-y-2">
                        <label className="text-sm text-slate-400">Último Pago</label>
                        <p className="text-white">{formatDateWithMonth(member.last_payment_date)}</p>
                      </div>
                    </>
                  )}

                  {member.auto_suspended && (
                    <>
                      <Separator className="bg-slate-700/50" />
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-orange-400" />
                          <p className="text-orange-400 font-medium">Suspendido Automáticamente</p>
                        </div>
                        {member.inactive_since && (
                          <p className="text-orange-300 text-sm mt-1">
                            Desde: {formatDateWithMonth(member.inactive_since)}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments" className="space-y-4">
              <Card className="bg-slate-800/30 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CreditCard className="h-5 w-5 text-blue-400" />
                      <span>Historial de Pagos</span>
                    </div>
                    {loadingPayments && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Registro completo de todos los pagos realizados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingPayments ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 text-blue-400 mx-auto mb-4 animate-spin" />
                      <p className="text-slate-400">Cargando historial de pagos...</p>
                    </div>
                  ) : payments.length === 0 ? (
                    <div className="text-center py-8">
                      <CreditCard className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">Sin pagos registrados</h3>
                      <p className="text-slate-400">Este socio aún no tiene pagos en el sistema</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {payments.map((payment, index) => {
                        const paymentDate = new Date(payment.payment_date)
                        const startDate = new Date(payment.start_date)
                        const isLate = paymentDate > startDate
                        const daysLate = isLate
                          ? Math.ceil((paymentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
                          : 0

                        return (
                          <div
                            key={payment.id}
                            className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30 hover:bg-slate-700/50 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <div className={`w-3 h-3 rounded-full ${isLate ? "bg-red-400" : "bg-green-400"}`} />
                                <span className="text-white font-medium">{formatCurrency(payment.amount)}</span>
                                {getPaymentMethodBadge(payment.payment_method)}
                              </div>
                              <div className="text-right">
                                <p className="text-white text-sm">{formatDateForDisplay(payment.payment_date)}</p>
                                {isLate && (
                                  <p className="text-red-400 text-xs">
                                    {daysLate} día{daysLate !== 1 ? "s" : ""} tarde
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                              <div>
                                <label className="text-slate-400">Membresía</label>
                                <p className="text-white">{payment.membership_name}</p>
                              </div>
                              <div>
                                <label className="text-slate-400">Período</label>
                                <p className="text-white">
                                  {formatDateForDisplay(payment.start_date)} - {formatDateForDisplay(payment.end_date)}
                                </p>
                              </div>
                              <div>
                                <label className="text-slate-400">Registrado por</label>
                                <p className="text-white">{payment.created_by_name || "Sistema"}</p>
                              </div>
                            </div>

                            {payment.description && (
                              <div className="mt-3 pt-3 border-t border-slate-600/30">
                                <label className="text-slate-400 text-sm">Descripción</label>
                                <p className="text-white text-sm">{payment.description}</p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stats" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Estadísticas de Pagos */}
                <Card className="bg-slate-800/30 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center space-x-2">
                      <DollarSign className="h-5 w-5 text-green-400" />
                      <span>Estadísticas de Pagos</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-400">{paymentStats.totalPayments}</p>
                        <p className="text-slate-400 text-sm">Total Pagos</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-400">{formatCurrency(paymentStats.totalPaid)}</p>
                        <p className="text-slate-400 text-sm">Total Pagado</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-400">
                          {formatCurrency(paymentStats.averageAmount)}
                        </p>
                        <p className="text-slate-400 text-sm">Promedio</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-yellow-400">
                          {paymentStats.totalPayments > 0
                            ? Math.round((paymentStats.onTimePayments / paymentStats.totalPayments) * 100)
                            : 0}
                          %
                        </p>
                        <p className="text-slate-400 text-sm">Puntualidad</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Puntualidad de Pagos */}
                <Card className="bg-slate-800/30 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center space-x-2">
                      <Clock className="h-5 w-5 text-yellow-400" />
                      <span>Puntualidad</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-400" />
                          <span className="text-white">Pagos a Tiempo</span>
                        </div>
                        <span className="text-green-400 font-medium">{paymentStats.onTimePayments}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-red-400" />
                          <span className="text-white">Pagos Tardíos</span>
                        </div>
                        <span className="text-red-400 font-medium">{paymentStats.latePayments}</span>
                      </div>
                    </div>

                    {paymentStats.totalPayments > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-slate-400 text-sm">Puntualidad General</span>
                          <span className="text-white text-sm">
                            {Math.round((paymentStats.onTimePayments / paymentStats.totalPayments) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${(paymentStats.onTimePayments / paymentStats.totalPayments) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Información Adicional */}
              <Card className="bg-slate-800/30 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-blue-400" />
                    <span>Información Adicional</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-400">{membershipDuration}</p>
                      <p className="text-slate-400 text-sm">Días como Socio</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-400">{Math.floor(membershipDuration / 30)}</p>
                      <p className="text-slate-400 text-sm">Meses Activo</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-2xl font-bold ${daysUntilExpiry > 0 ? "text-green-400" : "text-red-400"}`}>
                        {Math.abs(daysUntilExpiry)}
                      </p>
                      <p className="text-slate-400 text-sm">
                        {daysUntilExpiry > 0 ? "Días Restantes" : "Días Vencido"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
