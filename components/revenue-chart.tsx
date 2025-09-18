"use client"

import { useState, useEffect, useMemo } from "react"
import { TrendingUp, TrendingDown, DollarSign, Calendar, AlertCircle, Loader2, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { debugDate, getCurrentMonthInfo } from "@/lib/date-utils"

interface RevenueData {
  month: string
  revenue: number
}

const MONTHS_FULL = {
  Jan: "Enero",
  Feb: "Febrero",
  Mar: "Marzo",
  Apr: "Abril",
  May: "Mayo",
  Jun: "Junio",
  Jul: "Julio",
  Aug: "Agosto",
  Sep: "Septiembre",
  Oct: "Octubre",
  Nov: "Noviembre",
  Dec: "Diciembre",
}

const MONTHS_SHORT = {
  Jan: "Ene",
  Feb: "Feb",
  Mar: "Mar",
  Apr: "Abr",
  May: "May",
  Jun: "Jun",
  Jul: "Jul",
  Aug: "Ago",
  Sep: "Sep",
  Oct: "Oct",
  Nov: "Nov",
  Dec: "Dic",
}

// Componente personalizado para el tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]
    return (
      <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-600/50 rounded-lg px-3 py-2 shadow-xl">
        <p className="text-slate-300 text-xs mb-1">{MONTHS_FULL[label as keyof typeof MONTHS_FULL] || label}</p>
        <p className="text-white font-semibold">${data.value.toLocaleString("es-AR")}</p>
      </div>
    )
  }
  return null
}

