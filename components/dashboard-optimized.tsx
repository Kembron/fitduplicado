"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Users,
  CreditCard,
  TrendingUp,
  AlertCircle,
  Zap,
  Target,
  ArrowRight,
  Shield,
  Settings,
  Mail,
  Eye,
  EyeOff,
} from "lucide-react"
import Link from "next/link"
import MembersTable from "@/components/members-table"
import RevenueChart from "@/components/revenue-chart"
import NewMemberModal from "@/components/new-member-modal"
import NewPaymentModal from "@/components/new-payment-modal"
import SearchMembersModal from "@/components/search-members-modal"
import PendingPaymentsModal from "@/components/pending-payments-modal"
import ExpiringMembershipsModal from "@/components/expiring-memberships-modal"
import DailyPaymentsDetailedModalWrapper from "@/components/daily-payments-detailed-modal-wrapper"
import ConfigurationModal from "@/components/configuration-modal"
import EmailManagementModal from "@/components/email-management-modal"
import ManagerDashboard from "@/components/manager-dashboard"

interface DashboardStats {
  activeMembers: number
  newMembersThisMonth: number
  monthlyRevenue: number
  dailyRevenue: number
  revenueGrowth: number
  pendingPayments: number
  pendingPaymentsCount: number
  expiringMemberships: number
}

interface User {
  userId: number
  email: string
  name: string
  role: string
}

// Componente optimizado para botones de admin con loading state
const AdminButtons = ({ userRole, loading }: { userRole: string | null; loading: boolean }) => {
  console.log("🔍 AdminButtons: userRole =", userRole, "loading =", loading)

  if (loading) {
    console.log("🔍 AdminButtons: Showing loading state")
    return (
      <div className="flex gap-2">
        <Skeleton className="h-9 w-32 bg-slate-700" />
        <Skeleton className="h-9 w-24 bg-slate-700" />
      </div>
    )
  }

  if (userRole !== "admin") {
    console.log("🔍 AdminButtons: Not admin, hiding buttons. Role:", userRole)
    return null
  }

  console.log("✅ AdminButtons: Showing admin buttons")
  return (
    <>
      <ConfigurationButton />
      <EmailButton />
    </>
  )
}

// Componentes separados para mejor rendimiento
const ConfigurationButton = () => {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        variant="outline"
        className="border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white bg-slate-800/30 backdrop-blur-sm transition-all duration-300 w-full sm:w-auto text-xs sm:text-sm"
      >
        <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
        Configuración
      </Button>
      <ConfigurationModal open={showModal} onOpenChange={setShowModal} />
    </>
  )
}

const EmailButton = () => {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        variant="outline"
        className="border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white bg-slate-800/30 backdrop-blur-sm transition-all duration-300 w-full sm:w-auto text-xs sm:text-sm"
      >
        <Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
        Emails
      </Button>
      <EmailManagementModal open={showModal} onOpenChange={setShowModal} />
    </>
  )
}

