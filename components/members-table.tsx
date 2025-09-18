"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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
import { Eye, Edit, CreditCard, Loader2, UserX, UserCheck, DollarSign, AlertTriangle } from "lucide-react"
import Link from "next/link"
import MemberDetailsModal from "@/components/member-details-modal"
import { formatDateForDisplay } from "@/lib/date-utils"

interface Member {
  id: number
  name: string
  email: string
  phone: string
  membership_name: string
  monthly_fee: number
  status: string
  expiry_date: string
  last_payment_date: string | null
  inactive_since: string | null
  auto_suspended: boolean
  join_date: string
}

interface MembersTableProps {
  limit?: number
  viewOnly?: boolean
  hideActions?: boolean
  query?: string
  status?: string
}

export default function MembersTable({
  limit,
  viewOnly = false,
  hideActions = false,
  query = "",
  status = "all",
}: MembersTableProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [suspendedMembers, setSuspendedMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("active")

  // Estados para el modal de detalles
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [memberDetailsOpen, setMemberDetailsOpen] = useState(false)
  const [loadingMemberDetails, setLoadingMemberDetails] = useState(false)
  const [currentLoadingMemberId, setCurrentLoadingMemberId] = useState<number | null>(null) // Nuevo estado para el ID del miembro que se está cargando

  useEffect(() => {
    fetchMembers()
  }, [limit, query, status])

  const fetchMembers = async () => {
    try {
      setLoading(true)
      setError(null)

      // Construir parámetros de consulta
      const params = new URLSearchParams()
      if (query) params.append("query", query)

      // Obtener socios activos
      let activeUrl = "/api/members?includeInactive=false"
      if (status !== "all") {
        activeUrl += `&status=${status}`
      }
      if (query) {
        activeUrl += `&query=${encodeURIComponent(query)}`
      }

      const activeRes = await fetch(activeUrl, {
        cache: "no-store",
      })

      // Obtener socios suspendidos/inactivos
      let suspendedUrl = "/api/members?includeInactive=true&onlySuspended=true"
      if (query) {
        suspendedUrl += `&query=${encodeURIComponent(query)}`
      }

      const suspendedRes = await fetch(suspendedUrl, {
        cache: "no-store",
      })

      if (activeRes.ok && suspendedRes.ok) {
        let activeMembersData = await activeRes.json()
        const suspendedMembersData = await suspendedRes.json()

        if (limit) {
          activeMembersData = activeMembersData.slice(0, limit)
        }

        setMembers(activeMembersData)
        setSuspendedMembers(suspendedMembersData)
      } else {
        setError("Error al cargar socios")
      }
    } catch (err) {
      console.error("Error fetching members:", err)
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  const handleViewMember = async (memberId: number) => {
    try {
      setLoadingMemberDetails(true)
      setCurrentLoadingMemberId(memberId) // Establece qué miembro está cargando sus detalles
      console.log(`👁️ Opening member details modal for ID: ${memberId}`)

      const response = await fetch(`/api/members/${memberId}`, {
        cache: "no-store",
      })

      if (response.ok) {
        const memberData = await response.json()
        console.log("✅ Member details loaded:", memberData.name)
        setSelectedMember(memberData)
        setMemberDetailsOpen(true) // Abre el modal aquí
      } else {
        console.error("❌ Error loading member details")
        // Podrías mostrar un toast de error aquí
      }
    } catch (error) {
      console.error("❌ Error fetching member details:", error)
    } finally {
      setLoadingMemberDetails(false)
      setCurrentLoadingMemberId(null) // Resetea el ID del miembro cargando
    }
  }

  const getStatusBadge = (member: Member) => {
    const { status, auto_suspended } = member

    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Activo</Badge>
      case "expired":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Vencido</Badge>
      case "suspended":
        return (
          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
            {auto_suspended ? "Auto-Suspendido" : "Suspendido"}
          </Badge>
        )
      case "inactive":
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs">Inactivo</Badge>
      case "cancelled":
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-xs">Cancelado</Badge>
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-xs">Desconocido</Badge>
    }
  }

  const getPaymentActivityInfo = (member: Member) => {
    if (!member.last_payment_date) {
      return (
        <div className="flex items-center text-red-400 text-xs">
          <DollarSign className="h-3 w-3 mr-1" />
          Sin pagos registrados
        </div>
      )
    }

    const daysSinceLastPayment = Math.floor(
      (new Date().getTime() - new Date(member.last_payment_date).getTime()) / (1000 * 60 * 60 * 24),
    )

    if (daysSinceLastPayment > 60) {
      return (
        <div className="flex items-center text-orange-400 text-xs">
          <DollarSign className="h-3 w-3 mr-1" />
          Último pago hace {daysSinceLastPayment} días
        </div>
      )
    }

    return null
  }

  const handleSuspendMember = async (memberId: number, reason: string) => {
    try {
      setLoading(true) // Puedes añadir un estado de carga para las acciones de suspender/reactivar si quieres
      const response = await fetch(`/api/members/${memberId}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })

      if (response.ok) {
        fetchMembers() // Recargar datos
      }
    } catch (error) {
      console.error("Error suspending member:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleReactivateMember = async (memberId: number) => {
    try {
      setLoading(true) // Puedes añadir un estado de carga para las acciones de suspender/reactivar si quieres
      const response = await fetch(`/api/members/${memberId}/reactivate`, {
        method: "POST",
      })

      if (response.ok) {
        fetchMembers() // Recargar datos
      }
    } catch (error) {
      console.error("Error reactivating member:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  const renderMembersTable = (membersList: Member[], showSuspendActions = false) => (
    <div className="space-y-3 sm:space-y-0">
      {/* Vista móvil - Cards */}
      <div className="block sm:hidden space-y-3">
        {membersList.map((member) => (
          <div key={member.id} className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-3">
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-white text-sm">{member.name}</div>
                  <div className="text-xs text-slate-400">{member.email}</div>
                  <div className="text-xs text-slate-500">Socio desde {formatDateForDisplay(member.join_date)}</div>
                  {getPaymentActivityInfo(member)}
                </div>
                {getStatusBadge(member)}
              </div>

              <div className="text-xs">
                <div className="text-slate-300">{member.membership_name}</div>
                <div className="text-slate-400">${member.monthly_fee}/mes</div>
              </div>

              <div className="flex justify-between items-center text-xs">
                <div>
                  <div className="text-slate-300">Vence: {formatDateForDisplay(member.expiry_date)}</div>
                  <div className="text-slate-400">
                    Último pago:{" "}
                    {member.last_payment_date
                      ? new Date(member.last_payment_date).toLocaleDateString("es-ES")
                      : "Nunca"}
                  </div>
                </div>
              </div>

              {!hideActions && (
                <div className="flex space-x-2 pt-2">
                  <Button
                    size="sm"
                    // BOTÓN "Ver" para móvil: azul con texto/icono blanco
                    className="bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:border-blue-700 flex-1 text-xs"
                    onClick={() => handleViewMember(member.id)}
                    // Usa currentLoadingMemberId para especificar el spinner
                    disabled={loadingMemberDetails && currentLoadingMemberId === member.id}
                  >
                    {loadingMemberDetails && currentLoadingMemberId === member.id ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin text-white" />
                    ) : (
                      <Eye className="h-3 w-3 mr-1 text-white" />
                    )}
                    Ver
                  </Button>

                  {!viewOnly && (
                    <>
                      {showSuspendActions ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-green-600 text-green-300 hover:bg-green-700/50 hover:text-white flex-1 text-xs"
                              disabled={loading}
                            >
                              <UserCheck className="h-3 w-3 mr-1" />
                              Reactivar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-slate-800 border-slate-700 max-w-[90vw]">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-white text-sm">Reactivar Socio</AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-300 text-xs">
                                ¿Estás seguro de que quieres reactivar a {member.name}?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 text-xs">
                                Cancelar
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleReactivateMember(member.id)}
                                className="bg-green-600 hover:bg-green-700 text-xs"
                              >
                                Reactivar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <>
                          <Link href={`/members/${member.id}/edit`} className="flex-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white w-full text-xs"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Editar
                            </Button>
                          </Link>
                          <Link href={`/payments/new?memberId=${member.id}`} className="flex-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white w-full text-xs"
                            >
                              <CreditCard className="h-3 w-3 mr-1" />
                              Pago
                            </Button>
                          </Link>

                          {member.status === "expired" && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  // BOTÓN "Suspender" para móvil: azul con icono blanco
                                  className="bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:border-blue-700 flex-1 text-xs"
                                  disabled={loading}
                                >
                                  <UserX className="h-3 w-3 mr-1 text-white" />
                                  Suspender
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-slate-800 border-slate-700">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-white">Suspender Socio</AlertDialogTitle>
                                  <AlertDialogDescription className="text-slate-300">
                                    ¿Estás seguro de que quieres suspender a {member.name}? El socio no aparecerá en las
                                    deudas pendientes hasta que sea reactivado.
                                    <br />
                                    <br />
                                    <strong>Motivo:</strong> El socio dejó de pagar y no muestra intención de continuar.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-slate-700 text-white border-slate-600">
                                    Cancelar
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleSuspendMember(
                                        member.id,
                                        "Suspendido manualmente - Cliente inactivo sin intención de pago",
                                      )
                                    }
                                    className="bg-blue-600 hover:bg-blue-700" // Acción del modal también azul
                                  >
                                    Suspender
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Vista desktop - Tabla */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 font-medium text-slate-300 text-sm">Socio</th>
              <th className="text-left py-3 px-4 font-medium text-slate-300 text-sm">Membresía</th>
              <th className="text-left py-3 px-4 font-medium text-slate-300 text-sm">Estado</th>
              <th className="text-left py-3 px-4 font-medium text-slate-300 text-sm">Vencimiento</th>
              <th className="text-left py-3 px-4 font-medium text-slate-300 text-sm">Último Pago</th>
              {!hideActions && <th className="text-left py-3 px-4 font-medium text-slate-300 text-sm">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {membersList.map((member) => (
              <tr key={member.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                <td className="py-3 px-4">
                  <div>
                    <div className="font-medium text-white text-sm">{member.name}</div>
                    <div className="text-xs text-slate-400">{member.email}</div>
                    <div className="text-xs text-slate-500">Socio desde {formatDateForDisplay(member.join_date)}</div>
                    {getPaymentActivityInfo(member)}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="text-sm">
                    <div className="font-medium text-white">{member.membership_name}</div>
                    <div className="text-slate-400">${member.monthly_fee}/mes</div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="space-y-1">
                    {getStatusBadge(member)}
                    {member.auto_suspended && (
                      <div className="flex items-center text-orange-400 text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Suspendido por inactividad
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="text-sm">
                    <div className="text-slate-300">{formatDateForDisplay(member.expiry_date)}</div>
                    {member.status === "expired" && (
                      <div className="text-red-400 text-xs">
                        Vencido hace{" "}
                        {Math.floor(
                          (new Date().getTime() - new Date(member.expiry_date).getTime()) / (1000 * 60 * 60 * 24),
                        )}{" "}
                        días
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="text-sm text-slate-300">
                    {member.last_payment_date
                      ? new Date(member.last_payment_date).toLocaleDateString("es-ES")
                      : "Nunca"}
                  </div>
                </td>
                {!hideActions && (
                  <td className="py-3 px-4">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        // BOTÓN "Ver" para escritorio: azul con icono blanco
                        className="bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:border-blue-700"
                        onClick={() => handleViewMember(member.id)}
                        // Usa currentLoadingMemberId para especificar el spinner
                        disabled={loadingMemberDetails && currentLoadingMemberId === member.id}
                      >
                        {loadingMemberDetails && currentLoadingMemberId === member.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                        ) : (
                          <Eye className="h-4 w-4 text-white" />
                        )}
                      </Button>

                      {!viewOnly && (
                        <>
                          {showSuspendActions ? (
                            // Acciones para socios suspendidos
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-green-600 text-green-300 hover:bg-green-700/50 hover:text-white"
                                  disabled={loading}
                                >
                                  <UserCheck className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-slate-800 border-slate-700">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-white">Reactivar Socio</AlertDialogTitle>
                                  <AlertDialogDescription className="text-slate-300">
                                    ¿Estás seguro de que quieres reactivar a {member.name}? El socio volverá al estado
                                    "Vencido" y podrá realizar pagos.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-slate-700 text-white border-slate-600">
                                    Cancelar
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleReactivateMember(member.id)}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    Reactivar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : (
                            // Acciones para socios activos
                            <>
                              <Link href={`/members/${member.id}/edit`}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Link href={`/payments/new?memberId=${member.id}`}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white"
                                >
                                  <CreditCard className="h-4 w-4" />
                                </Button>
                              </Link>

                              {member.status === "expired" && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      // BOTÓN "Suspender" para escritorio: azul con icono blanco
                                      className="bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:border-blue-700"
                                      disabled={loading}
                                    >
                                      <UserX className="h-4 w-4 text-white" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="bg-slate-800 border-slate-700">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="text-white">Suspender Socio</AlertDialogTitle>
                                      <AlertDialogDescription className="text-slate-300">
                                        ¿Estás seguro de que quieres suspender a {member.name}? El socio no aparecerá en
                                        las deudas pendientes hasta que sea reactivado.
                                        <br />
                                        <br />
                                        <strong>Motivo:</strong> El socio dejó de pagar y no muestra intención de
                                        continuar.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel className="bg-slate-700 text-white border-slate-600">
                                        Cancelar
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() =>
                                          handleSuspendMember(
                                            member.id,
                                            "Suspendido manualmente - Cliente inactivo sin intención de pago",
                                          )
                                        }
                                        className="bg-blue-600 hover:bg-blue-700" // Acción del modal también azul
                                      >
                                        Suspender
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Detalles del Socio */}
      {selectedMember && (
        <MemberDetailsModal member={selectedMember} open={memberDetailsOpen} onOpenChange={setMemberDetailsOpen} />
      )}
    </div>
  )

  // Si estamos filtrando por un estado específico o buscando, mostrar solo una tabla
  if (status !== "all" || query) {
    const allMembers = [...members, ...suspendedMembers]
    return (
      <div className="space-y-4">
        {allMembers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-400 text-sm">No se encontraron socios con los filtros aplicados</p>
          </div>
        ) : (
          renderMembersTable(allMembers, false)
        )}
      </div>
    )
  }

  // Vista simplificada para dashboard
  if (limit) {
    return renderMembersTable(members)
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-800/50 border border-slate-700/50 grid grid-cols-2 sm:flex w-full sm:w-auto">
          <TabsTrigger
            value="active"
            className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-xs sm:text-sm"
          >
            Socios Activos ({members.length})
          </TabsTrigger>
          <TabsTrigger
            value="suspended"
            className="data-[state=active]:bg-orange-900/30 data-[state=active]:text-orange-300 text-xs sm:text-sm"
          >
            Suspendidos/Inactivos ({suspendedMembers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 sm:p-4 mb-4">
            <div className="flex items-center space-x-2 text-blue-300">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
              <div>
                <div className="font-medium text-sm sm:text-base">Gestión Inteligente de Socios</div>
                <div className="text-xs sm:text-sm text-blue-400">
                  Los socios se suspenden automáticamente después de 45 días sin pagar. Solo se muestran deudas
                  realistas de socios activos.
                </div>
              </div>
            </div>
          </div>

          {members.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400 text-sm">No hay socios activos</p>
            </div>
          ) : (
            renderMembersTable(members, false)
          )}
        </TabsContent>

        <TabsContent value="suspended" className="space-y-4">
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 sm:p-4 mb-4">
            <div className="flex items-center space-x-2 text-orange-300">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
              <div>
                <div className="font-medium text-sm sm:text-base">Socios Suspendidos e Inactivos</div>
                <div className="text-xs sm:text-sm text-orange-400">
                  Estos socios no aparecen en las estadísticas de deudas. Puedes reactivarlos si vuelven a mostrar
                  interés.
                </div>
              </div>
            </div>
          </div>

          {suspendedMembers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400 text-sm">No hay socios suspendidos o inactivos</p>
            </div>
          ) : (
            renderMembersTable(suspendedMembers, true)
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
