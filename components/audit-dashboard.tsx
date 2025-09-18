"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Shield,
  Activity,
  Users,
  Database,
  CalendarIcon,
  Filter,
  RefreshCw,
  Clock,
  User,
  Globe,
  FileText,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface AuditLog {
  id: number
  user_email: string
  user_name: string
  action_type: string
  table_name: string
  record_id: number | null
  description: string
  ip_address: string | null
  created_at: string
}

interface AuditResponse {
  logs: AuditLog[]
  total: number
  page: number
  hasMore: boolean
  limit: number
}

const actionTypeColors = {
  CREATE: "bg-green-500/20 text-green-400 border-green-500/30",
  UPDATE: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
  LOGIN: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  LOGOUT: "bg-gray-500/20 text-gray-400 border-gray-500/30",
}

const actionTypeLabels = {
  CREATE: "Crear",
  UPDATE: "Actualizar",
  DELETE: "Eliminar",
  LOGIN: "Iniciar Sesión",
  LOGOUT: "Cerrar Sesión",
}

const tableNameLabels = {
  members: "Socios",
  payments: "Pagos",
  users: "Usuarios",
  memberships: "Membresías",
  system_config: "Configuración",
}

export default function AuditDashboard() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [limit] = useState(20)

  // Filtros
  const [actionTypeFilter, setActionTypeFilter] = useState<string>("")
  const [tableNameFilter, setTableNameFilter] = useState<string>("")
  const [userEmailFilter, setUserEmailFilter] = useState<string>("")
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [showFilters, setShowFilters] = useState(false)

  // Estadísticas
  const [stats, setStats] = useState({
    totalActions: 0,
    uniqueUsers: 0,
    todayActions: 0,
    mostActiveTable: "",
  })

  const fetchLogs = async (page = 1, resetLogs = true) => {
    try {
      setLoading(true)

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })

      if (actionTypeFilter) params.append("actionType", actionTypeFilter)
      if (tableNameFilter) params.append("tableName", tableNameFilter)
      if (userEmailFilter) params.append("userEmail", userEmailFilter)
      if (startDate) params.append("startDate", startDate.toISOString())
      if (endDate) params.append("endDate", endDate.toISOString())

      const response = await fetch(`/api/audit?${params}`)
      if (!response.ok) throw new Error("Error fetching audit logs")

      const data: AuditResponse = await response.json()

      if (resetLogs) {
        setLogs(data.logs)
      } else {
        setLogs((prev) => [...prev, ...data.logs])
      }

      setTotal(data.total)
      setCurrentPage(data.page)
      setHasMore(data.hasMore)

      // Calcular estadísticas básicas
      if (resetLogs && data.logs.length > 0) {
        const uniqueUsers = new Set(data.logs.map((log) => log.user_email)).size
        const today = new Date().toDateString()
        const todayActions = data.logs.filter((log) => new Date(log.created_at).toDateString() === today).length

        const tableCounts = data.logs.reduce(
          (acc, log) => {
            acc[log.table_name] = (acc[log.table_name] || 0) + 1
            return acc
          },
          {} as Record<string, number>,
        )

        const mostActiveTable = Object.entries(tableCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || ""

        setStats({
          totalActions: data.total,
          uniqueUsers,
          todayActions,
          mostActiveTable,
        })
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs(1, true)
  }, [actionTypeFilter, tableNameFilter, userEmailFilter, startDate, endDate])

  const clearFilters = () => {
    setActionTypeFilter("")
    setTableNameFilter("")
    setUserEmailFilter("")
    setStartDate(undefined)
    setEndDate(undefined)
  }

  const hasActiveFilters = actionTypeFilter || tableNameFilter || userEmailFilter || startDate || endDate

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchLogs(currentPage + 1, false)
    }
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: es })
  }

  const getActionBadge = (actionType: string) => {
    const colorClass =
      actionTypeColors[actionType as keyof typeof actionTypeColors] || "bg-gray-500/20 text-gray-400 border-gray-500/30"
    const label = actionTypeLabels[actionType as keyof typeof actionTypeLabels] || actionType

    return <Badge className={`${colorClass} text-xs px-2 py-1`}>{label}</Badge>
  }

  const getTableLabel = (tableName: string) => {
    return tableNameLabels[tableName as keyof typeof tableNameLabels] || tableName
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Auditoría del Sistema</h1>
          <p className="text-slate-400 mt-1">Registro completo de actividades y cambios en el sistema</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => fetchLogs(1, true)}
            disabled={loading}
            className="border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total de Acciones</CardTitle>
            <Activity className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalActions.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Usuarios Únicos</CardTitle>
            <Users className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.uniqueUsers}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Acciones Hoy</CardTitle>
            <Clock className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.todayActions}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Tabla Más Activa</CardTitle>
            <Database className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-white">{getTableLabel(stats.mostActiveTable) || "N/A"}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filtros de Búsqueda
            </CardTitle>
            <div className="flex items-center space-x-2">
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white bg-transparent"
                >
                  Limpiar Filtros
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white"
              >
                {showFilters ? "Ocultar" : "Mostrar"} Filtros
              </Button>
            </div>
          </div>
        </CardHeader>

        {showFilters && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Tipo de Acción */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Tipo de Acción</label>
                <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-600/50 text-white">
                    <SelectValue placeholder="Todas las acciones" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="" className="text-white hover:bg-slate-700">
                      Todas las acciones
                    </SelectItem>
                    {Object.entries(actionTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value} className="text-white hover:bg-slate-700">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tabla */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Tabla</label>
                <Select value={tableNameFilter} onValueChange={setTableNameFilter}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-600/50 text-white">
                    <SelectValue placeholder="Todas las tablas" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="" className="text-white hover:bg-slate-700">
                      Todas las tablas
                    </SelectItem>
                    {Object.entries(tableNameLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value} className="text-white hover:bg-slate-700">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Usuario */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Usuario</label>
                <Input
                  placeholder="Buscar por email..."
                  value={userEmailFilter}
                  onChange={(e) => setUserEmailFilter(e.target.value)}
                  className="bg-slate-800/50 border-slate-600/50 text-white placeholder-slate-400"
                />
              </div>
            </div>

            {/* Filtros de Fecha */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Fecha Desde</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal bg-slate-800/50 border-slate-600/50 text-white hover:bg-slate-700/50"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd/MM/yyyy", { locale: es }) : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-slate-800 border-slate-600" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      disabled={(date) => date > new Date() || (endDate && date > endDate)}
                      initialFocus
                      className="bg-slate-800 text-white"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Fecha Hasta</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal bg-slate-800/50 border-slate-600/50 text-white hover:bg-slate-700/50"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "dd/MM/yyyy", { locale: es }) : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-slate-800 border-slate-600" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) => date > new Date() || (startDate && date < startDate)}
                      initialFocus
                      className="bg-slate-800 text-white"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Lista de Logs */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Registro de Auditoría
              {hasActiveFilters && (
                <Badge className="ml-3 bg-blue-500/20 text-blue-400 border-blue-500/30">Filtrado</Badge>
              )}
            </div>
            <div className="text-sm font-normal text-slate-400">{total.toLocaleString()} registros total</div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && logs.length === 0 ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 text-blue-400 mx-auto mb-4 animate-spin" />
              <p className="text-slate-400">Cargando registros de auditoría...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">No se encontraron registros</p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="mt-4 border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white bg-transparent"
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30 hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getActionBadge(log.action_type)}
                      <Badge className="bg-slate-600/30 text-slate-300 border-slate-500/30 text-xs">
                        {getTableLabel(log.table_name)}
                      </Badge>
                      {log.record_id && (
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                          ID: {log.record_id}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDate(log.created_at)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center text-slate-300">
                        <User className="h-4 w-4 mr-2 text-slate-400" />
                        <span className="font-medium">{log.user_name || log.user_email}</span>
                        {log.user_name && log.user_email !== log.user_name && (
                          <span className="text-slate-400 ml-1">({log.user_email})</span>
                        )}
                      </div>
                      {log.ip_address && (
                        <div className="flex items-center text-slate-400">
                          <Globe className="h-4 w-4 mr-1" />
                          <span>{log.ip_address}</span>
                        </div>
                      )}
                    </div>

                    {log.description && (
                      <div className="flex items-start space-x-2 text-sm">
                        <FileText className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-300">{log.description}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Botón Cargar Más */}
              {hasMore && (
                <div className="text-center pt-4">
                  <Button
                    onClick={loadMore}
                    disabled={loading}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white bg-transparent"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Cargando...
                      </>
                    ) : (
                      <>
                        <ChevronRight className="h-4 w-4 mr-2" />
                        Cargar más registros
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Indicador de fin */}
              {!hasMore && logs.length > 0 && (
                <div className="text-center pt-4 border-t border-slate-700/50">
                  <p className="text-slate-400 text-sm">Se han mostrado todos los {total.toLocaleString()} registros</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