// Formatear valores del eje Y
const formatYAxis = (value: number) => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`
  }
  return `$${value}`
}

export default function RevenueChart() {
  const [data, setData] = useState<RevenueData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showTable, setShowTable] = useState(false)
  const [showDebugInfo, setShowDebugInfo] = useState(false)

  useEffect(() => {
    async function fetchRevenueData() {
      try {
        setIsLoading(true)
        setError(null)

        // Debug de fechas antes de hacer la consulta
        debugDate("Revenue Chart Component")
        const monthInfo = getCurrentMonthInfo()
        console.log("📊 Revenue Chart - Información del mes actual:", monthInfo)

        const response = await fetch("/api/stats/revenue", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Error desconocido" }))
          throw new Error(errorData.error || `Error ${response.status}`)
        }

        const revenueData = await response.json()

        if (!Array.isArray(revenueData)) {
          throw new Error("Formato de datos inválido")
        }

        console.log("📊 Revenue Chart - Datos recibidos:", revenueData)
        setData(revenueData)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error desconocido"
        console.error("Error fetching revenue data:", err)
        setError(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRevenueData()
  }, [])

  const stats = useMemo(() => {
    if (!data || data.length === 0) return null

    const revenues = data.map((d) => d.revenue)
    const maxRevenue = Math.max(...revenues)
    const minRevenue = Math.min(...revenues)
    const totalRevenue = revenues.reduce((sum, revenue) => sum + revenue, 0)
    const currentMonthRevenue = data.length > 0 ? data[data.length - 1].revenue : 0
    const previousMonthRevenue = data.length > 1 ? data[data.length - 2].revenue : 0

    let growthPercentage = 0
    if (previousMonthRevenue > 0) {
      growthPercentage = Math.round(((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100)
    } else if (currentMonthRevenue > 0 && previousMonthRevenue === 0) {
      growthPercentage = 100
    }

    const averageRevenue = Math.round(totalRevenue / data.length)

    return {
      maxRevenue,
      minRevenue,
      totalRevenue,
      currentMonthRevenue,
      previousMonthRevenue,
      growthPercentage,
      averageRevenue,
    }
  }, [data])

  // Preparar datos para Recharts
  const chartData = useMemo(() => {
    return data.map((item) => ({
      month: MONTHS_SHORT[item.month as keyof typeof MONTHS_SHORT] || item.month,
      revenue: item.revenue,
      fullMonth: MONTHS_FULL[item.month as keyof typeof MONTHS_FULL] || item.month,
    }))
  }, [data])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          
         
        </div>

        {/* Loading Chart */}
        <div className="bg-slate-800/20 rounded-lg p-6 h-80 flex items-center justify-center border border-slate-700/30">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
            <p className="text-slate-400 text-sm">Cargando datos de ingresos...</p>
          </div>
        </div>

        {/* Loading Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-800/30 rounded-lg p-4 animate-pulse border border-slate-700/30">
              <div className="h-4 bg-slate-700/50 rounded mb-2"></div>
              <div className="h-8 bg-slate-700/50 rounded mb-2"></div>
              <div className="h-3 bg-slate-700/50 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          
        </div>

        {/* Error Chart */}
        <div className="bg-slate-800/20 rounded-lg p-6 h-80 flex items-center justify-center border border-slate-700/30">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 mb-2 text-sm">Error al cargar gráfico</p>
            <p className="text-slate-400 text-xs">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!data || data.length === 0 || !stats) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          
          
        </div>

        {/* Empty Chart */}
        <div className="bg-slate-800/20 rounded-lg p-6 h-80 flex items-center justify-center border border-slate-700/30">
          <div className="text-center">
            <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-400 text-sm">No hay datos de ingresos disponibles</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
       
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
             
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="text-xs">Ver información de debug</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Debug Info */}
      {showDebugInfo && (
        <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30 backdrop-blur-sm">
          <h4 className="text-sm font-semibold text-white mb-2">🔍 Información de Debug</h4>
          <div className="text-xs text-slate-300 space-y-1">
            <p>
              <strong>Zona horaria:</strong> America/Montevideo
            </p>
            <p>
              <strong>Fecha actual (Uruguay):</strong> {getCurrentMonthInfo().currentDate}
            </p>
            <p>
              <strong>Inicio del mes:</strong> {getCurrentMonthInfo().monthStart}
            </p>
            <p>
              <strong>Datos recibidos:</strong> {data.length} meses
            </p>
            <p>
              <strong>Último mes con datos:</strong> {data[data.length - 1]?.month} - $
              {data[data.length - 1]?.revenue.toLocaleString("es-AR")}
            </p>
          </div>
        </div>
      )}

      {/* Subtítulo */}
      <div className="mb-4">
        <p className="text-slate-400 text-sm">Evolución mensual de ingresos</p>
      </div>

      {/* Gráfico Principal */}
      <div className="bg-slate-800/20 rounded-lg p-6 border border-slate-700/30 backdrop-blur-sm">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: "#94a3b8",
                  fontSize: 12,
                  fontWeight: 500,
                }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: "#94a3b8",
                  fontSize: 12,
                  fontWeight: 500,
                }}
                tickFormatter={formatYAxis}
                dx={-10}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              {stats.averageRevenue && (
                <ReferenceLine
                  y={stats.averageRevenue}
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
              )}
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={3}
                fill="url(#colorRevenue)"
                dot={{
                  fill: "#3b82f6",
                  strokeWidth: 2,
                  stroke: "#ffffff",
                  r: 4,
                }}
                activeDot={{
                  r: 6,
                  fill: "#3b82f6",
                  strokeWidth: 2,
                  stroke: "#ffffff",
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Este Mes */}
        <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-green-400" />
            <span className="text-sm font-medium text-slate-300">Este Mes</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">${stats.currentMonthRevenue.toLocaleString("es-AR")}</div>
          <div className="text-xs text-slate-400">
            vs. ${stats.previousMonthRevenue.toLocaleString("es-AR")} mes anterior
          </div>
        </div>

        {/* Crecimiento */}
        <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            {stats.growthPercentage >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-400" />
            )}
            <span className="text-sm font-medium text-slate-300">Crecimiento</span>
          </div>
          <div className={`text-2xl font-bold mb-1 ${stats.growthPercentage >= 0 ? "text-green-400" : "text-red-400"}`}>
            {stats.growthPercentage >= 0 ? "+" : ""}
            {stats.growthPercentage}%
          </div>
          <div className="text-xs text-slate-400">Respecto al mes anterior</div>
        </div>

        {/* Total 6 Meses */}
        <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-slate-300">Total 6M</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">${stats.totalRevenue.toLocaleString("es-AR")}</div>
          <div className="text-xs text-slate-400">Promedio: ${stats.averageRevenue.toLocaleString("es-AR")}/mes</div>
        </div>
      </div>

      {/* Tabla de datos */}
      {showTable && (
        <div className="bg-slate-800/30 rounded-lg overflow-hidden border border-slate-700/30 backdrop-blur-sm">
          <div className="p-4 border-b border-slate-700/30">
            <h4 className="text-lg font-semibold text-white">Datos Detallados</h4>
            <p className="text-sm text-slate-400 mt-1">Información completa por mes</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-slate-700/30">
                <TableHead className="text-slate-300 font-medium">Mes</TableHead>
                <TableHead className="text-slate-300 font-medium text-right">Ingresos</TableHead>
                <TableHead className="text-slate-300 font-medium text-right">% del Total</TableHead>
                <TableHead className="text-slate-300 font-medium text-right">Variación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, index) => {
                const prevRevenue = index > 0 ? data[index - 1].revenue : 0
                const monthlyChange =
                  prevRevenue === 0
                    ? item.revenue > 0
                      ? 100
                      : 0
                    : Math.round(((item.revenue - prevRevenue) / prevRevenue) * 100)
                const percentOfTotal =
                  stats.totalRevenue > 0 ? Math.round((item.revenue / stats.totalRevenue) * 100) : 0

                return (
                  <TableRow key={index} className="hover:bg-slate-800/50 border-slate-700/30">
                    <TableCell className="font-medium text-white">
                      {MONTHS_FULL[item.month as keyof typeof MONTHS_FULL]}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-white">
                      ${item.revenue.toLocaleString("es-AR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-slate-300 font-medium">{percentOfTotal}%</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`font-semibold ${
                          monthlyChange > 0 ? "text-green-400" : monthlyChange < 0 ? "text-red-400" : "text-slate-400"
                        }`}
                      >
                        {monthlyChange > 0 ? "+" : ""}
                        {monthlyChange}%
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
