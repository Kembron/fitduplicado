"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CreditCard,
  AlertTriangle,
  Loader2,
  Clock,
  DollarSign,
  Phone,
  Mail,
  Calendar,
  Eye,
  RefreshCw,
} from "lucide-react"
import MemberDetailsModal from "@/components/member-details-modal"

interface PendingPayment {
  member_id: number
  member_name: string
  email: string | null
  phone: string | null
  status: string
  expiry_date: string
  last_payment_date: string | null
  membership_name: string
  amount_due: number
  days_overdue: number
}

interface PendingStats {
  expiredCount: number
  expiredAmount: number
}

interface PendingPaymentsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
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

export default function PendingPaymentsModal({ open, onOpenChange }: PendingPaymentsModalProps) {
  const [payments, setPayments] = useState<PendingPayment[]>([])
  const [stats, setStats] = useState<PendingStats>({
    expiredCount: 0,
    expiredAmount: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [showMemberDetails, setShowMemberDetails] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Función optimizada de fetch
  const fetchPendingPayments = useCallback(
    async (forceRefresh = false) => {
      const cacheKey = "pending_payments_data"

      // Intentar cache primero
      if (!forceRefresh) {
        const cachedData = getCachedData(cacheKey)
        if (cachedData) {
          setPayments(cachedData.payments)
          setStats(cachedData.stats)
          return
        }
      }

      try {
        setLoading(!payments.length) // Solo loading si no hay datos
        setRefreshing(forceRefresh)
        setError(null)

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)

        const response = await fetch("/api/stats/pending-payments", {
          signal: controller.signal,
          headers: {
            "Cache-Control": forceRefresh ? "no-cache" : "max-age=180",
          },
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()

        if (!data || typeof data !== "object") {
          throw new Error("Datos inválidos del servidor")
        }

        setPayments(data.payments || [])
        setStats(data.stats || { expiredCount: 0, expiredAmount: 0 })
        setCachedData(cacheKey, data)
      } catch (error: any) {
        console.error("Error fetching pending payments:", error)

        if (error.name === "AbortError") {
          setError("Tiempo de espera agotado. Intenta de nuevo.")
        } else if (error.message.includes("fetch")) {
          setError("Error de conexión. Verifica tu internet.")
        } else {
          setError(error.message || "Error al cargar los pagos pendientes")
        }
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [payments.length],
  )

  // Cargar datos al abrir
  useEffect(() => {
    if (open) {
      fetchPendingPayments()
    }
  }, [open, fetchPendingPayments])

  // Función optimizada para ver miembro
  const handleViewMember = useCallback(async (memberId: number) => {
    try {
      const cacheKey = `member_${memberId}`
      const cached = getCachedData(cacheKey)

      if (cached) {
        setSelectedMember(cached)
        setShowMemberDetails(true)
        return
      }

      const response = await fetch(`/api/members/${memberId}`)
      if (response.ok) {
        const memberData = await response.json()
        setCachedData(cacheKey, memberData, 5 * 60 * 1000) // 5 min cache
        setSelectedMember(memberData)
        setShowMemberDetails(true)
      } else {
        throw new Error("Error al cargar datos del socio")
      }
    } catch (error) {
      console.error("Error fetching member details:", error)
      // Mostrar toast de error aquí si tienes un sistema de notificaciones
    }
  }, [])

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

  const SkeletonTable = () => (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-3 border-b border-slate-700/50">
          <Skeleton className="h-4 w-32 bg-slate-700" />
          <Skeleton className="h-4 w-40 bg-slate-700" />
          <Skeleton className="h-4 w-24 bg-slate-700" />
          <Skeleton className="h-4 w-20 bg-slate-700" />
          <Skeleton className="h-8 w-20 bg-slate-700" />
        </div>
      ))}
    </div>
  )

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl max-w-[95vw] sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="p-4 sm:p-6 pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center space-x-2 text-white text-lg sm:text-xl">
                <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-red-400" />
                <span>Pagos Pendientes (Vencidos)</span>
              </DialogTitle>
              {(payments.length > 0 || stats.expiredCount > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchPendingPayments(true)}
                  disabled={refreshing}
                  className="text-slate-400 hover:text-white hover:bg-slate-700/50"
                >
                  {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </DialogHeader>

          {loading && payments.length === 0 ? (
            <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-20 bg-slate-700" />
                        <Skeleton className="h-6 w-24 bg-slate-600" />
                      </div>
                      <Skeleton className="h-8 w-8 rounded-lg bg-slate-700" />
                    </div>
                    <Skeleton className="h-3 w-16 mt-2 bg-slate-700" />
                  </CardContent>
                </Card>
                <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-24 bg-slate-700" />
                        <Skeleton className="h-6 w-8 bg-slate-600" />
                      </div>
                      <Skeleton className="h-8 w-8 rounded-lg bg-slate-700" />
                    </div>
                    <Skeleton className="h-3 w-20 mt-2 bg-slate-700" />
                  </CardContent>
                </Card>
              </div>
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 text-red-400 mx-auto mb-4 animate-spin" />
                  <p className="text-slate-300 text-sm">Cargando pagos vencidos...</p>
                </div>
              </div>
            </div>
          ) : error && payments.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center max-w-md">
                <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">Error al cargar datos</h2>
                <p className="text-slate-400 mb-4 text-sm">{error}</p>
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={() => fetchPendingPayments(true)}
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
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={`space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0 transition-all duration-300 ${refreshing ? "opacity-70" : ""}`}
            >
              {/* Resumen de estadísticas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-xs sm:text-sm">Total Vencido</p>
                        <p className="text-xl sm:text-2xl font-bold text-red-400">
                          ${stats.expiredAmount.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-1.5 sm:p-2 bg-red-500/20 rounded-lg">
                        <DollarSign className="h-4 w-4 sm:h-6 sm:w-6 text-red-400" />
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm text-slate-400 mt-2">{stats.expiredCount} socios</div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-xs sm:text-sm">Requieren Acción</p>
                        <p className="text-xl sm:text-2xl font-bold text-white">{stats.expiredCount}</p>
                      </div>
                      <div className="p-1.5 sm:p-2 bg-orange-500/20 rounded-lg">
                        <AlertTriangle className="h-4 w-4 sm:h-6 sm:w-6 text-orange-400" />
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm text-slate-400 mt-2">Pagos vencidos</div>
                  </CardContent>
                </Card>
              </div>

              {/* Acciones */}
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
                <span className="text-white font-medium text-sm sm:text-base">
                  Socios con pagos vencidos ({stats.expiredCount})
                </span>
              </div>

              {/* Lista de pagos pendientes */}
              {payments.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <CreditCard className="h-8 w-8 sm:h-12 sm:w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-white mb-2">¡Excelente!</h3>
                  <p className="text-slate-400 text-sm sm:text-base">No hay pagos vencidos en este momento</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-0">
                  {/* Vista móvil - Cards */}
                  <div className="block sm:hidden space-y-3">
                    {loading && payments.length === 0
                      ? [...Array(3)].map((_, i) => <SkeletonCard key={i} />)
                      : payments.map((payment) => (
                          <Card key={payment.member_id} className="bg-slate-900/50 border-slate-700/50">
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="font-medium text-white text-sm">{payment.member_name}</div>
                                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs mt-1">
                                      Vencido
                                    </Badge>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-red-400 font-medium text-sm">
                                      ${payment.amount_due.toLocaleString()}
                                    </div>
                                    <div className="text-xs text-slate-400">{payment.membership_name}</div>
                                  </div>
                                </div>

                                {(payment.email || payment.phone) && (
                                  <div className="space-y-1">
                                    {payment.email && (
                                      <div className="flex items-center text-slate-300 text-xs">
                                        <Mail className="h-3 w-3 mr-1 text-slate-400" />
                                        {payment.email}
                                      </div>
                                    )}
                                    {payment.phone && (
                                      <div className="flex items-center text-slate-300 text-xs">
                                        <Phone className="h-3 w-3 mr-1 text-slate-400" />
                                        {payment.phone}
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="flex justify-between items-center text-xs">
                                  <div className="text-red-400 flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {Math.abs(Number(payment.days_overdue))} días vencido
                                  </div>
                                  {payment.last_payment_date && (
                                    <div className="text-slate-400 flex items-center">
                                      <Calendar className="h-3 w-3 mr-1" />
                                      {new Date(payment.last_payment_date).toLocaleDateString("es-ES")}
                                    </div>
                                  )}
                                </div>

                                <div className="flex pt-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleViewMember(payment.member_id)}
                                    className="bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/30 hover:text-blue-200 transition-all duration-200 w-full text-xs"
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

                  {/* Vista desktop - Tabla */}
                  <div className="hidden sm:block overflow-x-auto">
                    {loading && payments.length === 0 ? (
                      <SkeletonTable />
                    ) : (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-700">
                            <th className="text-left py-3 px-4 font-medium text-slate-300">Socio</th>
                            <th className="text-left py-3 px-4 font-medium text-slate-300">Contacto</th>
                            <th className="text-left py-3 px-4 font-medium text-slate-300">Membresía</th>
                            <th className="text-left py-3 px-4 font-medium text-slate-300">Días Vencido</th>
                            <th className="text-left py-3 px-4 font-medium text-slate-300">Último Pago</th>
                            <th className="text-left py-3 px-4 font-medium text-slate-300">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((payment) => (
                            <tr
                              key={payment.member_id}
                              className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                            >
                              <td className="py-3 px-4">
                                <div className="font-medium text-white">{payment.member_name}</div>
                                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 mt-1">Vencido</Badge>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-sm space-y-1">
                                  {payment.email && (
                                    <div className="flex items-center text-slate-300">
                                      <Mail className="h-3 w-3 mr-1 text-slate-400" />
                                      {payment.email}
                                    </div>
                                  )}
                                  {payment.phone && (
                                    <div className="flex items-center text-slate-300">
                                      <Phone className="h-3 w-3 mr-1 text-slate-400" />
                                      {payment.phone}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-sm">
                                  <div className="font-medium text-white">{payment.membership_name}</div>
                                  <div className="text-red-400 font-medium">${payment.amount_due.toLocaleString()}</div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-red-400 flex items-center font-medium">
                                  <Clock className="h-4 w-4 mr-1" />
                                  {Math.abs(Number(payment.days_overdue))} días
                                </div>
                                <div className="text-xs text-slate-400">
                                  Venció: {new Date(payment.expiry_date).toLocaleDateString("es-ES")}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-sm text-slate-300">
                                {payment.last_payment_date ? (
                                  <div className="flex items-center">
                                    <Calendar className="h-3 w-3 mr-1 text-slate-400" />
                                    {new Date(payment.last_payment_date).toLocaleDateString("es-ES")}
                                  </div>
                                ) : (
                                  <span className="text-slate-500">Sin registros</span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <Button
                                  size="sm"
                                  onClick={() => handleViewMember(payment.member_id)}
                                  className="bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/30 hover:text-blue-200 transition-all duration-200"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Ver Socio
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Detalles del Socio */}
      {selectedMember && (
        <MemberDetailsModal member={selectedMember} open={showMemberDetails} onOpenChange={setShowMemberDetails} />
      )}
    </>
  )
}
