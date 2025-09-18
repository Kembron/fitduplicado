"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, Database, Users, CreditCard, Loader2 } from "lucide-react"

interface MigrationModalProps {
  onMigrationComplete?: () => void
}

export function MigrationModal({ onMigrationComplete }: MigrationModalProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"upload" | "validate" | "migrate" | "complete">("upload")
  const [loading, setLoading] = useState(false)
  const [membersFile, setMembersFile] = useState<File | null>(null)
  const [paymentsFile, setPaymentsFile] = useState<File | null>(null)
  const [validation, setValidation] = useState<any>(null)
  const [migrationResult, setMigrationResult] = useState<any>(null)
  const [error, setError] = useState("")
  const [membersCount, setMembersCount] = useState(0)
  const [paymentsCount, setPaymentsCount] = useState(0)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: "members" | "payments") => {
    const file = event.target.files?.[0]
    if (!file) return

    if (type === "members") {
      setMembersFile(file)
      setMembersCount(Math.round((file.size / 1024) * 10))
    } else {
      setPaymentsFile(file)
      setPaymentsCount(Math.round((file.size / 1024) * 10))
    }
  }

  const validateData = async () => {
    if (!membersFile || !paymentsFile) return

    setLoading(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append("action", "validate")
      formData.append("membersFile", membersFile)
      formData.append("paymentsFile", paymentsFile)

      const response = await fetch("/api/migration/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        setValidation(result)
        setStep("validate")
      } else {
        setError(result.error || "Error validando datos")
      }
    } catch (error) {
      setError("Error de conexión: " + (error instanceof Error ? error.message : String(error)))
    } finally {
      setLoading(false)
    }
  }

  const startMigration = async () => {
    if (!membersFile || !paymentsFile) {
      setError("Faltan archivos para la migración")
      return
    }

    setLoading(true)
    setError("")

    try {
      // Enviar los archivos directamente al endpoint de ejecución
      const formData = new FormData()
      formData.append("membersFile", membersFile)
      formData.append("paymentsFile", paymentsFile)

      console.log("🚀 Enviando archivos para migración")

      const response = await fetch("/api/migration/execute", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        setMigrationResult(result)
        setStep("complete")
        onMigrationComplete?.()
        console.log("✅ Migración completada:", result)
      } else {
        setError(result.error || "Error en migración")
        console.error("❌ Error en migración:", result)
      }
    } catch (error) {
      setError("Error de conexión: " + (error instanceof Error ? error.message : String(error)))
      console.error("❌ Error de conexión:", error)
    } finally {
      setLoading(false)
    }
  }

  const resetModal = () => {
    setStep("upload")
    setMembersFile(null)
    setPaymentsFile(null)
    setMembersCount(0)
    setPaymentsCount(0)
    setValidation(null)
    setMigrationResult(null)
    setError("")
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="bg-purple-500/10 border-purple-500/20 text-purple-300 hover:bg-purple-500/20"
          onClick={resetModal}
        >
          <Database className="h-4 w-4 mr-2" />
          Migrar Datos
        </Button>
      </DialogTrigger>

      <DialogContent className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-white text-xl">
            <Database className="h-6 w-6 text-purple-400" />
            <span>Migración de Datos desde Excel</span>
          </DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={step} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-700/50">
            <TabsTrigger value="upload" disabled={step !== "upload"}>
              1. Cargar
            </TabsTrigger>
            <TabsTrigger value="validate" disabled={step !== "validate"}>
              2. Validar
            </TabsTrigger>
            <TabsTrigger value="migrate" disabled={step !== "migrate"}>
              3. Migrar
            </TabsTrigger>
            <TabsTrigger value="complete" disabled={step !== "complete"}>
              4. Completo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <div className="text-center space-y-4">
              <FileSpreadsheet className="h-16 w-16 text-purple-400 mx-auto" />
              <h3 className="text-lg font-semibold text-white">Cargar Archivos Excel</h3>
              <p className="text-slate-400">Sube los archivos Excel con los datos de socios y pagos para migrar</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-400" />
                  <h4 className="font-semibold text-white">Archivo de Socios</h4>
                </div>
                <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => handleFileUpload(e, "members")}
                    className="hidden"
                    id="members-file"
                  />
                  <label htmlFor="members-file" className="cursor-pointer">
                    <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-400">Click para seleccionar archivo Excel</p>
                  </label>
                  {membersFile && (
                    <div className="mt-2 text-green-400">
                      ✓ {membersFile.name} ({Math.round(membersFile.size / 1024)} KB)
                      <p className="text-xs text-slate-400">~{membersCount} socios estimados</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5 text-green-400" />
                  <h4 className="font-semibold text-white">Archivo de Pagos</h4>
                </div>
                <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => handleFileUpload(e, "payments")}
                    className="hidden"
                    id="payments-file"
                  />
                  <label htmlFor="payments-file" className="cursor-pointer">
                    <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-400">Click para seleccionar archivo Excel</p>
                  </label>
                  {paymentsFile && (
                    <div className="mt-2 text-green-400">
                      ✓ {paymentsFile.name} ({Math.round(paymentsFile.size / 1024)} KB)
                      <p className="text-xs text-slate-400">~{paymentsCount} pagos estimados</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={validateData}
                disabled={!membersFile || !paymentsFile || loading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validando...
                  </>
                ) : (
                  "Validar Datos"
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="validate" className="space-y-6">
            {validation && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Resultado de Validación</h3>

                {validation.isValid ? (
                  <Alert className="bg-green-500/10 border-green-500/20">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription className="text-green-300">✅ Datos válidos para migración</AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-red-300">
                      ❌ Se encontraron errores que deben corregirse
                    </AlertDescription>
                  </Alert>
                )}

                {validation.summary && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-300 mb-2">Resumen:</h4>
                    <ul className="text-blue-200 text-sm space-y-1">
                      <li>• Socios a migrar: {validation.summary.totalMembers}</li>
                      <li>• Socios activos: {validation.summary.activeMembers}</li>
                      <li>• Socios inactivos: {validation.summary.inactiveMembers}</li>
                      <li>• Pagos a migrar: {validation.summary.totalPayments}</li>
                      <li>• Monto total: ${validation.summary.totalAmount?.toLocaleString()}</li>
                    </ul>
                  </div>
                )}

                {validation.warnings?.length > 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                    <h4 className="font-semibold text-yellow-300 mb-2">Advertencias:</h4>
                    <ul className="text-yellow-300 text-sm space-y-1">
                      {validation.warnings.map((warning: string, index: number) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep("upload")}>
                    Volver
                  </Button>
                  <Button onClick={startMigration} disabled={loading} className="bg-green-600 hover:bg-green-700">
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Migrando TODOS los datos...
                      </>
                    ) : (
                      "🚀 INICIAR MIGRACIÓN"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="complete" className="space-y-6">
            {migrationResult && (
              <div className="text-center space-y-4">
                <CheckCircle className="h-16 w-16 text-green-400 mx-auto" />
                <h3 className="text-lg font-semibold text-white">¡Migración Completada!</h3>

                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <p className="text-green-300">
                    ✅ {migrationResult.migrated?.socios || 0} socios migrados exitosamente
                  </p>
                  <p className="text-green-300">✅ {migrationResult.migrated?.pagos || 0} pagos procesados</p>
                  {migrationResult.migrated?.montoTotal && (
                    <p className="text-green-300">
                      ✅ Monto total migrado: ${migrationResult.migrated.montoTotal.toLocaleString()}
                    </p>
                  )}
                </div>

                {migrationResult.finalStats && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-300 mb-2">Estadísticas Finales en BD:</h4>
                    <ul className="text-blue-200 text-sm space-y-1">
                      <li>• Total socios: {migrationResult.finalStats.totalMembers}</li>
                      <li>• Socios activos: {migrationResult.finalStats.activeMembers}</li>
                      <li>• Socios inactivos: {migrationResult.finalStats.inactiveMembers}</li>
                      <li>• Total pagos: {migrationResult.finalStats.totalPayments}</li>
                      <li>• Monto total: ${migrationResult.finalStats.totalAmount?.toLocaleString()}</li>
                    </ul>
                  </div>
                )}

                <div className="flex justify-center space-x-4">
                  <Button onClick={() => setOpen(false)} className="bg-blue-600 hover:bg-blue-700">
                    Cerrar
                  </Button>
                  <Button variant="outline" onClick={resetModal}>
                    Nueva Migración
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default MigrationModal
