"use client"

import type React from "react"
import { useState, useEffect, forwardRef, useImperativeHandle, useCallback, useRef, useMemo, memo } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Search, Filter, ArrowLeft, Eye, Edit, CreditCard, Users, Loader2, RefreshCw, FilterX } from "lucide-react"
import MemberDetailsModal from "./member-details-modal"
import EditMemberModal from "./edit-member-modal"
import QuickPaymentModal from "./quick-payment-modal"

interface Member {
  id: number
  name: string
  email: string
  phone: string
  document_id: string
  birth_date: string
  address: string
  emergency_contact: string
  notes: string
  membership_name: string
  membership_id: number
  monthly_fee: number
  status: string
  expiry_date: string
  join_date: string
  last_payment_date: string | null
  inactive_since: string | null
  auto_suspended: boolean
}

interface SearchResponse {
  members: Member[]
  total: number
  page: number
  hasMore: boolean
}

// Constantes optimizadas
const ITEMS_PER_PAGE = 50
const SEARCH_DEBOUNCE_MS = 300
const MIN_SEARCH_LENGTH = 2
const CACHE_TTL = 3 * 60 * 1000 // 3 minutos
const SCROLL_THROTTLE_MS = 150

interface SearchMembersModalDesktopProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

// Cache global optimizado con mejor limpieza
class OptimizedCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Limpiar cache automáticamente cada 2 minutos
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup()
      },
      2 * 60 * 1000,
    )
  }

  get<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data
    }
    this.cache.delete(key)
    return null
  }

  set(key: string, data: any, ttl: number = CACHE_TTL): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl })
  }

  clear(): void {
    this.cache.clear()
  }

  cleanup(): void {
    const now = Date.now()
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp >= value.ttl) {
        this.cache.delete(key)
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.clear()
  }
}

const globalCache = new OptimizedCache()

// Throttle helper mejorado
const throttle = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout | null = null
  let lastExecTime = 0

  return (...args: any[]) => {
    const currentTime = Date.now()

    if (currentTime - lastExecTime > delay) {
      func(...args)
      lastExecTime = currentTime
    } else {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(
        () => {
          func(...args)
          lastExecTime = Date.now()
        },
        delay - (currentTime - lastExecTime),
      )
    }
  }
}

