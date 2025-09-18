"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Calendar,
  AlertCircle,
  Loader2,
  Clock,
  Phone,
  Mail,
  Target,
  Eye,
  RefreshCw,
  ChevronLeft,
  TrendingUp,
  DollarSign,
  BarChart3,
  CreditCard,
} from "lucide-react"
import MemberDetailsModal from "./member-details-modal"
import { formatDateForDisplay } from "@/lib/date-utils"

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

interface DailyPaymentsDetailedModalMobileProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  days?: number
}

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
  membership_id: number
  monthly_fee: number
  status: string
  expiry_date: string
  join_date: string
  last_payment_date: string | null
  inactive_since: string | null
  auto_suspended: boolean
}

// Cache optimizado
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>()

const getCachedData = (key: string) => {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data
  }
  cache.delete(key)
  return null
}

const setCachedData = (key: string, data: any, ttl = 3 * 60 * 1000) => {
  cache.set(key, { data, timestamp: Date.now(), ttl })
}

export default function DailyPaymentsDetailedModalMobile({
  open,
  onOpenChange,
  days = 30,
}: DailyPaymentsDetailedModalMobileProps) {
  const [data, setData] = useState<DailyPaymentsData>({
    period: { daysRequested: days, daysReturned: 0 },
    summary: {
      totalAmount: 0,
      totalPayments: 0,
      daysWithPayments: 0,
      averageDailyAmount: 0,
      bestDay: null,
    },
    dailyData: [],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("resumen")
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [showMemberDetails, setShowMemberDetails] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedDay, setSelectedDay] = useState<DailyData | null>(null)

  // Función optimizada de fetch
  const fetchDailyPayments = useCallback(
    async (forceRefresh = false) => {
      const cacheKey = `daily_payments_detailed_${days}`

      // Intentar cache primero
      if (!forceRefresh) {
        const cachedData = getCachedData(cacheKey)
        if (cachedData) {
          setData(cachedData)
          return
        }
      }

      try {
        setLoading(!data.dailyData.length) // Solo loading si no hay datos
        setRefreshing(forceRefresh)
        setError(null)

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)

        const response = await fetch(`/api/stats/daily-payments-detailed?days=${days}`, {
          signal: controller.signal,
          headers: {
            "Cache-Control": forceRefresh ? "no-cache" : "max-age=180",
          },
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const responseData = await response.json()

        if (!responseData || typeof responseData !== "object") {
          throw new Error("Datos inválidos del servidor")
        }

        setData(responseData)
        setCachedData(cacheKey, responseData)
      } catch (error: any) {
        console.error("Error fetching daily payments:", error)

        if (error.name === "AbortError") {
          setError("Tiempo de espera agotado. Intenta de nuevo.")
        } else if (error.message.includes("fetch")) {
          setError("Error de conexión. Verifica tu internet.")
        } else {
          setError(error.message || "Error al cargar los pagos diarios")
        }
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [days, data.dailyData.length],
  )

  // Cargar datos al abrir
  useEffect(() => {
    if (open) {
      fetchDailyPayments()
    }
  }, [open, fetchDailyPayments])

  // Función optimizada para ver miembro
  const handleViewMember = useCallback(async (payment: DailyPayment) => {
    try {
      // Buscar el miembro por nombre (esto es una aproximación, idealmente tendríamos el ID)
      const response = await fetch(`/api/members/search?q=${encodeURIComponent(payment.member.name)}`)
      if (response.ok) {
        const searchResults = await response.json()
        if (searchResults.length > 0) {
          const member = searchResults[0]
          const memberResponse = await fetch(`/api/members/${member.id}`)
          if (memberResponse.ok) {
            const memberData = await memberResponse.json()
            setSelectedMember(memberData)
            setShowMemberDetails(true)
          }
        }
      }
    } catch (error) {
      console.error("Error fetching member details:", error)
    }
  }, [])

  // Datos filtrados por período
  const filteredDailyData = useMemo(() => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const thisWeek = new Date(today)
    thisWeek.setDate(thisWeek.getDate() - 7)

    return {
      today: data.dailyData.filter((day) => day.isToday),
      yesterday: data.dailyData.filter((day) => day.isYesterday),
      thisWeek: data.dailyData.filter((day) => {
        const dayDate = new Date(day.date)
        return dayDate >= thisWeek && dayDate <= today
      }),
      all: data.dailyData,
    }
  }, [data.dailyData])

  // Obtener datos según tab activo
  const getCurrentData = () => {
    switch (activeTab) {
      case "hoy":
        return filteredDailyData.today
      case "ayer":
        return filteredDailyData.yesterday
      case "semana":
        return filteredDailyData.thisWeek
      case "todos":
        return filteredDailyData.all
      default:
        return []
    }
  }

  const currentData = getCurrentData()

  // Componentes de skeleton
  const SkeletonCard = () => (
    <Card className="bg-slate-900/50 border-slate-700/50">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 bg-slate-700" />
              <Skeleton className="h-3 w-16 bg-slate-700" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20 bg-slate-700" />
              <Skeleton className="h-3 w-16 bg-slate-700" />
            </div>
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-40 bg-slate-700" />
            <Skeleton className="h-3 w-36 bg-slate-700" />
          </div>
          <Skeleton className="h-8 w-full bg-slate-700" />
        </div>
      </CardContent>
    </Card>
  )

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case "efectivo":
        return "💵"
      case "tarjeta":
        return "💳"
      case "transferencia":
        return "🏦"
      case "mercadopago":
        return "📱"
      default:
        return "💰"
    }
  }

  const getPaymentMethodColor = (method: string) => {
    switch (method.toLowerCase()) {
      case "efectivo":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "tarjeta":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "transferencia":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30"
      case "mercadopago":
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30"
    }
  }

  if (!open) return null

  return (
    <>
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
                onClick={() => onOpenChange(false)}
                className="bg-slate-800/80 border-slate-600/50 text-slate-200 hover:bg-slate-700 hover:border-slate-500 rounded-xl shadow-lg backdrop-blur-sm transition-all duration-200"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center space-x-3">
                <BarChart3 className="h-6 w-6 text-blue-400" />
                <div>
                  <h1 className="text-lg font-bold text-white">Pagos Diarios</h1>
                  <p className="text-xs text-slate-400">Últimos {days} días</p>
                </div>
              </div>
            </div>
            {data.dailyData.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchDailyPayments(true)}
                disabled={refreshing}
                className="text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl"
              >
                {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading && data.dailyData.length === 0 ? (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[...Array(4)].map((_, i) => (
                    <Card key={i} className="bg-slate-800/50 border-slate-700/50">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-2">
                            <Skeleton className="h-3 w-16 bg-slate-700" />
                            <Skeleton className="h-5 w-12 bg-slate-600" />
                          </div>
                          <Skeleton className="h-6 w-6 rounded bg-slate-700" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 text-blue-400 mx-auto mb-4 animate-spin" />
                    <p className="text-slate-300 text-sm">Cargando pagos diarios...</p>
                  </div>
                </div>
              </div>
            ) : error && data.dailyData.length === 0 ? (
              <div className="flex items-center justify-center h-full p-4">
                <div className="text-center max-w-md">
                  <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-white mb-2">Error al cargar datos</h2>
                  <p className="text-slate-400 mb-4 text-sm">{error}</p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={() => fetchDailyPayments(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={refreshing}
                    >
                      {refreshing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Reintentar
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`transition-all duration-300 ${refreshing ? "opacity-70" : ""}`}>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  {/* Tabs Navigation */}
                  <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/30">
                    <TabsList className="bg-slate-800/50 border border-slate-700/50 grid grid-cols-4 w-full">
                      <TabsTrigger
                        value="resumen"
                        className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-xs"
                      >
                        Resumen
                      </TabsTrigger>
                      <TabsTrigger
                        value="hoy"
                        className="data-[state=active]:bg-blue-900/30 data-[state=active]:text-blue-300 text-xs"
                      >
                        Hoy ({filteredDailyData.today.reduce((sum, day) => sum + day.summary.paymentCount, 0)})
                      </TabsTrigger>
                      <TabsTrigger
                        value="ayer"
                        className="data-[state=active]:bg-green-900/30 data-[state=active]:text-green-300 text-xs"
                      >
                        Ayer ({filteredDailyData.yesterday.reduce((sum, day) => sum + day.summary.paymentCount, 0)})
                      </TabsTrigger>
                      <TabsTrigger
                        value="todos"
                        className="data-[state=active]:bg-purple-900/30 data-[state=active]:text-purple-300 text-xs"
                      >
                        Todos
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* Tab Content */}
                  <div className="p-4 pb-20">
                    <TabsContent value="resumen" className="mt-0 space-y-4">
                      {/* Resumen General */}
                      <div className="grid grid-cols-2 gap-3">
                        <Card className="bg-slate-800/50 border-slate-700/50">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-slate-400 text-xs">Total Recaudado</p>
                                <p className="text-lg font-bold text-green-400">
                                  ${data.summary.totalAmount.toLocaleString()}
                                </p>
                              </div>
                              <div className="p-2 bg-green-500/20 rounded-lg">
                                <DollarSign className="h-5 w-5 text-green-400" />
                              </div>
                            </div>
                            <div className="text-xs text-slate-400 mt-1">{days} días</div>
                          </CardContent>
                        </Card>

                        <Card className="bg-slate-800/50 border-slate-700/50">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-slate-400 text-xs">Total Pagos</p>
                                <p className="text-lg font-bold text-blue-400">{data.summary.totalPayments}</p>
                              </div>
                              <div className="p-2 bg-blue-500/20 rounded-lg">
                                <CreditCard className="h-5 w-5 text-blue-400" />
                              </div>
                            </div>
                            <div className="text-xs text-slate-400 mt-1">Transacciones</div>
                          </CardContent>
                        </Card>

                        <Card className="bg-slate-800/50 border-slate-700/50">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-slate-400 text-xs">Promedio Diario</p>
                                <p className="text-lg font-bold text-purple-400">
                                  ${data.summary.averageDailyAmount.toLocaleString()}
                                </p>
                              </div>
                              <div className="p-2 bg-purple-500/20 rounded-lg">
                                <TrendingUp className="h-5 w-5 text-purple-400" />
                              </div>
                            </div>
                            <div className="text-xs text-slate-400 mt-1">Por día activo</div>
                          </CardContent>
                        </Card>

                        <Card className="bg-slate-800/50 border-slate-700/50">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-slate-400 text-xs">Días Activos</p>
                                <p className="text-lg font-bold text-orange-400">{data.summary.daysWithPayments}</p>
                              </div>
                              <div className="p-2 bg-orange-500/20 rounded-lg">
                                <Calendar className="h-5 w-5 text-orange-400" />
                              </div>
                            </div>
                            <div className="text-xs text-slate-400 mt-1">Con pagos</div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Mejor Día */}
                      {data.summary.bestDay && (
                        <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-3 mb-3">
                              <div className="p-2 bg-yellow-500/20 rounded-lg">
                                <Target className="h-5 w-5 text-yellow-400" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-white">Mejor Día</h3>
                                <p className="text-xs text-slate-400">Mayor recaudación</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-slate-400">Fecha:</span>
                                <p className="text-white font-medium">
                                  {data.summary.bestDay.dayName}, {formatDateForDisplay(data.summary.bestDay.date)}
                                </p>
                              </div>
                              <div>
                                <span className="text-slate-400">Recaudado:</span>
                                <p className="text-yellow-400 font-bold">
                                  ${data.summary.bestDay.amount.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Lista de Días Recientes */}
                      <div className="space-y-3">
                        <h3 className="text-white font-medium flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-blue-400" />
                          Últimos Días
                        </h3>
                        {data.dailyData.slice(0, 7).map((day) => (
                          <Card
                            key={day.date}
                            className={`bg-slate-900/50 border-slate-700/50 cursor-pointer transition-all duration-200 hover:bg-slate-800/50 ${
                              day.isToday ? "border-blue-500/50 bg-blue-500/5" : ""
                            } ${day.isYesterday ? "border-green-500/50 bg-green-500/5" : ""}`}
                            onClick={() => {
                              setSelectedDay(day)
                              setActiveTab("detalle")
                            }}
                          >
                            <CardContent className="p-4">
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <h4 className="font-medium text-white">
                                      {day.dayName}, {day.dayNumber}
                                    </h4>
                                    {day.isToday && (
                                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                                        Hoy
                                      </Badge>
                                    )}
                                    {day.isYesterday && (
                                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                                        Ayer
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-400">{day.monthName}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-green-400 font-bold">
                                    ${day.summary.totalAmount.toLocaleString()}
                                  </p>
                                  <p className="text-xs text-slate-400">{day.summary.paymentCount} pagos</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="hoy" className="mt-0">
                      {filteredDailyData.today.length === 0 ? (
                        <div className="text-center py-12">
                          <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-white mb-2">Sin pagos hoy</h3>
                          <p className="text-slate-400">No se han registrado pagos el día de hoy</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {filteredDailyData.today.map((day) => (
                            <div key={day.date} className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h3 className="text-white font-medium">
                                  Hoy - ${day.summary.totalAmount.toLocaleString()}
                                </h3>
                                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                  {day.summary.paymentCount} pagos
                                </Badge>
                              </div>
                              {day.payments.map((payment) => (
                                <Card key={payment.id} className="bg-slate-900/50 border-slate-700/50">
                                  <CardContent className="p-4">
                                    <div className="space-y-3">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <div className="font-medium text-white text-sm">{payment.member.name}</div>
                                          <div className="text-xs text-slate-400">{payment.membership}</div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-green-400 font-bold">
                                            ${payment.amount.toLocaleString()}
                                          </div>
                                          <Badge className={`text-xs ${getPaymentMethodColor(payment.paymentMethod)}`}>
                                            {getPaymentMethodIcon(payment.paymentMethod)} {payment.paymentMethod}
                                          </Badge>
                                        </div>
                                      </div>
                                      {(payment.member.email || payment.member.phone) && (
                                        <div className="space-y-1">
                                          {payment.member.email && (
                                            <div className="flex items-center text-slate-300 text-xs">
                                              <Mail className="h-3 w-3 mr-1 text-slate-400" />
                                              {payment.member.email}
                                            </div>
                                          )}
                                          {payment.member.phone && (
                                            <div className="flex items-center text-slate-300 text-xs">
                                              <Phone className="h-3 w-3 mr-1 text-slate-400" />
                                              {payment.member.phone}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      <div className="flex justify-between items-center pt-2">
                                        <div className="text-xs text-slate-400">Por: {payment.createdBy}</div>
                                        <Button
                                          size="sm"
                                          onClick={() => handleViewMember(payment)}
                                          className="bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/30 text-xs h-7"
                                        >
                                          <Eye className="h-3 w-3 mr-1" />
                                          Ver
                                        </Button>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="ayer" className="mt-0">
                      {filteredDailyData.yesterday.length === 0 ? (
                        <div className="text-center py-12">
                          <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-white mb-2">Sin pagos ayer</h3>
                          <p className="text-slate-400">No se registraron pagos el día de ayer</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {filteredDailyData.yesterday.map((day) => (
                            <div key={day.date} className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h3 className="text-white font-medium">
                                  Ayer - ${day.summary.totalAmount.toLocaleString()}
                                </h3>
                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                  {day.summary.paymentCount} pagos
                                </Badge>
                              </div>
                              {day.payments.map((payment) => (
                                <Card key={payment.id} className="bg-slate-900/50 border-slate-700/50">
                                  <CardContent className="p-4">
                                    <div className="space-y-3">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <div className="font-medium text-white text-sm">{payment.member.name}</div>
                                          <div className="text-xs text-slate-400">{payment.membership}</div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-green-400 font-bold">
                                            ${payment.amount.toLocaleString()}
                                          </div>
                                          <Badge className={`text-xs ${getPaymentMethodColor(payment.paymentMethod)}`}>
                                            {getPaymentMethodIcon(payment.paymentMethod)} {payment.paymentMethod}
                                          </Badge>
                                        </div>
                                      </div>
                                      {(payment.member.email || payment.member.phone) && (
                                        <div className="space-y-1">
                                          {payment.member.email && (
                                            <div className="flex items-center text-slate-300 text-xs">
                                              <Mail className="h-3 w-3 mr-1 text-slate-400" />
                                              {payment.member.email}
                                            </div>
                                          )}
                                          {payment.member.phone && (
                                            <div className="flex items-center text-slate-300 text-xs">
                                              <Phone className="h-3 w-3 mr-1 text-slate-400" />
                                              {payment.member.phone}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      <div className="flex justify-between items-center pt-2">
                                        <div className="text-xs text-slate-400">Por: {payment.createdBy}</div>
                                        <Button
                                          size="sm"
                                          onClick={() => handleViewMember(payment)}
                                          className="bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/30 text-xs h-7"
                                        >
                                          <Eye className="h-3 w-3 mr-1" />
                                          Ver
                                        </Button>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="todos" className="mt-0">
                      <div className="space-y-4">
                        {data.dailyData
                          .filter((day) => day.summary.paymentCount > 0)
                          .map((day) => (
                            <Card
                              key={day.date}
                              className={`bg-slate-900/50 border-slate-700/50 cursor-pointer transition-all duration-200 hover:bg-slate-800/50 ${
                                day.isToday ? "border-blue-500/50 bg-blue-500/5" : ""
                              } ${day.isYesterday ? "border-green-500/50 bg-green-500/5" : ""}`}
                              onClick={() => {
                                setSelectedDay(day)
                                setActiveTab("detalle")
                              }}
                            >
                              <CardContent className="p-4">
                                <div className="flex justify-between items-center mb-3">
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <h4 className="font-medium text-white">
                                        {day.dayName}, {day.dayNumber} de {day.monthName}
                                      </h4>
                                      {day.isToday && (
                                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                                          Hoy
                                        </Badge>
                                      )}
                                      {day.isYesterday && (
                                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                                          Ayer
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-400">{formatDateForDisplay(day.date)}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-green-400 font-bold">
                                      ${day.summary.totalAmount.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-slate-400">{day.summary.paymentCount} pagos</p>
                                  </div>
                                </div>
                                <div className="text-xs text-slate-400">
                                  Promedio: ${day.summary.averageAmount.toLocaleString()} por pago
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    </TabsContent>

                    {/* Tab de Detalle de Día Seleccionado */}
                    {selectedDay && (
                      <TabsContent value="detalle" className="mt-0">
                        <div className="space-y-4">
                          <div className="flex items-center space-x-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setActiveTab("todos")}
                              className="text-slate-400 hover:text-white"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div>
                              <h3 className="text-white font-medium">
                                {selectedDay.dayName}, {selectedDay.dayNumber} de {selectedDay.monthName}
                              </h3>
                              <p className="text-xs text-slate-400">{formatDateForDisplay(selectedDay.date)}</p>
                            </div>
                          </div>

                          <Card className="bg-slate-800/50 border-slate-700/50">
                            <CardContent className="p-4">
                              <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                  <p className="text-slate-400 text-xs">Total</p>
                                  <p className="text-green-400 font-bold">
                                    ${selectedDay.summary.totalAmount.toLocaleString()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-slate-400 text-xs">Pagos</p>
                                  <p className="text-blue-400 font-bold">{selectedDay.summary.paymentCount}</p>
                                </div>
                                <div>
                                  <p className="text-slate-400 text-xs">Promedio</p>
                                  <p className="text-purple-400 font-bold">
                                    ${selectedDay.summary.averageAmount.toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <div className="space-y-3">
                            {selectedDay.payments.map((payment) => (
                              <Card key={payment.id} className="bg-slate-900/50 border-slate-700/50">
                                <CardContent className="p-4">
                                  <div className="space-y-3">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <div className="font-medium text-white text-sm">{payment.member.name}</div>
                                        <div className="text-xs text-slate-400">{payment.membership}</div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-green-400 font-bold">
                                          ${payment.amount.toLocaleString()}
                                        </div>
                                        <Badge className={`text-xs ${getPaymentMethodColor(payment.paymentMethod)}`}>
                                          {getPaymentMethodIcon(payment.paymentMethod)} {payment.paymentMethod}
                                        </Badge>
                                      </div>
                                    </div>
                                    {payment.description && (
                                      <div className="text-xs text-slate-300 bg-slate-800/50 rounded p-2">
                                        {payment.description}
                                      </div>
                                    )}
                                    {(payment.member.email || payment.member.phone) && (
                                      <div className="space-y-1">
                                        {payment.member.email && (
                                          <div className="flex items-center text-slate-300 text-xs">
                                            <Mail className="h-3 w-3 mr-1 text-slate-400" />
                                            {payment.member.email}
                                          </div>
                                        )}
                                        {payment.member.phone && (
                                          <div className="flex items-center text-slate-300 text-xs">
                                            <Phone className="h-3 w-3 mr-1 text-slate-400" />
                                            {payment.member.phone}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    <div className="flex justify-between items-center pt-2">
                                      <div className="text-xs text-slate-400">Por: {payment.createdBy}</div>
                                      <Button
                                        size="sm"
                                        onClick={() => handleViewMember(payment)}
                                        className="bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/30 text-xs h-7"
                                      >
                                        <Eye className="h-3 w-3 mr-1" />
                                        Ver Socio
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </TabsContent>
                    )}
                  </div>
                </Tabs>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalles del Socio */}
      <MemberDetailsModal member={selectedMember} open={showMemberDetails} onOpenChange={setShowMemberDetails} />
    </>
  )
}
