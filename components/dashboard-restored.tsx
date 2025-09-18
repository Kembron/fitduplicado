"use client"

import { useState, useEffect, useCallback } from "react"
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
import MonthlyRevenueModal from "@/components/monthly-revenue-modal"
import ConfigurationModal from "@/components/configuration-modal"
import EmailManagementModal from "@/components/email-management-modal"

interface DashboardStats {
  activeMembers: number
  newMembersThisMonth: number
  monthlyRevenue: number
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

export default function DashboardRestored() {
  const [stats, setStats] = useState<DashboardStats>({
    activeMembers: 0,
    newMembersThisMonth: 0,
    monthlyRevenue: 0,
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
  const [showSearchMembersModal, setShowSearchMembersModal] = useState(false)
  const [showPendingPaymentsModal, setShowPendingPaymentsModal] = useState(false)
  const [showExpiringMembershipsModal, setShowExpiringMembershipsModal] = useState(false)
  const [showMonthlyRevenueModal, setShowMonthlyRevenueModal] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)

  // Función optimizada para cargar estadísticas
  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch("/api/stats/dashboard-optimized", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      })

      if (res.ok) {
        const data = await res.json()
        setStats(data)
      } else {
        const errorData = await res.json().catch(() => ({ error: "Error desconocido" }))
        setError(`Error ${res.status}: ${errorData.error || "Error al cargar datos"}`)
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err)
      setError("Error de conexión con el servidor")
    } finally {
      setLoading(false)
    }
  }, [])

  // Función optimizada para cargar usuario
  const fetchUser = useCallback(async () => {
    try {
      setUserLoading(true)
      const res = await fetch("/api/debug-user", {
        cache: "force-cache",
      })
      if (res.ok) {
        const userData = await res.json()
        setUser(userData.user)
      }
    } catch (error) {
      console.error("Error fetching user:", error)
    } finally {
      setUserLoading(false)
    }
  }, [])

  useEffect(() => {
    Promise.all([fetchStats(), fetchUser()])
  }, [fetchStats, fetchUser])

  const formatRevenue = (amount: number) => {
    return `$${amount.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  const formatGrowth = (growth: number) => {
    const sign = growth >= 0 ? "+" : ""
    return `${sign}${growth.toFixed(1)}%`
  }

  if (error && !loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl p-8 w-full max-w-md">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Error al cargar el dashboard</h2>
            <p className="text-slate-400 mb-4">{error}</p>
            <div className="flex space-x-2">
              <Button onClick={fetchStats} className="bg-blue-600 hover:bg-blue-700">
                Reintentar
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="border-slate-600 text-slate-300"
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
    <div className="space-y-8 fade-in">
      {/* Stats Cards - Diseño original exacto */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Socios Activos */}
        <Card
          className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl hover:border-blue-500/30 transition-all duration-300 group overflow-hidden relative cursor-pointer"
          onClick={() => setShowSearchMembersModal(true)}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-slate-300">Socios Activos</CardTitle>
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            {loading ? (
              <>
                <Skeleton className="h-8 w-16 mb-2 bg-slate-600" />
                <Skeleton className="h-4 w-20 bg-slate-600" />
              </>
            ) : (
              <>
                <div className="text-3xl font-bold text-white mb-1">{stats.activeMembers}</div>
                <div className="text-slate-400 text-sm flex items-center">
                  <span className="text-green-400 mr-1">+{stats.newMembersThisMonth}</span>
                  este mes
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Ingresos Mensuales con botón blur */}
        <Card
          className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl hover:border-green-500/30 transition-all duration-300 group overflow-hidden relative cursor-pointer"
          onClick={() => setShowMonthlyRevenueModal(true)}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-slate-300">Ingresos Mensuales</CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowRevenue(!showRevenue)
                }}
                className="p-1 h-6 w-6 text-slate-400 hover:text-white"
              >
                {showRevenue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <div className="p-2 bg-green-500/20 text-green-400 rounded-lg">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            {loading ? (
              <>
                <Skeleton className="h-8 w-24 mb-2 bg-slate-600" />
                <Skeleton className="h-4 w-28 bg-slate-600" />
              </>
            ) : (
              <>
                <div className="text-3xl font-bold text-white mb-1">
                  {showRevenue ? formatRevenue(stats.monthlyRevenue) : "••••••"}
                </div>
                <div className="text-slate-400 text-sm flex items-center">
                  <span className={`mr-1 ${stats.revenueGrowth >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {formatGrowth(stats.revenueGrowth)}
                  </span>
                  vs mes anterior
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Pagos Vencidos */}
        <Card
          className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl hover:border-red-500/30 transition-all duration-300 group overflow-hidden relative cursor-pointer"
          onClick={() => setShowPendingPaymentsModal(true)}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-slate-300">Pagos Vencidos</CardTitle>
            <div className="p-2 bg-red-500/20 text-red-400 rounded-lg">
              <CreditCard className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            {loading ? (
              <>
                <Skeleton className="h-8 w-20 mb-2 bg-slate-600" />
                <Skeleton className="h-4 w-16 bg-slate-600" />
              </>
            ) : (
              <>
                <div className="text-3xl font-bold text-white mb-1">{formatRevenue(stats.pendingPayments)}</div>
                <div className="text-slate-400 text-sm flex items-center">
                  <span className="text-red-400 mr-1">{stats.pendingPaymentsCount}</span>
                  socios
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Vencimientos Próximos */}
        <Card
          className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl hover:border-orange-500/30 transition-all duration-300 group overflow-hidden relative cursor-pointer"
          onClick={() => setShowExpiringMembershipsModal(true)}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-slate-300">Vencimientos Próximos</CardTitle>
            <div className="p-2 bg-orange-500/20 text-orange-400 rounded-lg">
              <AlertCircle className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            {loading ? (
              <>
                <Skeleton className="h-8 w-8 mb-2 bg-slate-600" />
                <Skeleton className="h-4 w-24 bg-slate-600" />
              </>
            ) : (
              <>
                <div className="text-3xl font-bold text-white mb-1">{stats.expiringMemberships}</div>
                <div className="text-slate-400 text-sm flex items-center">
                  <span className="text-orange-400 mr-1">Próximos</span>
                  30 días
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Diseño original */}
      <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-blue-400" />
            <CardTitle className="text-white">Acciones Rápidas</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <NewMemberModal />
            <NewPaymentModal />
            <SearchMembersModal />
            <Link href="/reports">
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white bg-slate-800/30 backdrop-blur-sm transition-all duration-300"
              >
                <Target className="h-4 w-4 mr-2" />
                Reportes
              </Button>
            </Link>
            <Link href="/audit">
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white bg-slate-800/30 backdrop-blur-sm transition-all duration-300"
              >
                <Shield className="h-4 w-4 mr-2" />
                Auditoría
              </Button>
            </Link>
            {/* Botones de admin con loading state */}
            {userLoading ? (
              <>
                <Skeleton className="h-9 w-32 bg-slate-700" />
                <Skeleton className="h-9 w-24 bg-slate-700" />
              </>
            ) : (
              user?.role === "admin" && (
                <>
                  <Button
                    onClick={() => setShowConfigModal(true)}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white bg-slate-800/30 backdrop-blur-sm transition-all duration-300"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configuración
                  </Button>
                  <Button
                    onClick={() => setShowEmailModal(true)}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white bg-slate-800/30 backdrop-blur-sm transition-all duration-300"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Emails
                  </Button>
                </>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Charts and Tables - Diseño original */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-400" />
              <CardTitle className="text-white">Ingresos Últimos 6 Meses</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <RevenueChart />
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-400" />
                <CardTitle className="text-white">Socios Recientes</CardTitle>
              </div>
              <SearchMembersModal />
            </div>
          </CardHeader>
          <CardContent>
            <MembersTable limit={5} viewOnly={true} hideActions={true} />
          </CardContent>
        </Card>
      </div>

      {/* Modales */}
      <PendingPaymentsModal open={showPendingPaymentsModal} onOpenChange={setShowPendingPaymentsModal} />
      <ExpiringMembershipsModal open={showExpiringMembershipsModal} onOpenChange={setShowExpiringMembershipsModal} />
      <MonthlyRevenueModal open={showMonthlyRevenueModal} onOpenChange={setShowMonthlyRevenueModal} />
      <ConfigurationModal open={showConfigModal} onOpenChange={setShowConfigModal} />
      <EmailManagementModal open={showEmailModal} onOpenChange={setShowEmailModal} />
    </div>
  )
}
