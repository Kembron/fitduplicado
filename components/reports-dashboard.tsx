"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard,
  DollarSign,
  Calendar,
  Download,
  ArrowLeft,
  BarChart3,
  PieChartIcon as PieIcon,
  Target,
  Clock,
  AlertTriangle,
  Eye,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
} from "recharts"

interface ReportsData {
  totalRevenue: number
  monthlyRevenue: number
  revenueGrowth: number
  activeMembers: number
  newMembers: number
  memberGrowth: number
  avgMemberValue: number
  retentionRate: number
  monthlyRevenueData: Array<{ month: string; revenue: number }>
  membershipDistribution: Array<{ type: string; count: number; revenue: number }>
  activeMembersMonthlyData: Array<{ month: string; active: number }>
  memberGrowthData: Array<{ month: string; new: number; total: number }>
  pendingPayments: number
  expiringThisWeek: number
  avgStayDuration: number
  renewalRate: number
}

// Componente de tooltip personalizado para gráficos
const CustomTooltip = ({ active, payload, label, type = "revenue" }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-xl">
        <p className="text-slate-600 dark:text-slate-300 text-sm mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-slate-900 dark:text-slate-100 font-semibold">
            {entry.dataKey === "active"
              ? "Activos"
              : entry.dataKey === "revenue"
                ? "Ingresos"
                : entry.dataKey === "new"
                  ? "Nuevos Socios"
                  : entry.dataKey === "total"
                    ? "Total Socios"
                    : entry.name}
            : {type === "revenue" ? `$${entry.value.toLocaleString()}` : entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    )
  }
  return null
}

