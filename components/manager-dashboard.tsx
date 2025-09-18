"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, AlertCircle, Zap, ArrowRight, DollarSign } from "lucide-react"
import MembersTable from "@/components/members-table"
import NewMemberModal from "@/components/new-member-modal"
import NewPaymentModal from "@/components/new-payment-modal"
import SearchMembersModal from "@/components/search-members-modal"
import ExpiringMembershipsModal from "@/components/expiring-memberships-modal"
import PendingPaymentsModal from "@/components/pending-payments-modal"

interface ManagerDashboardStats {
  activeMembers: number
  newMembersThisMonth: number
  expiringMemberships: number
  pendingPayments: number
  pendingPaymentsCount: number
}

// Componente optimizado para estadísticas del manager
const ManagerStatsCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  loading,
  onClick,
  gradient,
  iconColor,
  subtitleColor = "text-slate-400",
}: {
  title: string
  value: string | number
  subtitle: string
  icon: any
  loading: boolean
  onClick?: () => void
  gradient: string
  iconColor: string
  subtitleColor?: string
}) => {
  const cardClasses = useMemo(
    () =>
      `bg-slate-800/50 border-slate-700/50 backdrop-blur-xl hover:border-blue-500/30 transition-all duration-300 group overflow-hidden relative ${onClick ? "cursor-pointer" : ""}`,
    [onClick],
  )

  if (loading) {
    return (
      <Card className={cardClasses}>
        <div
          className={`absolute inset-0 ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
        ></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3 relative z-10 p-4 sm:p-6">
          <Skeleton className="h-4 w-24 bg-slate-600" />
          <Skeleton className="h-8 w-8 rounded-lg bg-slate-600" />
        </CardHeader>
        <CardContent className="relative z-10 p-4 sm:p-6 pt-0">
          <Skeleton className="h-8 w-16 mb-2 bg-slate-600" />
          <Skeleton className="h-4 w-20 bg-slate-600" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cardClasses} onClick={onClick ? onClick : undefined}>
      <div
        className={`absolute inset-0 ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
      ></div>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3 relative z-10 p-4 sm:p-6">
        <CardTitle className="text-xs sm:text-sm font-medium text-slate-300">{title}</CardTitle>
        <div className={`p-1.5 sm:p-2 ${iconColor} rounded-lg`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </CardHeader>
      <CardContent className="relative z-10 p-4 sm:p-6 pt-0">
        <div className="text-2xl sm:text-3xl font-bold text-white mb-1">{value}</div>
        <div className={`text-xs sm:text-sm ${subtitleColor}`}>{subtitle}</div>
      </CardContent>
      {onClick && (
        <div className="absolute bottom-2 right-2 text-blue-400/70 opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </div>
      )}
    </Card>
  )
}

export default function ManagerDashboard() {
  const [stats, setStats] = useState<ManagerDashboardStats>({
    activeMembers: 0,
    newMembersThisMonth: 0,
    expiringMemberships: 0,
    pendingPayments: 0,
    pendingPaymentsCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estados para modales
  const [showExpiringMembershipsModal, setShowExpiringMembershipsModal] = useState(false)
  const [showPendingPaymentsModal, setShowPendingPaymentsModal] = useState(false)

  // Crear una referencia para el modal de búsqueda
  const searchMembersModalRef = useRef<{ setOpen: (open: boolean) => void } | null>(null)

  // Función optimizada para cargar estadísticas necesarias para manager (incluyendo pagos vencidos)
  const fetchManagerStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🎯 Manager Dashboard: Fetching manager stats with pending payments...")

      // Usar la API de dashboard pero solo extraer lo que necesita el manager
      const res = await fetch("/api/stats/dashboard", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      })

      if (res.ok) {
        const data = await res.json()
        console.log("🎯 Manager Dashboard: Full stats received:", data)

        // Mapear solo los datos que necesita el manager (incluyendo pagos vencidos)
        const managerStats = {
          activeMembers: data.activeMembers || 0,
          newMembersThisMonth: data.newMembersThisMonth || 0,
          expiringMemberships: data.expiringMemberships || 0,
          pendingPayments: data.pendingPayments || 0,
          pendingPaymentsCount: data.pendingPaymentsCount || 0,
        }

        console.log("🎯 Manager Dashboard: Filtered stats for manager:", managerStats)
        setStats(managerStats)
      } else {
        const errorData = await res.json().catch(() => ({ error: "Error desconocido" }))
        setError(`Error ${res.status}: ${errorData.error || "Error al cargar datos"}`)
      }
    } catch (err) {
      console.error("🎯 Manager Dashboard fetch error:", err)
      setError("Error de conexión con el servidor")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchManagerStats()
  }, [fetchManagerStats])

  const handleRetry = useCallback(() => {
    fetchManagerStats()
  }, [fetchManagerStats])

  if (error && !loading) {
    return (
      <div className="flex items-center justify-center h-64 px-4">
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl p-4 sm:p-8 w-full max-w-md">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 sm:h-12 sm:w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">Error al cargar el dashboard</h2>
            <p className="text-slate-400 mb-4 text-sm sm:text-base">{error}</p>
            <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2 sm:space-y-0">
              <Button onClick={handleRetry} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
                Reintentar
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="border-slate-600 text-slate-300 w-full sm:w-auto"
              >
                Recargar página
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8 fade-in px-4 sm:px-0">
      {/* Stats Cards - Incluyendo pagos vencidos para manager */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <ManagerStatsCard
          title="Socios Activos"
          value={loading ? "..." : stats.activeMembers}
          subtitle={`+${loading ? "..." : stats.newMembersThisMonth} este mes`}
          icon={Users}
          loading={loading}
          onClick={() => searchMembersModalRef.current?.setOpen(true)}
          gradient="bg-gradient-to-br from-blue-500/10 to-transparent"
          iconColor="bg-blue-500/20 text-blue-400"
          subtitleColor="text-green-400"
        />

        <ManagerStatsCard
          title="Pagos Vencidos"
          value={loading ? "..." : stats.pendingPaymentsCount}
          subtitle={`$${loading ? "..." : stats.pendingPayments.toLocaleString()} pendientes`}
          icon={DollarSign}
          loading={loading}
          onClick={() => setShowPendingPaymentsModal(true)}
          gradient="bg-gradient-to-br from-red-500/10 to-transparent"
          iconColor="bg-red-500/20 text-red-400"
          subtitleColor="text-red-400"
        />

        <ManagerStatsCard
          title="Vencimientos Próximos"
          value={loading ? "..." : stats.expiringMemberships}
          subtitle="Próximos 30 días"
          icon={AlertCircle}
          loading={loading}
          onClick={() => setShowExpiringMembershipsModal(true)}
          gradient="bg-gradient-to-br from-orange-500/10 to-transparent"
          iconColor="bg-orange-500/20 text-orange-400"
          subtitleColor="text-orange-400"
        />

        {/* Espacio para una cuarta estadística si es necesaria en el futuro */}
      </div>

      {/* Quick Actions - Solo las permitidas para manager */}
      <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
            <CardTitle className="text-white text-base sm:text-lg">Acciones Principales</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <NewMemberModal />
            <NewPaymentModal />
            <SearchMembersModal ref={searchMembersModalRef} />
          </div>
        </CardContent>
      </Card>

      {/* Members Table - Tabla de socios recientes */}
      <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
              <CardTitle className="text-white text-sm sm:text-base">Socios Recientes</CardTitle>
            </div>
            <div className="block">
              <SearchMembersModal />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <MembersTable limit={8} viewOnly={true} hideActions={false} />
        </CardContent>
      </Card>

      {/* Modales */}
      <ExpiringMembershipsModal open={showExpiringMembershipsModal} onOpenChange={setShowExpiringMembershipsModal} />
      <PendingPaymentsModal open={showPendingPaymentsModal} onOpenChange={setShowPendingPaymentsModal} />
    </div>
  )
}
