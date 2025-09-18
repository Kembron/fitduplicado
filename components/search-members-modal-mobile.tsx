"use client"

import type React from "react"
import { useState, useEffect, forwardRef, useImperativeHandle, useCallback, useRef, useMemo, memo } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  Search,
  Filter,
  Eye,
  Edit,
  CreditCard,
  Users,
  Loader2,
  ChevronLeft,
  RefreshCw,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Clock,
  FilterX,
} from "lucide-react"
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
const ITEMS_PER_PAGE = 20
const SEARCH_DEBOUNCE_MS = 200
const MIN_SEARCH_LENGTH = 2
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos
const SCROLL_THROTTLE_MS = 100

interface SearchMembersModalMobileProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

// Cache global optimizado (reutilizar del desktop)
class OptimizedCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()

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
}

const globalCacheMobile = new OptimizedCache()

// Throttle helper
const throttle = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout
  let lastExecTime = 0
  return (...args: any[]) => {
    const currentTime = Date.now()

    if (currentTime - lastExecTime > delay) {
      func(...args)
      lastExecTime = currentTime
    } else {
      clearTimeout(timeoutId)
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

// Componente de tarjeta memoizado
const MemberCard = memo(
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
          return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs px-2 py-1">Activo</Badge>
        case "expired":
          return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs px-2 py-1">Vencido</Badge>
        case "suspended":
          return (
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs px-2 py-1">
              Suspendido
            </Badge>
          )
        case "inactive":
          return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs px-2 py-1">Inactivo</Badge>
        default:
          return (
            <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-xs px-2 py-1">Inactivo</Badge>
          )
      }
    }, [member.status])

    const handleView = useCallback(() => onView(member), [member, onView])
    const handleEdit = useCallback(() => onEdit(member), [member, onEdit])
    const handlePayment = useCallback(() => onPayment(member), [member, onPayment])

    return (
      <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden shadow-lg">
        {/* Header de la tarjeta */}
        <div className="p-4 pb-3">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white text-lg truncate">{member.name}</h3>
              <div className="flex items-center space-x-2 mt-1">
                <DollarSign className="h-3 w-3 text-green-400" />
                <span className="text-sm text-slate-300">{member.membership_name}</span>
                <span className="text-sm font-medium text-green-400">${member.monthly_fee?.toLocaleString()}/mes</span>
              </div>
            </div>
            <div className="ml-3">{statusBadge}</div>
          </div>

          {/* Info de contacto */}
          <div className="space-y-2 mb-3">
            {member.email && (
              <div className="flex items-center space-x-2">
                <Mail className="h-3 w-3 text-blue-400 flex-shrink-0" />
                <span className="text-xs text-slate-300 truncate">{member.email}</span>
              </div>
            )}
            {member.phone && (
              <div className="flex items-center space-x-2">
                <Phone className="h-3 w-3 text-green-400 flex-shrink-0" />
                <span className="text-xs text-slate-300">{member.phone}</span>
              </div>
            )}
          </div>

          {/* Info de fechas */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3 text-slate-400" />
              <span className="text-slate-400">Vence:</span>
              <span className="text-white font-medium">{new Date(member.expiry_date).toLocaleDateString("es-ES")}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3 text-slate-400" />
              <span
                className={`font-medium ${
                  daysUntilExpiry <= 7 ? "text-red-400" : daysUntilExpiry <= 30 ? "text-orange-400" : "text-slate-300"
                }`}
              >
                {daysUntilExpiry} días
              </span>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex border-t border-slate-700/30 bg-slate-800/20">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleView}
            className="flex-1 rounded-none text-slate-300 hover:bg-blue-600/20 hover:text-blue-400 py-3 text-sm font-medium transition-all duration-200"
          >
            <Eye className="h-4 w-4 mr-2" />
            Ver
          </Button>
          <div className="w-px bg-slate-700/30" />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleEdit}
            className="flex-1 rounded-none text-slate-300 hover:bg-yellow-600/20 hover:text-yellow-400 py-3 text-sm font-medium transition-all duration-200"
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <div className="w-px bg-slate-700/30" />
          <Button
            size="sm"
            variant="ghost"
            onClick={handlePayment}
            className="flex-1 rounded-none text-slate-300 hover:bg-green-600/20 hover:text-green-400 py-3 text-sm font-medium transition-all duration-200"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Pagar
          </Button>
        </div>
      </div>
    )
  },
)

