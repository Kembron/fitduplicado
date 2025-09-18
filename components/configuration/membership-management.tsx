"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  Users,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react"
import { useMembershipEvents } from "@/lib/membership-events"

interface Membership {
  id: number
  name: string
  description: string
  price: number
  duration_days: number
  is_active: boolean
  members_count: number
}

export default function MembershipManagement() {
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const membershipEvents = useMembershipEvents()

  // Estados para el modal de crear/editar
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMembership, setEditingMembership] = useState<Membership | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    duration_days: "",
  })

  // Función para cargar membresías
  const fetchMemberships = useCallback(async () => {
    try {
      setLoading(true)
      console.log("MembershipManagement: Fetching memberships...")

      const timestamp = new Date().getTime()
      const response = await fetch(`/api/memberships?t=${timestamp}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log("MembershipManagement: Memberships received:", data)
        setMemberships(data)
        setError("")
      } else {
        setError("Error al cargar las membresías")
      }
    } catch (error) {
      console.error("MembershipManagement: Error fetching memberships:", error)
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }, [])

  // Cargar membresías al montar el componente
  useEffect(() => {
    fetchMemberships()
  }, [fetchMemberships])

  // Función para notificar cambios a otros componentes
  const notifyMembershipChange = useCallback(
    (type: string, data?: any) => {
      // Emitir evento interno
      switch (type) {
        case "created":
          membershipEvents.membershipCreated(data)
          break
        case "updated":
          membershipEvents.membershipUpdated(data)
          break
        case "deleted":
          membershipEvents.membershipDeleted(data.id)
          break
        case "status_changed":
          membershipEvents.membershipStatusChanged(data)
          break
      }

      // También notificar via localStorage para sincronización entre pestañas
      localStorage.setItem(
        "membership_change",
        JSON.stringify({
          type,
          data,
          timestamp: Date.now(),
        }),
      )
    },
    [membershipEvents],
  )

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      duration_days: "",
    })
    setEditingMembership(null)
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const openEditModal = (membership: Membership) => {
    setFormData({
      name: membership.name,
      description: membership.description,
      price: membership.price.toString(),
      duration_days: membership.duration_days.toString(),
    })
    setEditingMembership(membership)
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalLoading(true)
    setError("")
    setSuccess("")

    try {
      const membershipData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: Number.parseFloat(formData.price),
        duration_days: Number.parseInt(formData.duration_days, 10),
      }

      // Validaciones
      if (!membershipData.name || membershipData.name.length < 3) {
        throw new Error("El nombre debe tener al menos 3 caracteres")
      }

      if (!membershipData.price || membershipData.price <= 0) {
        throw new Error("El precio debe ser mayor a 0")
      }

      if (!membershipData.duration_days || membershipData.duration_days <= 0) {
        throw new Error("La duración debe ser mayor a 0 días")
      }

      const url = editingMembership ? `/api/memberships/${editingMembership.id}` : "/api/memberships"
      const method = editingMembership ? "PUT" : "POST"

      console.log(`MembershipManagement: ${method} ${url}`, membershipData)

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(membershipData),
      })

      const data = await response.json()

      if (response.ok) {
        const action = editingMembership ? "actualizada" : "creada"
        setSuccess(`Membresía ${action} exitosamente`)

        // Notificar cambio
        notifyMembershipChange(editingMembership ? "updated" : "created", data)

        // Recargar membresías
        await fetchMemberships()

        setIsModalOpen(false)
        resetForm()

        // Limpiar mensaje después de 3 segundos
        setTimeout(() => setSuccess(""), 3000)
      } else {
        setError(data.error || `Error al ${editingMembership ? "actualizar" : "crear"} la membresía`)
      }
    } catch (error: any) {
      console.error("MembershipManagement: Error submitting:", error)
      setError(error.message || "Error de conexión")
    } finally {
      setModalLoading(false)
    }
  }

  const handleToggleStatus = async (membership: Membership) => {
    try {
      const response = await fetch(`/api/memberships/${membership.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !membership.is_active }),
      })

      const data = await response.json()

      if (response.ok) {
        const status = !membership.is_active ? "activada" : "desactivada"
        setSuccess(`Membresía ${status} exitosamente`)

        // Notificar cambio de estado
        notifyMembershipChange("status_changed", data)

        // Recargar membresías
        await fetchMemberships()

        setTimeout(() => setSuccess(""), 3000)
      } else {
        setError(data.error || "Error al cambiar el estado")
      }
    } catch (error) {
      console.error("MembershipManagement: Error toggling status:", error)
      setError("Error de conexión")
    }
  }

  const handleDelete = async (membership: Membership) => {
    try {
      const response = await fetch(`/api/memberships/${membership.id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("Membresía eliminada exitosamente")

        // Notificar eliminación
        notifyMembershipChange("deleted", { id: membership.id })

        // Recargar membresías
        await fetchMemberships()

        setTimeout(() => setSuccess(""), 3000)
      } else {
        setError(data.error || "Error al eliminar la membresía")
      }
    } catch (error) {
      console.error("MembershipManagement: Error deleting:", error)
      setError("Error de conexión")
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-UY", {
      style: "currency",
      currency: "UYU",
    }).format(price)
  }

  const formatDuration = (days: number) => {
    if (days === 30) return "1 mes"
    if (days === 365) return "1 año"
    if (days % 30 === 0) return `${days / 30} meses`
    return `${days} días`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Gestión de Membresías</h2>
          <p className="text-slate-400">Administra los tipos de membresías disponibles</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMemberships}
            disabled={loading}
            className="border-slate-600 text-slate-300 hover:bg-slate-700/50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
          <Button
            onClick={openCreateModal}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Membresía
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-300">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-500/10 border-green-500/20">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="text-green-300">{success}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          <span className="ml-2 text-slate-400">Cargando membresías...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {memberships.map((membership) => (
            <Card
              key={membership.id}
              className={`bg-slate-800/50 border-slate-700/50 backdrop-blur-sm transition-all duration-200 hover:bg-slate-800/70 ${
                !membership.is_active ? "opacity-60" : ""
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg">{membership.name}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge variant={membership.is_active ? "default" : "secondary"} className="text-xs">
                      {membership.is_active ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Activa
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactiva
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
                {membership.description && (
                  <CardDescription className="text-slate-400">{membership.description}</CardDescription>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-green-400" />
                    <div>
                      <p className="text-xs text-slate-400">Precio</p>
                      <p className="text-sm font-medium text-white">{formatPrice(membership.price)}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-blue-400" />
                    <div>
                      <p className="text-xs text-slate-400">Duración</p>
                      <p className="text-sm font-medium text-white">{formatDuration(membership.duration_days)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-purple-400" />
                  <div>
                    <p className="text-xs text-slate-400">Socios activos</p>
                    <p className="text-sm font-medium text-white">{membership.members_count}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                  <div className="flex items-center space-x-1">
                    <Switch
                      checked={membership.is_active}
                      onCheckedChange={() => handleToggleStatus(membership)}
                      className="data-[state=checked]:bg-green-500"
                    />
                    <span className="text-xs text-slate-400">{membership.is_active ? "Activa" : "Inactiva"}</span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(membership)}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-700/50"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                          disabled={membership.members_count > 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-slate-800 border-slate-700">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">¿Eliminar membresía?</AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-400">
                            Esta acción no se puede deshacer. La membresía "{membership.name}" será eliminada
                            permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">
                            Cancelar
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(membership)}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal para crear/editar membresía */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingMembership ? "Editar Membresía" : "Nueva Membresía"}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingMembership ? "Modifica los datos de la membresía" : "Crea una nueva membresía para el gimnasio"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-300">
                Nombre *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Básico, Premium, VIP"
                className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-slate-300">
                Descripción
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción de la membresía"
                className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price" className="text-slate-300">
                  Precio ($) *
                </Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="1200"
                  min="1"
                  step="0.01"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration_days" className="text-slate-300">
                  Duración (días) *
                </Label>
                <Input
                  id="duration_days"
                  type="number"
                  value={formData.duration_days}
                  onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                  placeholder="30"
                  min="1"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={modalLoading}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={modalLoading}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
              >
                {modalLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingMembership ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