// Componente de fila memoizado
const MemberRow = memo(
  ({
    member,
    onView,
    onEdit,
    onPayment,
  }: {
    member: Member
    onView: (member: Member) => void
    onEdit: (member: Member) => void
    onPayment: (member: Member) => void
  }) => {
    const daysUntilExpiry = useMemo(
      () => Math.ceil((new Date(member.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
      [member.expiry_date],
    )

    const statusBadge = useMemo(() => {
      switch (member.status) {
        case "active":
          return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Activo</Badge>
        case "expired":
          return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Vencido</Badge>
        case "suspended":
          return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">Suspendido</Badge>
        case "inactive":
          return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs">Inactivo</Badge>
        default:
          return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-xs">Inactivo</Badge>
      }
    }, [member.status])

    const handleView = useCallback(() => onView(member), [member, onView])
    const handleEdit = useCallback(() => onEdit(member), [member, onEdit])
    const handlePayment = useCallback(() => onPayment(member), [member, onPayment])

    return (
      <tr className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
        <td className="py-4 px-4">
          <div>
            <div className="font-semibold text-white text-base">{member.name}</div>
            <div className="text-sm text-slate-400 mt-1">
              Socio desde {new Date(member.join_date).toLocaleDateString("es-ES")}
            </div>
          </div>
        </td>
        <td className="py-4 px-4">
          <div className="text-sm space-y-1">
            <div className="text-white">{member.email || "Sin email"}</div>
            <div className="text-slate-400">{member.phone || "Sin teléfono"}</div>
          </div>
        </td>
        <td className="py-4 px-4">
          <div className="text-sm">
            <div className="font-medium text-white">{member.membership_name}</div>
            <div className="text-green-400 font-medium">${member.monthly_fee?.toLocaleString()}/mes</div>
          </div>
        </td>
        <td className="py-4 px-4">{statusBadge}</td>
        <td className="py-4 px-4">
          <div className="text-sm">
            <div className="text-white font-medium">{new Date(member.expiry_date).toLocaleDateString("es-ES")}</div>
            <div
              className={`font-medium ${
                daysUntilExpiry <= 7 ? "text-red-400" : daysUntilExpiry <= 30 ? "text-orange-400" : "text-slate-400"
              }`}
            >
              {daysUntilExpiry} días restantes
            </div>
          </div>
        </td>
        <td className="py-4 px-4">
          <div className="flex space-x-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleView}
                  className="border-slate-600 text-slate-300 hover:bg-blue-600/20 hover:text-blue-400 hover:border-blue-500/50 bg-slate-800/30 transition-all duration-200"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-slate-800 border-slate-600 text-white">
                <p>Ver detalles</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEdit}
                  className="border-slate-600 text-slate-300 hover:bg-yellow-600/20 hover:text-yellow-400 hover:border-yellow-500/50 bg-slate-800/30 transition-all duration-200"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-slate-800 border-slate-600 text-white">
                <p>Editar</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePayment}
                  className="border-slate-600 text-slate-300 hover:bg-green-600/20 hover:text-green-400 hover:border-green-500/50 bg-slate-800/30 transition-all duration-200"
                >
                  <CreditCard className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-slate-800 border-slate-600 text-white">
                <p>Registrar pago</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </td>
      </tr>
    )
  },
)

MemberRow.displayName = "MemberRow"

const SearchMembersModalDesktop = forwardRef<{ setOpen: (open: boolean) => void }, SearchMembersModalDesktopProps>(
  ({ open: controlledOpen, onOpenChange }, ref) => {
    // Estados principales
    const [internalOpen, setInternalOpen] = useState(false)
    const [members, setMembers] = useState<Member[]>([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [membershipFilter, setMembershipFilter] = useState("all")
    const [showFilters, setShowFilters] = useState(false)

    // Estados de modales
    const [selectedMember, setSelectedMember] = useState<Member | null>(null)
    const [showMemberDetails, setShowMemberDetails] = useState(false)
    const [showEditMember, setShowEditMember] = useState(false)
    const [showQuickPayment, setShowQuickPayment] = useState(false)

    // Estados de paginación
    const [currentPage, setCurrentPage] = useState(1)
    const [totalMembers, setTotalMembers] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [uniqueMemberships, setUniqueMemberships] = useState<string[]>([])

    // Referencias
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const abortControllerRef = useRef<AbortController | null>(null)
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const lastFetchParamsRef = useRef<string>("")
    const fetchInProgressRef = useRef(false)

    // Control de apertura
    const open = controlledOpen !== undefined ? controlledOpen : internalOpen
    const setOpen = controlledOpen !== undefined ? onOpenChange || (() => {}) : setInternalOpen

    useImperativeHandle(ref, () => ({ setOpen }), [setOpen])

    // Debounce mejorado
    useEffect(() => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
        searchTimeoutRef.current = null
      }

      if (searchTerm.length > 0 && searchTerm.length < MIN_SEARCH_LENGTH) {
        setDebouncedSearchTerm("")
        return
      }

      searchTimeoutRef.current = setTimeout(() => {
        setDebouncedSearchTerm(searchTerm)
      }, SEARCH_DEBOUNCE_MS)

      return () => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current)
          searchTimeoutRef.current = null
        }
      }
    }, [searchTerm])

    // Reset cuando cambian filtros
    useEffect(() => {
      setCurrentPage(1)
      setMembers([])
      setHasMore(true)
    }, [debouncedSearchTerm, statusFilter, membershipFilter])

    // Cache key generator
    const getCacheKey = useCallback((page: number, search: string, status: string, membership: string) => {
      return `desktop_members_${page}_${search}_${status}_${membership}`
    }, [])

    // Fetch optimizado con prevención de bucles
    const fetchMembers = useCallback(
      async (page = 1, append = false) => {
        // Crear clave única para esta búsqueda
        const searchParams = `${page}_${debouncedSearchTerm}_${statusFilter}_${membershipFilter}_${append}`

        // Prevenir múltiples llamadas con los mismos parámetros
        if (fetchInProgressRef.current || searchParams === lastFetchParamsRef.current) {
          return
        }

        // Prevenir múltiples llamadas simultáneas
        if ((loading && !append) || (append && loadingMore)) {
          return
        }

        fetchInProgressRef.current = true
        lastFetchParamsRef.current = searchParams

        const cacheKey = getCacheKey(page, debouncedSearchTerm, statusFilter, membershipFilter)

        // Verificar cache
        const cachedData = globalCache.get<SearchResponse>(cacheKey)
        if (cachedData) {
          if (append && page > 1) {
            setMembers((prev) => [...prev, ...cachedData.members])
          } else {
            setMembers(cachedData.members)
            if (page === 1) {
              const memberships = [...new Set(cachedData.members.map((m) => m.membership_name).filter(Boolean))]
              setUniqueMemberships(memberships)
            }
          }
          setTotalMembers(cachedData.total)
          setHasMore(cachedData.hasMore)
          setCurrentPage(page)
          fetchInProgressRef.current = false
          return
        }

        // Cancelar request anterior
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }

        abortControllerRef.current = new AbortController()

        try {
          if (page === 1) {
            setLoading(true)
          } else {
            setLoadingMore(true)
          }

          const params = new URLSearchParams({
            page: page.toString(),
            limit: ITEMS_PER_PAGE.toString(),
            ...(debouncedSearchTerm && { query: debouncedSearchTerm }),
            ...(statusFilter !== "all" && { status: statusFilter }),
            ...(membershipFilter !== "all" && { membership: membershipFilter }),
          })

          const response = await fetch(`/api/members/search?${params}`, {
            signal: abortControllerRef.current.signal,
            cache: "no-store",
          })

          if (!response.ok) throw new Error("Error fetching members")

          const data: SearchResponse = await response.json()

          // Guardar en cache solo si la respuesta es válida
          if (data && Array.isArray(data.members)) {
            globalCache.set(cacheKey, data)

            if (append && page > 1) {
              setMembers((prev) => [...prev, ...data.members])
            } else {
              setMembers(data.members)
              if (page === 1) {
                const memberships = [...new Set(data.members.map((m) => m.membership_name).filter(Boolean))]
                setUniqueMemberships(memberships)
              }
            }

            setTotalMembers(data.total || 0)
            setHasMore(data.hasMore || false)
            setCurrentPage(page)
          }
        } catch (error) {
          if (error.name !== "AbortError") {
            console.error("Error fetching members:", error)
            // En caso de error, limpiar estado
            if (page === 1) {
              setMembers([])
              setTotalMembers(0)
              setHasMore(false)
            }
          }
        } finally {
          setLoading(false)
          setLoadingMore(false)
          fetchInProgressRef.current = false
        }
      },
      [debouncedSearchTerm, statusFilter, membershipFilter, getCacheKey, loading, loadingMore],
    )

    // Efecto para cargar datos cuando se abre el modal (solo una vez)
    useEffect(() => {
      if (open) {
        // Reset de referencias al abrir
        lastFetchParamsRef.current = ""
        fetchInProgressRef.current = false
        fetchMembers(1, false)
      }
    }, [open])

    // Efecto separado para cambios de filtros (evita bucles)
    useEffect(() => {
      if (open) {
        // Reset de referencias cuando cambian filtros
        lastFetchParamsRef.current = ""
        fetchInProgressRef.current = false

        // Pequeño delay para evitar llamadas múltiples
        const timeoutId = setTimeout(() => {
          fetchMembers(1, false)
        }, 50)

        return () => clearTimeout(timeoutId)
      }
    }, [debouncedSearchTerm, statusFilter, membershipFilter])

    // Load more optimizado
    const loadMore = useCallback(() => {
      if (!loadingMore && hasMore && !loading && !fetchInProgressRef.current) {
        fetchMembers(currentPage + 1, true)
      }
    }, [currentPage, hasMore, loadingMore, loading, fetchMembers])

    // Scroll infinito con throttling
    const handleScroll = useMemo(
      () =>
        throttle((e: React.UIEvent<HTMLDivElement>) => {
          const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
          const scrollPercentage = (scrollTop + clientHeight) / scrollHeight

          if (scrollPercentage > 0.85 && hasMore && !loadingMore && !loading && !fetchInProgressRef.current) {
            loadMore()
          }
        }, SCROLL_THROTTLE_MS),
      [hasMore, loadingMore, loading, loadMore],
    )

    // Handlers memoizados
    const handleViewMember = useCallback((member: Member) => {
      setSelectedMember(member)
      setShowMemberDetails(true)
    }, [])

    const handleEditMember = useCallback((member: Member) => {
      setSelectedMember(member)
      setShowEditMember(true)
    }, [])

    const handlePayment = useCallback((member: Member) => {
      setSelectedMember(member)
      setShowQuickPayment(true)
    }, [])

    const handleMemberUpdated = useCallback(() => {
      globalCache.clear()
      setCurrentPage(1)
      setMembers([])
      setHasMore(true)
      lastFetchParamsRef.current = ""
      fetchInProgressRef.current = false
      fetchMembers(1, false)
    }, [fetchMembers])

    const handlePaymentSuccess = useCallback(() => {
      globalCache.clear()
      setCurrentPage(1)
      setMembers([])
      setHasMore(true)
      lastFetchParamsRef.current = ""
      fetchInProgressRef.current = false
      fetchMembers(1, false)
    }, [fetchMembers])

    const refreshData = useCallback(() => {
      globalCache.clear()
      setCurrentPage(1)
      setMembers([])
      setHasMore(true)
      lastFetchParamsRef.current = ""
      fetchInProgressRef.current = false
      fetchMembers(1, false)
    }, [fetchMembers])

    const clearFilters = useCallback(() => {
      setSearchTerm("")
      setStatusFilter("all")
      setMembershipFilter("all")
    }, [])

    const hasActiveFilters = debouncedSearchTerm || statusFilter !== "all" || membershipFilter !== "all"

    // Manejo de apertura/cierre mejorado
    const handleOpenChange = useCallback(
      (newOpen: boolean) => {
        setOpen(newOpen)

        if (!newOpen) {
          // Al cerrar: limpiar todo el estado
          setSearchTerm("")
          setDebouncedSearchTerm("")
          setMembers([])
          setCurrentPage(1)
          setHasMore(true)
          setShowFilters(false)
          setSelectedMember(null)
          setShowMemberDetails(false)
          setShowEditMember(false)
          setShowQuickPayment(false)
          setLoading(false)
          setLoadingMore(false)
          setTotalMembers(0)
          setUniqueMemberships([])
          setStatusFilter("all")
          setMembershipFilter("all")

          // Reset referencias
          lastFetchParamsRef.current = ""
          fetchInProgressRef.current = false

          // Cancelar requests pendientes
          if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
          }

          // Limpiar timeouts
          if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current)
            searchTimeoutRef.current = null
          }
        }
      },
      [setOpen],
    )

    // Cleanup al desmontar
    useEffect(() => {
      return () => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current)
        }
        fetchInProgressRef.current = false
      }
    }, [])

    // Renderizado de tabla optimizado
    const tableContent = useMemo(
      () => (
        <div
          ref={scrollContainerRef}
          className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-slate-700/50 bg-slate-800/20"
          onScroll={handleScroll}
        >
          <table className="w-full">
            <thead className="sticky top-0 bg-slate-800/90 backdrop-blur-sm z-10">
              <tr className="border-b border-slate-700">
                <th className="text-left py-4 px-4 font-semibold text-slate-300 text-base">Socio</th>
                <th className="text-left py-4 px-4 font-semibold text-slate-300 text-base">Contacto</th>
                <th className="text-left py-4 px-4 font-semibold text-slate-300 text-base">Membresía</th>
                <th className="text-left py-4 px-4 font-semibold text-slate-300 text-base">Estado</th>
                <th className="text-left py-4 px-4 font-semibold text-slate-300 text-base">Vencimiento</th>
                <th className="text-left py-4 px-4 font-semibold text-slate-300 text-base">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  onView={handleViewMember}
                  onEdit={handleEditMember}
                  onPayment={handlePayment}
                />
              ))}
            </tbody>
          </table>

          {loadingMore && (
            <div className="text-center py-8 border-t border-slate-700/50">
              <Loader2 className="h-8 w-8 text-blue-400 mx-auto animate-spin mb-3" />
              <p className="text-slate-400">Cargando más socios...</p>
            </div>
          )}

          {!hasMore && members.length > 0 && (
            <div className="text-center py-8 border-t border-slate-700/50">
              <div className="w-16 h-px bg-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Se han mostrado todos los {totalMembers} socios</p>
            </div>
          )}
        </div>
      ),
      [members, handleScroll, loadingMore, hasMore, totalMembers, handleViewMember, handleEditMember, handlePayment],
    )

    const TriggerButton = () => (
      <Button
        variant="outline"
        className="border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white bg-slate-800/30 backdrop-blur-sm transition-all duration-300"
      >
        <Search className="h-4 w-4 mr-2" />
        Buscar Socios
      </Button>
    )

    return (
      <TooltipProvider>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          {controlledOpen === undefined && (
            <DialogTrigger asChild>
              <TriggerButton />
            </DialogTrigger>
          )}

          <DialogContent
            className="bg-slate-900/95 border-slate-700/50 backdrop-blur-xl max-w-7xl w-[95vw] h-[90vh] flex flex-col p-0 rounded-xl shadow-2xl"
            hideCloseButton={true}
          >
            {/* Header optimizado */}
            <DialogHeader className="flex flex-row items-center justify-between p-6 pb-4 border-b border-slate-700/50">
              <DialogTitle className="flex items-center space-x-3 text-white text-2xl font-bold">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Users className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <span>Búsqueda de Socios</span>
                  <p className="text-sm font-normal text-slate-400 mt-1">
                    {loading ? "Cargando..." : `${totalMembers} ${totalMembers === 1 ? "socio" : "socios"} encontrados`}
                  </p>
                </div>
              </DialogTitle>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshData}
                  disabled={loading}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white bg-slate-800/30"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  Actualizar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white bg-slate-800/30 px-4 py-2"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Button>
              </div>
            </DialogHeader>

            {/* Contenido principal */}
            <div className="flex flex-col flex-1 min-h-0 p-6 space-y-6">
              {/* Barra de búsqueda y filtros */}
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                    <Input
                      placeholder={`Buscar por nombre, email, teléfono... (mínimo ${MIN_SEARCH_LENGTH} caracteres)`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 pr-4 h-12 bg-slate-800/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-blue-400/20 text-base rounded-lg"
                    />
                    {loading && (
                      <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5 animate-spin" />
                    )}
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-6 h-12 border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white bg-slate-800/30 rounded-lg transition-all duration-200 ${
                      hasActiveFilters ? "border-blue-500/50 text-blue-400 bg-blue-500/10" : ""
                    }`}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filtros
                    {hasActiveFilters && (
                      <Badge className="ml-2 bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs px-2 py-1">
                        {
                          [debouncedSearchTerm, statusFilter !== "all", membershipFilter !== "all"].filter(Boolean)
                            .length
                        }
                      </Badge>
                    )}
                  </Button>

                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      onClick={clearFilters}
                      className="px-4 h-12 border-slate-600 text-slate-300 hover:bg-red-600/20 hover:text-red-400 hover:border-red-500/50 bg-slate-800/30 rounded-lg transition-all duration-200"
                    >
                      <FilterX className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Panel de filtros */}
                {showFilters && (
                  <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-6 space-y-4 border border-slate-700/50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-semibold text-lg">Filtros de búsqueda</h3>
                      {hasActiveFilters && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilters}
                          className="text-slate-400 hover:text-white hover:bg-slate-700/50"
                        >
                          <FilterX className="h-4 w-4 mr-2" />
                          Limpiar todos
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-300">Estado del socio</label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="h-11 bg-slate-800/50 border-slate-600/50 text-white rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600 rounded-lg">
                            <SelectItem value="all" className="text-white hover:bg-slate-700 rounded-md">
                              Todos los estados
                            </SelectItem>
                            <SelectItem value="active" className="text-white hover:bg-slate-700 rounded-md">
                              Activos
                            </SelectItem>
                            <SelectItem value="expired" className="text-white hover:bg-slate-700 rounded-md">
                              Vencidos
                            </SelectItem>
                            <SelectItem value="suspended" className="text-white hover:bg-slate-700 rounded-md">
                              Suspendidos
                            </SelectItem>
                            <SelectItem value="inactive" className="text-white hover:bg-slate-700 rounded-md">
                              Inactivos
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-300">Tipo de membresía</label>
                        <Select value={membershipFilter} onValueChange={setMembershipFilter}>
                          <SelectTrigger className="h-11 bg-slate-800/50 border-slate-600/50 text-white rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600 rounded-lg">
                            <SelectItem value="all" className="text-white hover:bg-slate-700 rounded-md">
                              Todas las membresías
                            </SelectItem>
                            {uniqueMemberships.map((membership) => (
                              <SelectItem
                                key={membership}
                                value={membership}
                                className="text-white hover:bg-slate-700 rounded-md"
                              >
                                {membership}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Resultados */}
              <div className="flex flex-col flex-1 min-h-0">
                {loading && members.length === 0 ? (
                  <div className="text-center py-16 flex-1 flex flex-col items-center justify-center">
                    <Loader2 className="h-16 w-16 text-blue-400 mx-auto mb-6 animate-spin" />
                    <h3 className="text-xl font-semibold text-white mb-2">Cargando socios...</h3>
                    <p className="text-slate-400">Por favor espera un momento</p>
                  </div>
                ) : members.length === 0 ? (
                  <div className="text-center py-16 flex-1 flex flex-col items-center justify-center">
                    <div className="p-4 bg-slate-800/30 rounded-full mb-6">
                      <Users className="h-16 w-16 text-slate-400" />
                    </div>
                    <h3 className="text-2xl font-semibold text-white mb-3">No se encontraron socios</h3>
                    <p className="text-slate-400 mb-6 text-lg max-w-md">
                      {hasActiveFilters
                        ? "Intenta ajustar los filtros de búsqueda para obtener más resultados"
                        : "No hay socios registrados en el sistema"}
                    </p>
                    {hasActiveFilters && (
                      <Button
                        variant="outline"
                        onClick={clearFilters}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white bg-slate-800/30 px-6 py-3"
                      >
                        <FilterX className="h-4 w-4 mr-2" />
                        Limpiar filtros
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col flex-1 min-h-0">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                          <Users className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                          <span className="text-white font-semibold text-lg">
                            {totalMembers} {totalMembers === 1 ? "socio" : "socios"}
                          </span>
                          {hasActiveFilters && (
                            <Badge className="ml-3 bg-blue-500/20 text-blue-400 border-blue-500/30">Filtrado</Badge>
                          )}
                        </div>
                      </div>
                      {members.length > 0 && members.length < totalMembers && (
                        <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">
                          Mostrando {members.length} de {totalMembers}
                        </Badge>
                      )}
                    </div>

                    {tableContent}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modales secundarios optimizados */}
        {selectedMember && (
          <>
            <MemberDetailsModal member={selectedMember} open={showMemberDetails} onOpenChange={setShowMemberDetails} />

            <EditMemberModal
              member={selectedMember}
              open={showEditMember}
              onOpenChange={setShowEditMember}
              onMemberUpdated={handleMemberUpdated}
            />

            <QuickPaymentModal
              member={selectedMember}
              open={showQuickPayment}
              onOpenChange={setShowQuickPayment}
              onPaymentSuccess={handlePaymentSuccess}
            />
          </>
        )}
      </TooltipProvider>
    )
  },
)

SearchMembersModalDesktop.displayName = "SearchMembersModalDesktop"

export default SearchMembersModalDesktop
