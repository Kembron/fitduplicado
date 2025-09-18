"use client"

import type React from "react"

import { Eye, CheckCircle, Mail } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface SystemSettingsProps {
  config: any
  setConfig: (config: any) => void
}

const SystemSettings: React.FC<SystemSettingsProps> = ({ config, setConfig }) => {
  return (
    <>
      {/* Email Configuration Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">📧 Configuración de Emails</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email-user">Email del Gimnasio</Label>
            <Input
              id="email-user"
              type="email"
              placeholder="gimnasio@ejemplo.com"
              value={config.email_user || ""}
              onChange={(e) => setConfig({ ...config, email_user: e.target.value })}
            />
            <p className="text-sm text-muted-foreground">Email desde el cual se enviarán los recordatorios</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-password">Contraseña de Aplicación</Label>
            <Input
              id="email-password"
              type="password"
              placeholder="••••••••••••••••"
              value={config.email_password || ""}
              onChange={(e) => setConfig({ ...config, email_password: e.target.value })}
            />
            <p className="text-sm text-muted-foreground">Contraseña de aplicación de Gmail</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="auto-reminders"
            checked={config.auto_reminders_enabled || false}
            onCheckedChange={(checked) => setConfig({ ...config, auto_reminders_enabled: checked })}
          />
          <Label htmlFor="auto-reminders">Enviar recordatorios automáticos de membresía</Label>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const response = await fetch("/api/emails/test-reminder", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    memberName: "Usuario de Prueba",
                    membershipName: "Plan Premium",
                    expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                    price: 2500,
                  }),
                })

                if (response.ok) {
                  const data = await response.json()
                  // Abrir preview en nueva ventana
                  const newWindow = window.open("", "_blank")
                  if (newWindow) {
                    newWindow.document.write(data.preview.htmlTemplate)
                    newWindow.document.title = "Preview - Email de Recordatorio"
                  }
                }
              } catch (error) {
                console.error("Error generando preview:", error)
              }
            }}
          >
            <Eye className="h-4 w-4 mr-2" />
            Vista Previa Email
          </Button>

          <Button
            variant="outline"
            onClick={async () => {
              try {
                const response = await fetch("/api/emails/membership-reminders")
                const data = await response.json()

                alert(
                  `Estado del servicio: ${data.status}\nSocios con membresías por vencer: ${data.membersWithExpiringMemberships}`,
                )
              } catch (error) {
                console.error("Error verificando servicio:", error)
                alert("Error verificando el servicio de emails")
              }
            }}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Verificar Servicio
          </Button>

          <Button
            onClick={async () => {
              try {
                const response = await fetch("/api/emails/membership-reminders", {
                  method: "POST",
                })
                const data = await response.json()

                if (data.success) {
                  alert(`✅ Recordatorios enviados: ${data.emailsSent}\nErrores: ${data.errors}`)
                } else {
                  alert(`❌ Error: ${data.error}`)
                }
              } catch (error) {
                console.error("Error enviando recordatorios:", error)
                alert("Error enviando recordatorios")
              }
            }}
          >
            <Mail className="h-4 w-4 mr-2" />
            Enviar Recordatorios
          </Button>
        </div>
      </div>
    </>
  )
}

export default SystemSettings