// Formatear valores del eje Y
const formatYAxis = (value: number, type = "revenue") => {
  if (type === "revenue") {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`
    }
    return `$${value}`
  }
  return value.toString()
}

// Función para formatear etiquetas del eje X según el período
const formatXAxisLabel = (value: string, period: string) => {
  // Si el período es largo (más de 12 meses), mostrar solo algunos labels para evitar solapamiento
  if (period === "24months" || period === "lifetime") {
    // Para períodos largos, mostrar solo cada 3 meses o cada 6 meses
    return value
  }
  return value
}

// Gráfico de ingresos moderno
const RevenueChart = ({ data, period }: { data: any[]; period: string }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 rounded-xl">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No hay datos de ingresos disponibles</p>
        </div>
      </div>
    )
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue))
  const avgRevenue = data.reduce((sum, item) => sum + item.revenue, 0) / data.length

  // Determinar el intervalo de etiquetas según la cantidad de datos
  const labelInterval = data.length > 24 ? Math.ceil(data.length / 12) : data.length > 12 ? 2 : 0

  return (
    <div className="space-y-4">
      <div className="h-80 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/50 rounded-xl p-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "currentColor", fontSize: 11, fontWeight: 500 }}
              className="text-slate-600 dark:text-slate-400"
              interval={labelInterval}
              angle={period === "24months" || period === "lifetime" ? -45 : 0}
              textAnchor={period === "24months" || period === "lifetime" ? "end" : "middle"}
              height={period === "24months" || period === "lifetime" ? 60 : 30}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "currentColor", fontSize: 12, fontWeight: 500 }}
              tickFormatter={(value) => formatYAxis(value, "revenue")}
              className="text-slate-600 dark:text-slate-400"
            />
            <Tooltip content={<CustomTooltip type="revenue" />} />
            <ReferenceLine
              y={avgRevenue}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: "Promedio",
                position: "topRight",
                fill: "#f59e0b",
                fontSize: 12,
                fontWeight: 500,
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#10b981"
              strokeWidth={3}
              fill="url(#revenueGradient)"
              dot={{ fill: "#10b981", strokeWidth: 2, stroke: "#ffffff", r: 4 }}
              activeDot={{ r: 6, fill: "#10b981", strokeWidth: 2, stroke: "#ffffff" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3 text-center border border-slate-200 dark:border-slate-700">
          <div className="text-lg font-bold text-emerald-600">${data[data.length - 1]?.revenue.toLocaleString()}</div>
          <div className="text-xs text-slate-500">Último mes</div>
        </div>
        <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3 text-center border border-slate-200 dark:border-slate-700">
          <div className="text-lg font-bold text-emerald-600">${Math.round(avgRevenue).toLocaleString()}</div>
          <div className="text-xs text-slate-500">Promedio</div>
        </div>
        <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3 text-center border border-slate-200 dark:border-slate-700">
          <div className="text-lg font-bold text-emerald-600">${maxRevenue.toLocaleString()}</div>
          <div className="text-xs text-slate-500">Máximo</div>
        </div>
        <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3 text-center border border-slate-200 dark:border-slate-700">
          <div className="text-lg font-bold text-emerald-600">
            ${data.reduce((sum, item) => sum + item.revenue, 0).toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">Total</div>
        </div>
      </div>
    </div>
  )
}

// Gráfico de crecimiento de socios - CORREGIDO para Vercel
const MemberGrowthChart = ({ data, period }: { data: any[]; period: string }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 rounded-xl">
        <div className="text-center">
          <Users className="h-12 w-12 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No hay datos de socios disponibles</p>
        </div>
      </div>
    )
  }

  // Determinar el intervalo de etiquetas según la cantidad de datos
  const labelInterval = data.length > 24 ? Math.ceil(data.length / 12) : data.length > 12 ? 2 : 0

  return (
    <div className="space-y-4">
      <div className="h-80 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/50 rounded-xl p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <defs>
              <linearGradient id="newMembersGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "currentColor", fontSize: 11, fontWeight: 500 }}
              className="text-slate-600 dark:text-slate-400"
              interval={labelInterval}
              angle={period === "24months" || period === "lifetime" ? -45 : 0}
              textAnchor={period === "24months" || period === "lifetime" ? "end" : "middle"}
              height={period === "24months" || period === "lifetime" ? 60 : 30}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "currentColor", fontSize: 12, fontWeight: 500 }}
              className="text-slate-600 dark:text-slate-400"
            />
            <Tooltip content={<CustomTooltip type="members" />} />
            <Bar dataKey="new" fill="url(#newMembersGradient)" name="Nuevos Socios" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3 text-center border border-slate-200 dark:border-slate-700">
          <div className="text-lg font-bold text-blue-600">{data[data.length - 1]?.total || 0}</div>
          <div className="text-xs text-slate-500">Total Actual</div>
        </div>
        <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3 text-center border border-slate-200 dark:border-slate-700">
          <div className="text-lg font-bold text-green-600">+{data.reduce((sum, item) => sum + item.new, 0)}</div>
          <div className="text-xs text-slate-500">Nuevos en Período</div>
        </div>
        <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3 text-center border border-slate-200 dark:border-slate-700">
          <div className="text-lg font-bold text-purple-600">
            {Math.round(data.reduce((sum, item) => sum + item.new, 0) / data.length)}
          </div>
          <div className="text-xs text-slate-500">Promedio/mes</div>
        </div>
        <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3 text-center border border-slate-200 dark:border-slate-700">
          <div className="text-lg font-bold text-orange-600">{data[data.length - 1]?.new || 0}</div>
          <div className="text-xs text-slate-500">Último Mes</div>
        </div>
      </div>
    </div>
  )
}

// Gráfico de socios activos mes a mes - CORREGIDO
const ActiveMembersChart = ({ data, period }: { data: any[]; period: string }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 rounded-xl">
        <div className="text-center">
          <Users className="h-12 w-12 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No hay datos de socios activos disponibles</p>
        </div>
      </div>
    )
  }

  const maxMembers = Math.max(...data.map((d) => d.active))
  const avgMembers = data.reduce((sum, item) => sum + item.active, 0) / data.length
  const currentMembers = data[data.length - 1]?.active || 0
  const previousMembers = data[data.length - 2]?.active || 0
  const growth = previousMembers ? Math.round(((currentMembers - previousMembers) / previousMembers) * 100) : 0

  // Determinar el intervalo de etiquetas según la cantidad de datos
  const labelInterval = data.length > 24 ? Math.ceil(data.length / 12) : data.length > 12 ? 2 : 0

  return (
    <div className="space-y-4">
      <div className="h-80 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/50 rounded-xl p-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <defs>
              <linearGradient id="activeMembersGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "currentColor", fontSize: 11, fontWeight: 500 }}
              className="text-slate-600 dark:text-slate-400"
              interval={labelInterval}
              angle={period === "24months" || period === "lifetime" ? -45 : 0}
              textAnchor={period === "24months" || period === "lifetime" ? "end" : "middle"}
              height={period === "24months" || period === "lifetime" ? 60 : 30}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "currentColor", fontSize: 12, fontWeight: 500 }}
              tickFormatter={(value) => value.toString()}
              className="text-slate-600 dark:text-slate-400"
            />
            <Tooltip content={<CustomTooltip type="members" />} />
            <ReferenceLine
              y={avgMembers}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: "Promedio",
                position: "topRight",
                fill: "#f59e0b",
                fontSize: 12,
                fontWeight: 500,
              }}
            />
            <Area
              type="monotone"
              dataKey="active"
              stroke="#3b82f6"
              strokeWidth={3}
              fill="url(#activeMembersGradient)"
              dot={{ fill: "#3b82f6", strokeWidth: 2, stroke: "#ffffff", r: 4 }}
              activeDot={{ r: 6, fill: "#3b82f6", strokeWidth: 2, stroke: "#ffffff" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3 text-center border border-slate-200 dark:border-slate-700">
          <div className="text-lg font-bold text-blue-600">{currentMembers}</div>
          <div className="text-xs text-slate-500">Actual</div>
        </div>
        <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3 text-center border border-slate-200 dark:border-slate-700">
          <div className="text-lg font-bold text-blue-600">{Math.round(avgMembers)}</div>
          <div className="text-xs text-slate-500">Promedio</div>
        </div>
        <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3 text-center border border-slate-200 dark:border-slate-700">
          <div className="text-lg font-bold text-blue-600">{maxMembers}</div>
          <div className="text-xs text-slate-500">Máximo</div>
        </div>
        <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3 text-center border border-slate-200 dark:border-slate-700">
          <div className={`text-lg font-bold ${growth >= 0 ? "text-green-600" : "text-red-600"}`}>
            {growth >= 0 ? "+" : ""}
            {growth}%
          </div>
          <div className="text-xs text-slate-500">vs Anterior</div>
        </div>
      </div>
    </div>
  )
}

// Gráfico de distribución de membresías mejorado
const MembershipDistribution = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 rounded-xl">
        <div className="text-center">
          <PieIcon className="h-12 w-12 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No hay datos de membresías disponibles</p>
        </div>
      </div>
    )
  }

  const total = data.reduce((sum, item) => sum + item.count, 0)
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]

  // Preparar datos para el gráfico de pie
  const pieData = data.map((item, index) => ({
    name: item.type,
    value: item.count,
    revenue: item.revenue,
    color: colors[index % colors.length],
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gráfico de pie */}
      <div className="h-64 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/50 rounded-xl p-4">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={5} dataKey="value">
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload
                  return (
                    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-xl">
                      <p className="text-slate-900 dark:text-slate-100 font-semibold">{data.name}</p>
                      <p className="text-slate-600 dark:text-slate-300 text-sm">
                        {data.value} socios ({((data.value / total) * 100).toFixed(1)}%)
                      </p>
                      <p className="text-slate-600 dark:text-slate-300 text-sm">
                        ${data.revenue.toLocaleString()} ingresos
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>

      {/* Lista detallada */}
      <div className="space-y-4">
        {data.map((item, index) => {
          const percentage = total > 0 ? (item.count / total) * 100 : 0
          return (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                  <span className="font-medium text-slate-900 dark:text-slate-100">{item.type}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900 dark:text-slate-100">{item.count} socios</div>
                  <div className="text-sm text-slate-500">${item.revenue.toLocaleString()}</div>
                </div>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: colors[index % colors.length],
                  }}
                />
              </div>
              <div className="text-xs text-slate-500 text-right">{percentage.toFixed(1)}% del total</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ReportsDashboard() {
  const [data, setData] = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState("6months")
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    fetchReportsData()
  }, [selectedPeriod])

  const fetchReportsData = async () => {
    try {
      setLoading(true)
      setError(null)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // Aumentar timeout para períodos largos

      const response = await fetch(`/api/reports?period=${selectedPeriod}`, {
        signal: controller.signal,
        headers: { "Cache-Control": "no-cache" },
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const reportsData = await response.json()
        setData(reportsData)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Error al cargar los reportes")
      }
    } catch (error) {
      if (error.name === "AbortError") {
        setError("La solicitud tardó demasiado tiempo")
      } else {
        setError("Error de conexión con el servidor")
      }
    } finally {
      setLoading(false)
    }
  }

  // Función para obtener el texto descriptivo del período
  const getPeriodDescription = (period: string) => {
    switch (period) {
      case "3months":
        return "Últimos 3 meses"
      case "6months":
        return "Últimos 6 meses"
      case "12months":
        return "Último año"
      case "24months":
        return "Últimos 2 años"
      case "lifetime":
        return "Desde el inicio"
      default:
        return "Período seleccionado"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container mx-auto px-4 py-6 space-y-6">
          {/* Header skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
              <div>
                <div className="w-48 h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2" />
                <div className="w-64 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* KPIs skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700"
              >
                <div className="animate-pulse">
                  <div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
                  <div className="w-20 h-8 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                  <div className="w-32 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              </div>
            ))}
          </div>

          {/* Chart skeleton */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="w-48 h-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-6" />
            <div className="h-80 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />
          </div>

          {/* Loading message for long periods */}
          {(selectedPeriod === "24months" || selectedPeriod === "lifetime") && (
            <div className="text-center">
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Cargando datos históricos... Esto puede tomar unos momentos.
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border border-slate-200 dark:border-slate-700">
              <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Error al cargar reportes
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
              <Button onClick={fetchReportsData} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border border-slate-200 dark:border-slate-700">
              <BarChart3 className="h-16 w-16 text-slate-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                No hay datos disponibles
              </h2>
              <p className="text-slate-600 dark:text-slate-400">No se pudieron obtener los datos de reportes</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const lastMonthRevenue = data.monthlyRevenueData[data.monthlyRevenueData.length - 1]?.revenue || 0
  const previousMonthRevenue = data.monthlyRevenueData[data.monthlyRevenueData.length - 2]?.revenue || 0
  const monthlyGrowth = previousMonthRevenue
    ? Math.round(((lastMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100)
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header moderno */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="outline" size="sm" className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                Reportes
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
                Panel analítico de FitHouse Gym 
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="3months">Últimos 3 meses</option>
              <option value="6months">Últimos 6 meses</option>
              <option value="12months">Último año</option>
              <option value="24months">Últimos 2 años</option>
              <option value="lifetime">Desde el inicio</option>
            </select>
            <Button variant="outline" size="sm" className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        

        {/* KPIs principales - Diseño moderno */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg group-hover:scale-110 transition-transform">
                  <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <Badge variant={data.revenueGrowth >= 0 ? "default" : "destructive"} className="text-xs">
                  {data.revenueGrowth >= 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {data.revenueGrowth >= 0 ? "+" : ""}
                  {data.revenueGrowth}%
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Ingresos Totales</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  ${data.totalRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500">vs mes anterior</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:scale-110 transition-transform">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <Badge
                  variant="secondary"
                  className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                >
                  +{data.newMembers} nuevos
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Socios Activos</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{data.activeMembers}</p>
                <p className="text-xs text-slate-500">este mes</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg group-hover:scale-110 transition-transform">
                  <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <Badge
                  variant="secondary"
                  className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                >
                  Por socio
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Valor Promedio</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">${data.avgMemberValue}</p>
                <p className="text-xs text-slate-500">mensual</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg group-hover:scale-110 transition-transform">
                  <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <Badge
                  variant="secondary"
                  className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                >
                  {data.avgStayDuration} meses
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Retención</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{data.retentionRate}%</p>
                <p className="text-xs text-slate-500">promedio</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs para diferentes vistas */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Resumen</span>
            </TabsTrigger>
            <TabsTrigger value="revenue" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Ingresos</span>
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Socios</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Alertas importantes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                      <CreditCard className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">Pagos Pendientes</p>
                      <p className="text-xl font-bold text-red-900 dark:text-red-100">
                        ${data.pendingPayments.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <Calendar className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-orange-800 dark:text-orange-200">Vencen Esta Semana</p>
                      <p className="text-xl font-bold text-orange-900 dark:text-orange-100">
                        {data.expiringThisWeek} socios
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">Tasa de Renovación</p>
                      <p className="text-xl font-bold text-green-900 dark:text-green-100">{data.renewalRate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Distribución de membresías */}
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span>Distribución de Membresías</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MembershipDistribution data={data.membershipDistribution} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6">
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <span>Evolución de Ingresos</span>
                  </CardTitle>
                  <Badge variant={monthlyGrowth >= 0 ? "default" : "destructive"}>
                    {monthlyGrowth >= 0 ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {monthlyGrowth >= 0 ? "+" : ""}
                    {monthlyGrowth}% último mes
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <RevenueChart data={data.monthlyRevenueData} period={selectedPeriod} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="space-y-6">
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span>Socios Activos por Mes</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ActiveMembersChart data={data.activeMembersMonthlyData} period={selectedPeriod} />
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span>Crecimiento de Socios</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MemberGrowthChart data={data.memberGrowthData} period={selectedPeriod} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
