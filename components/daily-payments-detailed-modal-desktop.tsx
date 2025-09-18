"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  DollarSign,
  Calendar,
  Loader2,
  RefreshCw,
  AlertCircle,
  User,
  Phone,
  Mail,
  Receipt,
  History,
} from "lucide-react"

interface DailyPayment {
  id: number
  amount: number
  paymentMethod: string
  description: string
  member: {
    name: string
    email: string
    phone: string
    status: string
  }
  membership: string
  createdBy: string
}

interface DailyData {
  date: string
  dayName: string
  dayNumber: number
  monthName: string
  isToday: boolean
  isYesterday: boolean
  payments: DailyPayment[]
  summary: {
    totalAmount: number
    paymentCount: number
    averageAmount: number
  }
}

interface DailyPaymentsData {
  period: {
    daysRequested: number
    daysReturned: number
  }
  summary: {
    totalAmount: number
    totalPayments: number
    daysWithPayments: number
    averageDailyAmount: number
    bestDay: {
      date: string
      dayName: string
      amount: number
      payments: number
    } | null
  }
  dailyData: DailyData[]
}

interface DailyPaymentsDetailedModalDesktopProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  days?: number
}

export default function DailyPaymentsDetailedModalDesktop({
  open,
  onOpenChange,
  days = 30,
}: DailyPaymentsDetailedModalDesktopProps) {
  const [dailyData, setDailyData] = useState<DailyPaymentsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [daysToShow, setDaysToShow] = useState(30)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/stats/daily-payments-detailed?days=${daysToShow}`)
      if (!response.ok) throw new Error("Error al cargar datos")

      const data = await response.json()
      setDailyData(data)

      // Auto-seleccionar hoy si tiene pagos, sino el más reciente
      if (data.dailyData.length > 0) {
        const today = data.dailyData.find((d: DailyData) => d.isToday && d.summary.paymentCount > 0)
        const mostRecent = data.dailyData.find((d: DailyData) => d.summary.paymentCount > 0)
        setSelectedDay((today || mostRecent)?.date || null)
      }
    } catch (error) {
      setError("Error al cargar los datos")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open, daysToShow])

  const getStatusColor = (status: string) => {
    const colors = {
      active: "bg-green-500/20 text-green-300 border-green-500/30",
      expired: "bg-orange-500/20 text-orange-300 border-orange-500/30",
      suspended: "bg-red-500/20 text-red-300 border-red-500/30",
      inactive: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    }
    return colors[status as keyof typeof colors] || colors.inactive
  }

  const getPaymentMethodInfo = (method: string) => {
    const config = {
      efectivo: { label: "Efectivo", color: "bg-green-500", icon: "💵" },
      tarjeta: { label: "Tarjeta", color: "bg-blue-500", icon: "💳" },
      transferencia: { label: "Transferencia", color: "bg-purple-500", icon: "🏦" },
      mercadopago: { label: "MercadoPago", color: "bg-yellow-500", icon: "💰" },
      otro: { label: "Otro", color: "bg-gray-500", icon: "💸" },
    }
    return config[method.toLowerCase() as keyof typeof config] || config.otro
  }

  const selectedDayData = selectedDay ? dailyData?.dailyData.find((d) => d.date === selectedDay) : null

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-slate-800/95 border-slate-700/50 backdrop-blur-xl max-w-4xl">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-8 w-8 text-green-400 mx-auto mb-4 animate-spin" />
              <p className="text-slate-300">Cargando pagos...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-slate-800/95 border-slate-700/50 backdrop-blur-xl max-w-4xl">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-6" />
              <h2 className="text-xl font-semibold text-white mb-3">Error al cargar datos</h2>
              <p className="text-red-300 mb-6">{error}</p>
              <Button onClick={fetchData} className="bg-blue-600 hover:bg-blue-700">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800/95 border-slate-700/50 backdrop-blur-xl max-w-7xl max-h-[95vh] overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-slate-700/30">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2 text-white text-xl">
              <DollarSign className="h-6 w-6 text-green-400" />
              <span>Pagos Diarios</span>
            </DialogTitle>
            <div className="flex items-center gap-2">
              <select
                value={daysToShow}
                onChange={(e) => setDaysToShow(Number(e.target.value))}
                className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white"
              >
                <option value={7}>7 días</option>
                <option value={15}>15 días</option>
                <option value={30}>30 días</option>
                <option value={60}>60 días</option>
              </select>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchData}
                className="text-slate-400 hover:text-white hover:bg-slate-700/50"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(95vh-120px)]">
          <div className="p-6 space-y-6">
            {/* Resumen */}
            {dailyData && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-green-200 text-sm font-medium">Total</p>
                      <p className="text-2xl font-bold text-white">
                        ${dailyData.summary.totalAmount.toLocaleString("es-AR")}
                      </p>
                      <p className="text-xs text-green-200">{dailyData.summary.totalPayments} pagos</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-blue-200 text-sm font-medium">Promedio Diario</p>
                      <p className="text-2xl font-bold text-white">
                        ${dailyData.summary.averageDailyAmount.toLocaleString("es-AR")}
                      </p>
                      <p className="text-xs text-blue-200">{dailyData.summary.daysWithPayments} días activos</p>
                    </div>
                  </CardContent>
                </Card>

                {dailyData.summary.bestDay && (
                  <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 col-span-2">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-yellow-200 text-sm font-medium">Mejor Día</p>
                        <p className="text-2xl font-bold text-white">
                          ${dailyData.summary.bestDay.amount.toLocaleString("es-AR")}
                        </p>
                        <p className="text-xs text-yellow-200">
                          {dailyData.summary.bestDay.dayName} • {dailyData.summary.bestDay.payments} pagos
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Contenido principal */}
            {dailyData ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Lista de días */}
                <div className="lg:col-span-1">
                  <Card className="bg-slate-800/50 border-slate-700/50">
                    <CardHeader className="p-4">
                      <CardTitle className="text-white flex items-center space-x-2 text-sm">
                        <History className="h-4 w-4 text-blue-400" />
                        <span>Últimos {daysToShow} días</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="h-[500px]">
                        <div className="space-y-1 p-4 pt-0">
                          {dailyData.dailyData.map((day) => (
                            <div
                              key={day.date}
                              onClick={() => setSelectedDay(day.date === selectedDay ? null : day.date)}
                              className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                                selectedDay === day.date
                                  ? "bg-blue-500/20 border border-blue-500/30"
                                  : day.summary.paymentCount > 0
                                    ? "bg-slate-700/50 hover:bg-slate-700/70 border border-slate-600/30"
                                    : "bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/20"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <span
                                      className={`text-sm font-medium ${
                                        day.isToday
                                          ? "text-green-300"
                                          : day.isYesterday
                                            ? "text-yellow-300"
                                            : "text-white"
                                      }`}
                                    >
                                      {day.isToday ? "Hoy" : day.isYesterday ? "Ayer" : day.dayName}
                                    </span>
                                    {day.isToday && (
                                      <Badge className="bg-green-500/20 text-green-300 text-xs">HOY</Badge>
                                    )}
                                    {day.isYesterday && (
                                      <Badge className="bg-yellow-500/20 text-yellow-300 text-xs">AYER</Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-400">
                                    {day.dayNumber} de {day.monthName}
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div
                                    className={`text-sm font-bold ${
                                      day.summary.totalAmount > 0 ? "text-green-300" : "text-slate-500"
                                    }`}
                                  >
                                    ${day.summary.totalAmount.toLocaleString("es-AR")}
                                  </div>
                                  <div className="text-xs text-slate-400">
                                    {day.summary.paymentCount} pago{day.summary.paymentCount !== 1 ? "s" : ""}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>

                {/* Detalles del día seleccionado */}
                <div className="lg:col-span-2">
                  {selectedDayData ? (
                    <Card className="bg-slate-800/50 border-slate-700/50">
                      <CardHeader className="p-4 border-b border-slate-700/30">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-white flex items-center space-x-2">
                            <Calendar className="h-5 w-5 text-blue-400" />
                            <span>
                              {selectedDayData.isToday
                                ? "Hoy"
                                : selectedDayData.isYesterday
                                  ? "Ayer"
                                  : selectedDayData.dayName}
                              {" - "}
                              {selectedDayData.dayNumber} de {selectedDayData.monthName}
                            </span>
                          </CardTitle>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-300">
                              ${selectedDayData.summary.totalAmount.toLocaleString("es-AR")}
                            </div>
                            <div className="text-sm text-slate-400">
                              {selectedDayData.summary.paymentCount} pago
                              {selectedDayData.summary.paymentCount !== 1 ? "s" : ""}
                              {selectedDayData.summary.averageAmount > 0 && (
                                <> • Prom: ${selectedDayData.summary.averageAmount.toLocaleString("es-AR")}</>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <ScrollArea className="h-[500px]">
                          {selectedDayData.payments.length > 0 ? (
                            <div className="space-y-3 p-4">
                              {selectedDayData.payments.map((payment) => {
                                const methodInfo = getPaymentMethodInfo(payment.paymentMethod)
                                return (
                                  <div
                                    key={payment.id}
                                    className="p-4 bg-slate-900/50 rounded-lg border border-slate-600/30 hover:bg-slate-900/70 transition-colors"
                                  >
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2 mb-1">
                                          <User className="h-4 w-4 text-blue-400 flex-shrink-0" />
                                          <span className="font-medium text-white truncate">{payment.member.name}</span>
                                          <Badge className={getStatusColor(payment.member.status)}>
                                            {payment.member.status}
                                          </Badge>
                                        </div>
                                        <div className="text-sm text-slate-300 mb-1">{payment.membership}</div>
                                        <div className="flex items-center space-x-4 text-xs text-slate-400">
                                          {payment.member.email && (
                                            <div className="flex items-center space-x-1">
                                              <Mail className="h-3 w-3" />
                                              <span className="truncate max-w-[150px]">{payment.member.email}</span>
                                            </div>
                                          )}
                                          {payment.member.phone && (
                                            <div className="flex items-center space-x-1">
                                              <Phone className="h-3 w-3" />
                                              <span>{payment.member.phone}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-right flex-shrink-0 ml-4">
                                        <div className="text-xl font-bold text-green-300">
                                          ${payment.amount.toLocaleString("es-AR")}
                                        </div>
                                      </div>
                                    </div>

                                    <Separator className="bg-slate-700/50 my-3" />

                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3">
                                        <div className="flex items-center space-x-2">
                                          <div className={`w-3 h-3 rounded-full ${methodInfo.color}`}></div>
                                          <span className="text-sm text-slate-300 flex items-center gap-1">
                                            <span>{methodInfo.icon}</span>
                                            {methodInfo.label}
                                          </span>
                                        </div>
                                        {payment.description && (
                                          <div className="text-xs text-slate-400 max-w-[200px] truncate">
                                            "{payment.description}"
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-xs text-slate-500">Por: {payment.createdBy}</div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-full p-8">
                              <div className="text-center">
                                <Receipt className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-white mb-2">Sin pagos</h3>
                                <p className="text-slate-400 text-sm">No se registraron pagos en este día</p>
                              </div>
                            </div>
                          )}
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="bg-slate-800/50 border-slate-700/50">
                      <CardContent className="p-8">
                        <div className="text-center">
                          <Calendar className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                          <h3 className="text-xl font-semibold text-white mb-2">Selecciona un día</h3>
                          <p className="text-slate-400">
                            Haz clic en cualquier día de la lista para ver los pagos detallados
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center min-h-[200px] p-6">
                <div className="text-center">
                  <Receipt className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Sin datos</h3>
                  <p className="text-slate-400 text-sm">No se pudieron cargar los datos</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
