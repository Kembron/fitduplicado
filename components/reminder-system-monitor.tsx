"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, RefreshCw, CheckCircle, XCircle, Clock, Mail, AlertTriangle, Users, Ban } from "lucide-react"
import { toast } from "sonner"

interface SystemStatus {
  isConfigured: boolean
  eligibleCount: number
  todaysSent: number
  todaysFailed: number
  blacklistedCount: number
  rateLimit: any
  lastActivity: string | null
}

interface ReminderStats {
  todaysSent: number
  blacklistedEmails: number
  pendingReminders: number
  rateLimit: any
}

export function ReminderSystemMonitor() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [stats, setStats] = useState<ReminderStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // Cargar estado inicial
  useEffect(() => {
    loadSystemStatus()
    loadStats()
  }, [])

  const loadSystemStatus = async () => {
    try {
      const response = await fetch("/api/reminder-status")
      const data = await response.json()

      if (data.success) {
        setStatus(data.systemStatus)
        setLastUpdate(new Date())
      } else {
        toast.error("Error cargando estado del sistema")
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error de conexión")
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch("/api/reminder-stats")
      const data = await response.json()

      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Error cargando estadísticas:", error)
    }
  }

  const runTest = async () => {
    setTesting(true)
    try {
      const response = await fetch("/api/reminder-test")
      const data = await response.json()

      if (data.success) {
        toast.success(`Prueba completada: ${data.testResult.count} emails enviados`)
        await loadSystemStatus()
        await loadStats()
      } else {
        toast.error(`Error en prueba: ${data.error}`)
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error ejecutando prueba")
    } finally {
      setTesting(false)
    }
  }

  const runReminders = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/check-reminders")
      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        await loadSystemStatus()
        await loadStats()
      } else {
        toast.error(`Error: ${data.message}`)
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error ejecutando recordatorios")
    } finally {
      setLoading(false)
    }
  }

  const refresh = async () => {
    await Promise.all([loadSystemStatus(), loadStats()])
    toast.success("Estado actualizado")
  }

  if (!status || !stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Cargando estado del sistema...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Monitor de Recordatorios</h2>
          <p className="text-muted-foreground">Sistema automático de recordatorios de membresías</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refresh} disabled={loading || testing}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button variant="outline" onClick={runTest} disabled={loading || testing}>
            <Play className="h-4 w-4 mr-2" />
            {testing ? "Probando..." : "Probar Sistema"}
          </Button>
          <Button onClick={runReminders} disabled={loading || testing}>
            <Mail className="h-4 w-4 mr-2" />
            {loading ? "Enviando..." : "Ejecutar Recordatorios"}
          </Button>
        </div>
      </div>

      {/* Estado del sistema */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Estado del Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {status.isConfigured ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="text-sm">{status.isConfigured ? "Configurado" : "No Configurado"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recordatorios Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{status.eligibleCount}</span>
              <span className="text-sm text-muted-foreground">miembros</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Enviados Hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{status.todaysSent}</span>
              {status.todaysFailed > 0 && <Badge variant="destructive">{status.todaysFailed} errores</Badge>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Emails Bloqueados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Ban className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold">{status.blacklistedCount}</span>
              <span className="text-sm text-muted-foreground">blacklist</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas y recomendaciones */}
      {!status.isConfigured && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            El sistema de emails no está configurado. Configura las variables EMAIL_USER y EMAIL_APP_PASSWORD.
          </AlertDescription>
        </Alert>
      )}

      {status.eligibleCount > 0 && status.todaysSent === 0 && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Hay {status.eligibleCount} miembros elegibles para recordatorios que no han recibido email hoy.
          </AlertDescription>
        </Alert>
      )}

      {/* Detalles del sistema */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="config">Configuración</TabsTrigger>
          <TabsTrigger value="logs">Actividad</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Estado Actual</CardTitle>
              <CardDescription>Última actualización: {lastUpdate?.toLocaleString("es-UY")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Miembros elegibles</p>
                  <p className="text-2xl font-bold text-blue-600">{status.eligibleCount}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Emails enviados hoy</p>
                  <p className="text-2xl font-bold text-green-600">{status.todaysSent}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Errores hoy</p>
                  <p className="text-2xl font-bold text-red-600">{status.todaysFailed}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">En blacklist</p>
                  <p className="text-2xl font-bold text-gray-600">{status.blacklistedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Rate Limiting</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.rateLimit ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Máximo por día</p>
                    <p className="text-lg">{stats.rateLimit.max_emails_per_day}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Máximo por tanda</p>
                    <p className="text-lg">{stats.rateLimit.max_emails_per_batch}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Delay entre tandas</p>
                    <p className="text-lg">{stats.rateLimit.batch_delay_minutes} minutos</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Enviados hoy</p>
                    <p className="text-lg">{stats.rateLimit.emails_sent_today}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No hay configuración de rate limiting</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
            </CardHeader>
            <CardContent>
              {status.lastActivity ? (
                <p>Última actividad: {new Date(status.lastActivity).toLocaleString("es-UY")}</p>
              ) : (
                <p className="text-muted-foreground">No hay actividad reciente</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