// Modify the StatsCard component to include subtitle color
const StatsCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  loading,
  onClick,
  gradient,
  iconColor,
  canToggleVisibility = false,
  subtitleColor = "text-slate-400", // Add this parameter with default value
}: {
  title: string
  value: string | number
  subtitle: string
  icon: any
  loading: boolean
  onClick?: () => void
  gradient: string
  iconColor: string
  canToggleVisibility?: boolean
  subtitleColor?: string // Add this to the type definition
}) => {
  const [isBlurred, setIsBlurred] = useState(false)

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
        <div className="flex items-center gap-2">
          {canToggleVisibility && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsBlurred(!isBlurred)
              }}
              className="p-1 rounded-md hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
            >
              {isBlurred ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
          <div className={`p-1.5 sm:p-2 ${iconColor} rounded-lg`}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative z-10 p-4 sm:p-6 pt-0">
        <div className={`text-2xl sm:text-3xl font-bold text-white mb-1 ${isBlurred ? "blur-sm select-none" : ""}`}>
          {value}
        </div>
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

export default function DashboardOptimized() {
  console.log("🚀 Dashboard: Component initializing...")

  const [stats, setStats] = useState<DashboardStats>({
    activeMembers: 0,
    newMembersThisMonth: 0,
    monthlyRevenue: 0,
    dailyRevenue: 0,
    revenueGrowth: 0,
    pendingPayments: 0,
    pendingPaymentsCount: 0,
    expiringMemberships: 0,
  })
  const [loading, setLoading] = useState(true)
  const [userLoading, setUserLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [showRevenue, setShowRevenue] = useState(false)

  // Estados para modales
  const [showPendingPaymentsModal, setShowPendingPaymentsModal] = useState(false)
  const [showExpiringMembershipsModal, setShowExpiringMembershipsModal] = useState(false)
  const [showMonthlyRevenueModal, setShowMonthlyRevenueModal] = useState(false)
  const [showDailyPaymentsModal, setShowDailyPaymentsModal] = useState(false)

  // Crear una referencia para el modal de búsqueda
  const searchMembersModalRef = useRef<{ setOpen: (open: boolean) => void } | null>(null)

  // Función optimizada para cargar estadísticas - USAR LA API OPTIMIZADA
  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("📊 Dashboard: Fetching stats from optimized API...")

      // USAR LA API OPTIMIZADA que tiene la lógica correcta de fechas
      const res = await fetch("/api/stats/dashboard-optimized", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      })

      if (res.ok) {
        const data = await res.json()
        console.log("✅ Dashboard: Stats received:", data)
        setStats(data)
      } else {
        const errorData = await res.json().catch(() => ({ error: "Error desconocido" }))
        console.error("❌ Dashboard: Stats error:", errorData)
        setError(`Error ${res.status}: ${errorData.error || "Error al cargar datos"}`)
      }
    } catch (err) {
      console.error("❌ Dashboard: Stats fetch error:", err)
      setError("Error de conexión con el servidor")
    } finally {
      setLoading(false)
      console.log("📊 Dashboard: Stats loading finished")
    }
  }, [])

  // Función optimizada para cargar usuario - SIMPLIFICADA
  const fetchUser = useCallback(async () => {
    try {
      setUserLoading(true)
      console.log("👤 Dashboard: Fetching user data...")

      // Usar debug-user que sabemos que funciona
      const res = await fetch("/api/debug-user", {
        cache: "no-store",
      })

      console.log("👤 Dashboard: API response status:", res.status)

      if (res.ok) {
        const userData = await res.json()
        console.log("👤 Dashboard: Raw API response:", JSON.stringify(userData, null, 2))

        if (userData.user) {
          console.log("👤 Dashboard: User object found:", JSON.stringify(userData.user, null, 2))
          console.log("👤 Dashboard: User role specifically:", userData.user.role)
          console.log("👤 Dashboard: User role type:", typeof userData.user.role)
          console.log("👤 Dashboard: Role === 'manager':", userData.user.role === "manager")
          console.log("👤 Dashboard: Role === 'admin':", userData.user.role === "admin")

          setUser(userData.user)
          console.log("✅ Dashboard: User state set successfully")
        } else {
          console.error("❌ Dashboard: No user data in response")
        }
      } else {
        console.error("❌ Dashboard: Failed to fetch user data:", res.status)
      }
    } catch (error) {
      console.error("❌ Dashboard: Error fetching user data:", error)
    } finally {
      setUserLoading(false)
      console.log("👤 Dashboard: User loading finished")
    }
  }, [])

  // SINGLE useEffect que maneja todo el flujo
  useEffect(() => {
    const loadDashboard = async () => {
      console.log("🔄 Dashboard: Starting load sequence...")

      // 1. Cargar usuario primero
      await fetchUser()
    }

    loadDashboard()
  }, [fetchUser])

  // Separate useEffect SOLO para stats después de tener usuario
  useEffect(() => {
    console.log("🔄 Dashboard: Stats useEffect triggered")
    console.log("🔄 Dashboard: userLoading =", userLoading)
    console.log("🔄 Dashboard: user =", user)
    console.log("🔄 Dashboard: user?.role =", user?.role)

    if (!userLoading && user) {
      console.log("🔄 Dashboard: User loaded, role:", user.role)
      console.log("🔄 Dashboard: Role type:", typeof user.role)
      console.log("🔄 Dashboard: Is manager?", user.role === "manager")
      console.log("🔄 Dashboard: Is admin?", user.role === "admin")

      // IMPORTANTE: Solo cargar stats si NO es manager
      if (user.role === "manager") {
        console.log("🎯 Dashboard: Manager detected - skipping stats load")
        setLoading(false)
        return
      }

      console.log("📊 Dashboard: Loading full stats for admin user")
      fetchStats()
    } else {
      console.log("⏳ Dashboard: Still loading user or no user found")
    }
  }, [user, userLoading, fetchStats])

  // Memoizar valores calculados
  const formattedRevenue = useMemo(() => {
    return showRevenue
      ? `$${stats.monthlyRevenue.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
      : `$${stats.monthlyRevenue.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }, [stats.monthlyRevenue, showRevenue])

  const handleRetry = useCallback(() => {
    fetchStats()
  }, [fetchStats])

  console.log("🔍 Dashboard: Current state:")
  console.log("  - userLoading:", userLoading)
  console.log("  - user:", user)
  console.log("  - user?.role:", user?.role)
  console.log("  - loading:", loading)
  console.log("  - error:", error)

  if (error && !loading) {
    console.log("❌ Dashboard: Showing error state")
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
                className="border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white bg-slate-800/30 backdrop-blur-sm transition-all duration-300 w-full sm:w-auto"
              >
                Recargar página
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // Loading state mientras carga usuario
  if (userLoading) {
    console.log("⏳ Dashboard: Showing loading state...")
    return (
      <div className="space-y-6 sm:space-y-8 fade-in px-4 sm:px-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl">
              <CardHeader className="p-4 sm:p-6">
                <Skeleton className="h-4 w-24 bg-slate-600" />
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <Skeleton className="h-8 w-16 mb-2 bg-slate-600" />
                <Skeleton className="h-4 w-20 bg-slate-600" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // CRITICAL: Check for manager role FIRST and EARLY
  if (user?.role === "manager") {
    console.log("🎯 Dashboard: ✅ RENDERING MANAGER DASHBOARD for role:", user.role)
    console.log("🎯 Dashboard: User object:", JSON.stringify(user, null, 2))
    return <ManagerDashboard />
  }

  console.log("🏢 Dashboard: ✅ RENDERING ADMIN DASHBOARD for role:", user?.role || "unknown")
  console.log("🏢 Dashboard: User object:", JSON.stringify(user, null, 2))

  // Keep the existing return statement for admin users
  return (
    <div className="space-y-6 sm:space-y-8 fade-in px-4 sm:px-0">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatsCard
          title="Socios Activos"
          value={loading ? "..." : stats.activeMembers}
          subtitle={`+${loading ? "..." : stats.newMembersThisMonth} últimos 30 días`}
          icon={Users}
          loading={loading}
          onClick={() => searchMembersModalRef.current?.setOpen(true)}
          gradient="bg-gradient-to-br from-blue-500/10 to-transparent"
          iconColor="bg-blue-500/20 text-blue-400"
          subtitleColor="text-green-400"
        />

        <StatsCard
          title="Ingresos (mes actual)"
          value={loading ? "..." : formattedRevenue}
          subtitle={`Hoy: $${loading ? "..." : (stats.dailyRevenue || 0).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          icon={TrendingUp}
          loading={loading}
          onClick={() => setShowDailyPaymentsModal(true)}
          gradient="bg-gradient-to-br from-green-500/10 to-transparent"
          iconColor="bg-green-500/20 text-green-400"
          canToggleVisibility={true}
          subtitleColor="text-blue-400"
        />

        <StatsCard
          title="Pagos Vencidos"
          value={
            loading
              ? "..."
              : `$${stats.pendingPayments.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
          }
          subtitle={`${loading ? "..." : stats.pendingPaymentsCount} socios`}
          icon={CreditCard}
          loading={loading}
          onClick={() => setShowPendingPaymentsModal(true)}
          gradient="bg-gradient-to-br from-red-500/10 to-transparent"
          iconColor="bg-red-500/20 text-red-400"
          subtitleColor="text-red-400"
        />

        <StatsCard
          title="Vencimientos Próximos"
          value={loading ? "..." : stats.expiringMemberships}
          subtitle="En esta Semana"
          icon={AlertCircle}
          loading={loading}
          onClick={() => setShowExpiringMembershipsModal(true)}
          gradient="bg-gradient-to-br from-orange-500/10 to-transparent"
          iconColor="bg-orange-500/20 text-orange-400"
          subtitleColor="text-orange-400"
        />
      </div>

      {/* Quick Actions */}
      <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
            <CardTitle className="text-white text-base sm:text-lg">Acciones Rápidas</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-4">
            <NewMemberModal />
            <NewPaymentModal />
            <SearchMembersModal ref={searchMembersModalRef} />
            <Link href="/reports" prefetch={true} className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white bg-slate-800/30 backdrop-blur-sm transition-all duration-300 w-full sm:w-auto text-xs sm:text-sm"
              >
                <Target className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Reportes
              </Button>
            </Link>
            <Link href="/audit" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white bg-slate-800/30 backdrop-blur-sm transition-all duration-300 w-full sm:w-auto text-xs sm:text-sm"
              >
                <Shield className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Auditoría
              </Button>
            </Link>
            <AdminButtons userRole={user?.role || null} loading={userLoading} />
          </div>
        </CardContent>
      </Card>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
              <CardTitle className="text-white text-sm sm:text-base">Ingresos Últimos 6 Meses</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <RevenueChart />
          </CardContent>
        </Card>

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
            <MembersTable limit={5} viewOnly={true} hideActions={true} />
          </CardContent>
        </Card>
      </div>

      {/* Modales */}
      <PendingPaymentsModal open={showPendingPaymentsModal} onOpenChange={setShowPendingPaymentsModal} />
      <ExpiringMembershipsModal open={showExpiringMembershipsModal} onOpenChange={setShowExpiringMembershipsModal} />
      <DailyPaymentsDetailedModalWrapper
        open={showDailyPaymentsModal}
        onOpenChange={setShowDailyPaymentsModal}
        days={30}
      />
    </div>
  )
}
