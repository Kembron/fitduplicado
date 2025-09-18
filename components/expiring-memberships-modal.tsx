"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, AlertCircle, Loader2, Clock, Phone, Mail, Target, Eye, RefreshCw, AlertTriangle } from "lucide-react"
import MemberDetailsModal from "./member-details-modal"
import { formatDateForDisplay } from "@/lib/date-utils"

interface ExpiringMembership {
  member_id: number
  member_name: string
  email: string | null
  phone: string | null
  status: string
  expiry_date: string
  last_payment_date: string | null
  membership_name: string
  renewal_amount: number
  days_until_expiry: number
  expiry_label: string
}

interface ExpiringStats {
  expiringToday: number
  expiring3Days: number
  expiringWeek: number
  expiringMonth: number
  expiredRecent: number
  totalExpiring: number
  potentialRevenueWeek: number
  potentialRevenueMonth: number
}

interface ExpiringMembershipsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
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

export default function ExpiringMembershipsModal({ open, onOpenChange }: ExpiringMembershipsModalProps) {
  const [memberships, setMemberships] = useState<ExpiringMembership[]>([])
  const [stats, setStats] = useState<ExpiringStats>({
    expiringToday: 0,
    expiring3Days: 0,
    expiringWeek: 0,
    expiringMonth: 0,
    expiredRecent: 0,
    totalExpiring: 0,
    potentialRevenueWeek: 0,
    potentialRevenueMonth: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("todos")
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [showMemberDetails, setShowMemberDetails] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  // Función optimizada de fetch
  const fetchExpiringMemberships = useCallback(
    async (forceRefresh = false) => {
      const cacheKey = "expiring_memberships_data"

      // Intentar cache primero
      if (!forceRefresh) {
        const cachedData = getCachedData(cacheKey)
        if (cachedData) {
          setMemberships(cachedData.memberships)
          setStats(cachedData.stats)
          setDebugInfo(cachedData.debugInfo)
          return
        }
      }

      try {
        setLoading(!memberships.length) // Solo loading si no hay datos
        setRefreshing(forceRefresh)
        setError(null)

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)

        const response = await fetch("/api/stats/expiring-memberships", {
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

        console.log("🗓️ Expiring Memberships Data:", data.debugInfo)

        setMemberships(data.memberships || [])
        setStats(
          data.stats || {
            expiringToday: 0,
            expiring3Days: 0,
            expiringWeek: 0,
            expiringMonth: 0,
            expiredRecent: 0,
            totalExpiring: 0,
            potentialRevenueWeek: 0,
            potentialRevenueMonth: 0,
          },
        )
        setDebugInfo(data.debugInfo)
        setCachedData(cacheKey, data)
      } catch (error: any) {
        console.error("Error fetching expiring memberships:", error)

        if (error.name === "AbortError") {
          setError("Tiempo de espera agotado. Intenta de nuevo.")
        } else if (error.message.includes("fetch")) {
          setError("Error de conexión. Verifica tu internet.")
        } else {
          setError(error.message || "Error al cargar los vencimientos próximos")
        }
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [memberships.length],
  )

  // Cargar datos al abrir
  useEffect(() => {
    if (open) {
      fetchExpiringMemberships()
    }
  }, [open, fetchExpiringMemberships])

  // Función optimizada para ver miembro
  const handleViewMember = useCallback(async (membership: ExpiringMembership) => {
    try {
      const cacheKey = `member_${membership.member_id}`
      const cached = getCachedData(cacheKey)

      if (cached) {
        setSelectedMember(cached)
        setShowMemberDetails(true)
        return
      }

      const response = await fetch(`/api/members/${membership.member_id}`)
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

  // Función memoizada para obtener badge de urgencia
  const getUrgencyBadge = useMemo(() => {
    return (daysUntilExpiry: number, expiryLabel: string) => {
      if (daysUntilExpiry < 0) {
        return <Badge className="bg-red-600/30 text-red-300 border-red-500/50 text-xs">Vencido</Badge>
      } else if (daysUntilExpiry === 0) {
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Vence hoy</Badge>
      } else if (daysUntilExpiry <= 3) {
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">Urgente</Badge>
      } else if (daysUntilExpiry <= 7) {
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">Esta semana</Badge>
      } else {
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">Este mes</Badge>
      }
    }
  }, [])

  // Membresías filtradas memoizadas
  const filteredMemberships = useMemo(() => {
    return memberships.filter((membership) => {
      if (activeTab === "todos") return true
      if (activeTab === "vencidos") return membership.days_until_expiry < 0
      if (activeTab === "hoy") return membership.days_until_expiry === 0
      if (activeTab === "3-dias") return membership.days_until_expiry > 0 && membership.days_until_expiry <= 3
      if (activeTab === "semana") return membership.days_until_expiry > 3 && membership.days_until_expiry <= 7
      if (activeTab === "mes") return membership.days_until_expiry > 7 && membership.days_until_expiry <= 30
      return true
    })
  }, [memberships, activeTab])

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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl max-w-[95vw] sm:max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="p-4 sm:p-6 pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center space-x-2 text-white text-lg sm:text-xl">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-orange-400" />
                <span>Vencimientos Próximos</span>
                {debugInfo && <div className="text-xs text-slate-400 ml-2">Uruguay: {debugInfo.uruguayTime}</div>}
              </DialogTitle>
              {(memberships.length > 0 || stats.totalExpiring > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchExpiringMemberships(true)}
                  disabled={refreshing}
                  className="text-slate-400 hover:text-white hover:bg-slate-700/50"
                >
                  {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </DialogHeader>

          {loading && memberships.length === 0 ? (
            <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
                {[...Array(5)].map((_, i) => (
                  <Card key={i} className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <Skeleton className="h-3 w-20 bg-slate-700" />
                          <Skeleton className="h-6 w-8 bg-slate-600" />
                        </div>
                        <Skeleton className="h-8 w-8 rounded-lg bg-slate-700" />
                      </div>
                      <Skeleton className="h-3 w-16 mt-2 bg-slate-700" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 text-orange-400 mx-auto mb-4 animate-spin" />
                  <p className="text-slate-300 text-sm">Cargando vencimientos próximos...</p>
                </div>
              </div>
            </div>
          ) : error && memberships.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center max-w-md">
                <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">Error al cargar datos</h2>
                <p className="text-slate-400 mb-4 text-sm">{error}</p>
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={() => fetchExpiringMemberships(true)}
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
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
                <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-xs">Vencidos</p>
                        <p className="text-lg sm:text-2xl font-bold text-red-500">{stats.expiredRecent}</p>
                      </div>
                      <div className="p-1 sm:p-2 bg-red-600/20 rounded-lg">
                        <AlertTriangle className="h-4 w-4 sm:h-6 sm:w-6 text-red-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-xs">Vencen Hoy</p>
                        <p className="text-lg sm:text-2xl font-bold text-red-400">{stats.expiringToday}</p>
                      </div>
                      <div className="p-1 sm:p-2 bg-red-500/20 rounded-lg">
                        <AlertCircle className="h-4 w-4 sm:h-6 sm:w-6 text-red-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-xs">Próximos 3 días</p>
                        <p className="text-lg sm:text-2xl font-bold text-orange-400">{stats.expiring3Days}</p>
                      </div>
                      <div className="p-1 sm:p-2 bg-orange-500/20 rounded-lg">
                        <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-orange-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-xs">Esta Semana</p>
                        <p className="text-lg sm:text-2xl font-bold text-yellow-400">{stats.expiringWeek}</p>
                      </div>
                      <div className="p-1 sm:p-2 bg-yellow-500/20 rounded-lg">
                        <Calendar className="h-4 w-4 sm:h-6 sm:w-6 text-yellow-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-xs">Ingresos Potenciales</p>
                        <p className="text-sm sm:text-2xl font-bold text-green-400">
                          ${stats.potentialRevenueMonth.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-1 sm:p-2 bg-green-500/20 rounded-lg">
                        <Target className="h-4 w-4 sm:h-6 sm:w-6 text-green-400" />
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">En esta semana</div>
                  </CardContent>
                </Card>
              </div>

              {/* Filtros */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                <TabsList className="bg-slate-800/50 border border-slate-700/50 grid grid-cols-3 sm:flex w-full sm:w-auto">
                  <TabsTrigger
                    value="todos"
                    className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-xs sm:text-sm"
                  >
                    Todos ({stats.totalExpiring + stats.expiredRecent})
                  </TabsTrigger>
                  <TabsTrigger
                    value="vencidos"
                    className="data-[state=active]:bg-red-900/30 data-[state=active]:text-red-300 text-xs sm:text-sm"
                  >
                    Vencidos ({stats.expiredRecent})
                  </TabsTrigger>
                  <TabsTrigger
                    value="hoy"
                    className="data-[state=active]:bg-red-900/30 data-[state=active]:text-red-300 text-xs sm:text-sm"
                  >
                    Hoy ({stats.expiringToday})
                  </TabsTrigger>
                  <TabsTrigger
                    value="3-dias"
                    className="data-[state=active]:bg-orange-900/30 data-[state=active]:text-orange-300 text-xs sm:text-sm hidden sm:block"
                  >
                    3 días ({stats.expiring3Days})
                  </TabsTrigger>
                  <TabsTrigger
                    value="semana"
                    className="data-[state=active]:bg-yellow-900/30 data-[state=active]:text-yellow-300 text-xs sm:text-sm hidden sm:block"
                  >
                    Semana ({stats.expiringWeek})
                  </TabsTrigger>
                  <TabsTrigger
                    value="mes"
                    className="data-[state=active]:bg-blue-900/30 data-[state=active]:text-blue-300 text-xs sm:text-sm hidden sm:block"
                  >
                    Mes ({stats.expiringMonth})
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Lista de vencimientos */}
              {filteredMemberships.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <Calendar className="h-8 w-8 sm:h-12 sm:w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-white mb-2">
                    No hay vencimientos en esta categoría
                  </h3>
                  <p className="text-slate-400 text-sm sm:text-base">
                    {activeTab === "todos"
                      ? "Todas las membresías están vigentes por más tiempo"
                      : activeTab === "vencidos"
                        ? "No hay membresías vencidas recientemente"
                        : `No hay membresías que venzan ${activeTab === "hoy" ? "hoy" : `en ${activeTab}`}`}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-0">
                  {/* Vista móvil - Cards */}
                  <div className="block sm:hidden space-y-3">
                    {loading && memberships.length === 0
                      ? [...Array(3)].map((_, i) => <SkeletonCard key={i} />)
                      : filteredMemberships.map((membership) => (
                          <Card key={membership.member_id} className="bg-slate-900/50 border-slate-700/50">
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="font-medium text-white text-sm">{membership.member_name}</div>
                                    {getUrgencyBadge(Number(membership.days_until_expiry), membership.expiry_label)}
                                  </div>
                                  <div className="text-right">
                                    <div className="text-green-400 font-medium text-sm">
                                      ${membership.renewal_amount.toLocaleString()}
                                    </div>
                                    <div className="text-xs text-slate-400">{membership.membership_name}</div>
                                  </div>
                                </div>

                                {(membership.email || membership.phone) && (
                                  <div className="space-y-1">
                                    {membership.email && (
                                      <div className="flex items-center text-slate-300 text-xs">
                                        <Mail className="h-3 w-3 mr-1 text-slate-400" />
                                        {membership.email}
                                      </div>
                                    )}
                                    {membership.phone && (
                                      <div className="flex items-center text-slate-300 text-xs">
                                        <Phone className="h-3 w-3 mr-1 text-slate-400" />
                                        {membership.phone}
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="flex justify-between items-center text-xs">
                                  <div className="text-white">{formatDateForDisplay(membership.expiry_date)}</div>
                                  <div className="text-slate-400 flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {membership.expiry_label}
                                  </div>
                                </div>

                                <div className="flex space-x-2 pt-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleViewMember(membership)}
                                    className="bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/30 hover:text-blue-200 hover:border-blue-400/50 w-full text-xs transition-all duration-200"
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
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-3 px-4 font-medium text-slate-300">Socio</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-300">Contacto</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-300">Membresía</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-300">Estado</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-300">Vencimiento</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-300">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMemberships.map((membership) => (
                          <tr
                            key={membership.member_id}
                            className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="font-medium text-white">{membership.member_name}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-sm space-y-1">
                                {membership.email && (
                                  <div className="flex items-center text-slate-300">
                                    <Mail className="h-3 w-3 mr-1 text-slate-400" />
                                    {membership.email}
                                  </div>
                                )}
                                {membership.phone && (
                                  <div className="flex items-center text-slate-300">
                                    <Phone className="h-3 w-3 mr-1 text-slate-400" />
                                    {membership.phone}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-sm">
                                <div className="font-medium text-white">{membership.membership_name}</div>
                                <div className="text-green-400 font-medium">
                                  ${membership.renewal_amount.toLocaleString()}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {getUrgencyBadge(Number(membership.days_until_expiry), membership.expiry_label)}
                              <div className="text-xs text-slate-400 mt-1">{membership.expiry_label}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-sm">
                                <div className="text-white font-medium">
                                  {formatDateForDisplay(membership.expiry_date)}
                                </div>
                                <div className="text-slate-400 flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {Number(membership.days_until_expiry) < 0
                                    ? `Venció hace ${Math.abs(membership.days_until_expiry)} días`
                                    : Number(membership.days_until_expiry) === 0
                                      ? "Hoy"
                                      : `${membership.days_until_expiry} días`}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleViewMember(membership)}
                                  className="bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/30 hover:text-blue-200 hover:border-blue-400/50 transition-all duration-200"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Ver Socio
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Detalles del Socio */}
      <MemberDetailsModal member={selectedMember} open={showMemberDetails} onOpenChange={setShowMemberDetails} />
    </>
  )
}