MemberCard.displayName = "MemberCard"

const SearchMembersModalMobile = forwardRef<{ setOpen: (open: boolean) => void }, SearchMembersModalMobileProps>(
  ({ open: controlledOpen, onOpenChange }, ref) => {
    const [internalOpen, setInternalOpen] = useState(false)
    const [members, setMembers] = useState<Member[]>([])
    const [loading, setLoading] = useState(false)
    const [initialLoading, setInitialLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [membershipFilter, setMembershipFilter] = useState("all")
    const [showFilters, setShowFilters] = useState(false)
    const [selectedMember, setSelectedMember] = useState<Member | null>(null)
    const [showMemberDetails, setShowMemberDetails] = useState(false)
    const [showEditMember, setShowEditMember] = useState(false)
    const [showQuickPayment, setShowQuickPayment] = useState(false)

    // Paginación y cache
    const [currentPage, setCurrentPage] = useState(1)
    const [totalMembers, setTotalMembers] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [uniqueMemberships, setUniqueMemberships] = useState<string[]>([])

    // Referencias para optimización
    const searchTimeoutRef = useRef<NodeJS.Timeout>()
    const abortControllerRef = useRef<AbortController>()

    // Determinar si está controlado externamente o internamente
    const open = controlledOpen !== undefined ? controlledOpen : internalOpen
    const setOpen = controlledOpen !== undefined ? onOpenChange || (() => {}) : setInternalOpen

    useImperativeHandle(ref, () => ({ setOpen }), [setOpen])

    // Debounce optimizado
    useEffect(() => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
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
        }
      }
    }, [searchTerm])

    // Reset página cuando cambian los filtros
    useEffect(() => {
      setCurrentPage(1)
      setMembers([])
      setHasMore(true)
    }, [debouncedSearchTerm, statusFilter, membershipFilter])

    // Generar clave de cache
    const getCacheKey = useCallback((page: number, search: string, status: string, membership: string) => {
      return `mobile_${page}_${search}_${status}_${membership}`
    }, [])

    // Fetch optimizado con cache
    const fetchMembers = useCallback(
      async (page = 1, append = false) => {
        const cacheKey = getCacheKey(page, debouncedSearchTerm, statusFilter, membershipFilter)

        const cachedData = globalCacheMobile.get<SearchResponse>(cacheKey)
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
          return
        }

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

          globalCacheMobile.set(cacheKey, data)

          if (append && page > 1) {
            setMembers((prev) => [...prev, ...data.members])
          } else {
            setMembers(data.members)
            if (page === 1) {
              const memberships = [...new Set(data.members.map((m) => m.membership_name).filter(Boolean))]
              setUniqueMemberships(memberships)
            }
          }

          setTotalMembers(data.total)
          setHasMore(data.hasMore)
          setCurrentPage(page)
        } catch (error) {
          if (error.name !== "AbortError") {
            console.error("Error fetching members:", error)
          }
        } finally {
          setLoading(false)
          setLoadingMore(false)
          setInitialLoading(false)
        }
      },
      [debouncedSearchTerm, statusFilter, membershipFilter, getCacheKey],
    )

    // Cargar datos iniciales
    useEffect(() => {
      if (open && initialLoading) {
        fetchMembers(1, false)
      }
    }, [open, fetchMembers, initialLoading])

    // Cargar datos cuando cambian filtros
    useEffect(() => {
      if (open && !initialLoading) {
        fetchMembers(1, false)
      }
    }, [debouncedSearchTerm, statusFilter, membershipFilter, open, initialLoading, fetchMembers])

    // Cargar más datos
    const loadMore = useCallback(() => {
      if (!loadingMore && hasMore && !loading) {
        fetchMembers(currentPage + 1, true)
      }
    }, [currentPage, hasMore, loadingMore, loading, fetchMembers])

    // Scroll infinito con throttling
    const handleScroll = useMemo(
      () =>
        throttle((e: React.UIEvent<HTMLDivElement>) => {
          const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
          const scrollPercentage = (scrollTop + clientHeight) / scrollHeight

          if (scrollPercentage > 0.8 && hasMore && !loadingMore && !loading) {
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
      globalCacheMobile.clear()
      setCurrentPage(1)
      setMembers([])
      setHasMore(true)
      fetchMembers(1, false)
    }, [fetchMembers])

    const handlePaymentSuccess = useCallback(() => {
      globalCacheMobile.clear()
      setCurrentPage(1)
      setMembers([])
      setHasMore(true)
      fetchMembers(1, false)
    }, [fetchMembers])

    const refreshData = useCallback(() => {
      globalCacheMobile.clear()
      setCurrentPage(1)
      setMembers([])
      setHasMore(true)
      fetchMembers(1, false)
    }, [fetchMembers])

    const clearFilters = useCallback(() => {
      setSearchTerm("")
      setStatusFilter("all")
      setMembershipFilter("all")
    }, [])

    const hasActiveFilters = debouncedSearchTerm || statusFilter !== "all" || membershipFilter !== "all"

    const handleOpenChange = useCallback(
      (newOpen: boolean) => {
        setOpen(newOpen)
        if (!newOpen) {
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

          if (abortControllerRef.current) {
            abortControllerRef.current.abort()
          }
        } else {
          setInitialLoading(true)
        }
      },
      [setOpen],
    )

    const TriggerButton = () => (
      <Button
        variant="outline"
        className="border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white bg-slate-800/30 backdrop-blur-sm transition-all duration-300 w-full sm:w-auto text-xs sm:text-sm"
      >
        <Search className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
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
            className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-0 max-w-none w-full h-full border-0 rounded-none"
            style={{
              transform: "none",
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100vw",
              height: "100vh",
              margin: 0,
            }}
          >
            {/* Header fijo optimizado */}
            <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenChange(false)}
                    className="border-slate-600/50 text-slate-200 hover:bg-slate-700 hover:text-white bg-slate-800/80 backdrop-blur-sm shadow-lg rounded-xl p-2 transition-all duration-200"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <div>
                    <h1 className="text-xl font-bold text-white">Buscar Socios</h1>
                    <p className="text-sm text-slate-400">
                      {initialLoading ? "Cargando..." : `${totalMembers} ${totalMembers === 1 ? "socio" : "socios"}`}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshData}
                  disabled={loading}
                  className="border-slate-600/50 text-slate-200 hover:bg-slate-700 hover:text-white bg-slate-800/80 backdrop-blur-sm shadow-lg rounded-xl transition-all duration-200"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>

              {/* Barra de búsqueda optimizada */}
              <div className="px-4 pb-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                  <Input
                    placeholder={`Buscar por nombre, email, teléfono... (mín. ${MIN_SEARCH_LENGTH} caracteres)`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 pr-12 h-12 bg-slate-800/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-blue-400/20 rounded-xl text-base"
                  />
                  {loading && (
                    <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5 animate-spin" />
                  )}
                </div>

                {/* Botones de filtro */}
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex-1 border-slate-600/50 text-slate-300 hover:bg-slate-700/50 hover:text-white bg-slate-800/30 rounded-xl h-10 transition-all duration-200 ${
                      hasActiveFilters ? "border-blue-500/50 text-blue-400 bg-blue-500/10" : ""
                    }`}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filtros
                    {hasActiveFilters && (
                      <Badge className="ml-2 bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs px-1.5 py-0.5">
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
                      className="border-slate-600/50 text-slate-300 hover:bg-red-600/20 hover:text-red-400 hover:border-red-500/50 bg-slate-800/30 rounded-xl h-10 px-3 transition-all duration-200"
                    >
                      <FilterX className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Panel de filtros */}
                {showFilters && (
                  <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-4 space-y-4 border border-slate-700/50">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Estado</label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="bg-slate-800/50 border-slate-600/50 text-white rounded-xl h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600 rounded-xl">
                            <SelectItem value="all" className="text-white hover:bg-slate-700 rounded-lg">
                              Todos
                            </SelectItem>
                            <SelectItem value="active" className="text-white hover:bg-slate-700 rounded-lg">
                              Activos
                            </SelectItem>
                            <SelectItem value="expired" className="text-white hover:bg-slate-700 rounded-lg">
                              Vencidos
                            </SelectItem>
                            <SelectItem value="suspended" className="text-white hover:bg-slate-700 rounded-lg">
                              Suspendidos
                            </SelectItem>
                            <SelectItem value="inactive" className="text-white hover:bg-slate-700 rounded-lg">
                              Inactivos
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Membresía</label>
                        <Select value={membershipFilter} onValueChange={setMembershipFilter}>
                          <SelectTrigger className="bg-slate-800/50 border-slate-600/50 text-white rounded-xl h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600 rounded-xl">
                            <SelectItem value="all" className="text-white hover:bg-slate-700 rounded-lg">
                              Todas
                            </SelectItem>
                            {uniqueMemberships.map((membership) => (
                              <SelectItem
                                key={membership}
                                value={membership}
                                className="text-white hover:bg-slate-700 rounded-lg"
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
            </div>

            {/* Contenido scrollable optimizado */}
            <div className="flex-1 overflow-y-auto" onScroll={handleScroll}>
              <div className="p-4 pb-8">
                {initialLoading ? (
                  <div className="text-center py-16">
                    <Loader2 className="h-12 w-12 text-blue-400 mx-auto mb-4 animate-spin" />
                    <p className="text-slate-400 text-lg">Cargando socios...</p>
                  </div>
                ) : members.length === 0 ? (
                  <div className="text-center py-16">
                    <Users className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No se encontraron socios</h3>
                    <p className="text-slate-400 mb-6 px-4">
                      {hasActiveFilters
                        ? "Intenta ajustar los filtros de búsqueda"
                        : "No hay socios registrados en el sistema"}
                    </p>
                    {hasActiveFilters && (
                      <Button
                        variant="outline"
                        onClick={clearFilters}
                        className="border-slate-600/50 text-slate-300 hover:bg-slate-700/50 hover:text-white bg-slate-800/30 rounded-xl"
                      >
                        <FilterX className="h-4 w-4 mr-2" />
                        Limpiar filtros
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {members.map((member) => (
                      <MemberCard
                        key={member.id}
                        member={member}
                        onView={handleViewMember}
                        onEdit={handleEditMember}
                        onPayment={handlePayment}
                      />
                    ))}

                    {/* Indicador de carga para scroll infinito */}
                    {loadingMore && (
                      <div className="text-center py-6">
                        <Loader2 className="h-8 w-8 text-blue-400 mx-auto animate-spin mb-2" />
                        <p className="text-slate-400">Cargando más socios...</p>
                      </div>
                    )}

                    {/* Indicador de fin de datos */}
                    {!hasMore && members.length > 0 && (
                      <div className="text-center py-6">
                        <div className="w-12 h-px bg-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">Se han mostrado todos los {totalMembers} socios</p>
                      </div>
                    )}
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

SearchMembersModalMobile.displayName = "SearchMembersModalMobile"

export default SearchMembersModalMobile
