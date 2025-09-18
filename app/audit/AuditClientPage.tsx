"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Shield } from "lucide-react"
import AuditDashboard from "@/components/audit-dashboard"

interface AuditLog {
  id: number
  action: string
  table_name: string
  record_id: number
  user_id: number
  user_name: string
  changes: any
  timestamp: string
}

interface AuditStats {
  totalLogs: number
  todayLogs: number
  uniqueUsers: number
  uniqueTables: number
}

export default function AuditClientPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [stats, setStats] = useState<AuditStats>({
    totalLogs: 0,
    todayLogs: 0,
    uniqueUsers: 0,
    uniqueTables: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [tableFilter, setTableFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const logsPerPage = 20

  useEffect(() => {
    fetchAuditData()
  }, [])

  const fetchAuditData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/audit", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setLogs(data.logs || [])
      setStats(data.stats || { totalLogs: 0, todayLogs: 0, uniqueUsers: 0, uniqueTables: 0 })
    } catch (err) {
      console.error("Error fetching audit data:", err)
      setError(err instanceof Error ? err.message : "Error al cargar datos de auditoría")
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchTerm === "" ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesAction = actionFilter === "all" || log.action === actionFilter
    const matchesTable = tableFilter === "all" || log.table_name === tableFilter

    return matchesSearch && matchesAction && matchesTable
  })

  const paginatedLogs = filteredLogs.slice((currentPage - 1) * logsPerPage, currentPage * logsPerPage)
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage)

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case "create":
      case "insert":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "update":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "delete":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "login":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30"
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("es-AR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const handleGoBack = () => {
    router.push("/")
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <Button
              onClick={handleGoBack}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white bg-slate-800/30 backdrop-blur-sm transition-all duration-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </div>

          <div className="flex items-center justify-center h-64">
            <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl p-8 max-w-md w-full">
              <div className="text-center">
                <Shield className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">Error al cargar auditoría</h2>
                <p className="text-slate-400 mb-4">{error}</p>
                <Button onClick={fetchAuditData} className="bg-blue-600 hover:bg-blue-700">
                  Reintentar
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Botón Volver */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGoBack}
          className="text-slate-400 hover:text-white hover:bg-slate-700/50 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>

        {/* Título */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Auditoría del Sistema</h1>
          <p className="text-slate-400">Monitoreo y registro de todas las actividades</p>
        </div>

        {/* Dashboard */}
        <AuditDashboard logs={logs} stats={stats} loading={loading} error={error} />
      </div>
    </div>
  )
}
