"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import {
  Users,
  UserPlus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Shield,
  ClipboardList,
  XCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  RefreshCw,
  Loader2,
  Clock,
  Calendar,
  Activity,
  LogIn,
  FileEdit,
  FilePlus,
  FileX,
  UserCog,
  Lock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Save,
  Mail,
} from "lucide-react"

interface User {
  id: number
  name: string
  email: string
  username: string
  role: string
  created_at: string
  last_login: string | null
  is_active: boolean
  stats?: {
    total_actions: number
    last_activity: string | null
    recent_actions: number
  }
}

interface UserFormData {
  name: string
  email: string
  username: string
  password: string
  confirmPassword: string
  role: string
  is_active: boolean
}

interface ActivityLog {
  id: number
  action_type: string
  table_name: string | null
  record_id: number | null
  description: string
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

interface ActivityStats {
  total_actions: number
  recent_actions: number
  login_count: number
  create_count: number
  update_count: number
  delete_count: number
  last_activity: string | null
}

interface ActivityResponse {
  user: User
  activity: ActivityLog[]
  stats: ActivityStats
  pagination: {
    total: number
    limit: number
    offset: number
  }
}

export default function UserManagement() {
  // Estados para la lista de usuarios
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // Estados para el formulario de usuario
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<UserFormData>({
    name: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    role: "manager",
    is_active: true,
  })
  const [formErrors, setFormErrors] = useState<Partial<UserFormData>>({})
  const [showPassword, setShowPassword] = useState(false)

  // Estados para la actividad del usuario
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false)
  const [activityData, setActivityData] = useState<ActivityResponse | null>(null)
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityPage, setActivityPage] = useState(0)
  const [activityLimit] = useState(10)
  const [activityFilter, setActivityFilter] = useState<string>("all")

  // Cargar usuarios
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/users?query=${searchTerm}&role=${roleFilter !== "all" ? roleFilter : ""}`)

      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      } else {
        const error = await res.json()
        toast.error("Error al cargar usuarios", {
          description: error.error || "No se pudieron cargar los usuarios",
        })
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      toast.error("Error de conexión", {
        description: "No se pudo conectar con el servidor",
      })
    } finally {
      setLoading(false)
    }
  }

  // Cargar actividad de un usuario
  const fetchUserActivity = async (userId: number) => {
    try {
      setActivityLoading(true)
      const offset = activityPage * activityLimit
      const res = await fetch(
        `/api/users/${userId}/activity?limit=${activityLimit}&offset=${offset}&action_type=${activityFilter}`,
      )

      if (res.ok) {
        const data = await res.json()
        setActivityData(data)
      } else {
        const error = await res.json()
        toast.error("Error al cargar actividad", {
          description: error.error || "No se pudo cargar la actividad del usuario",
        })
      }
    } catch (error) {
      console.error("Error fetching user activity:", error)
      toast.error("Error de conexión", {
        description: "No se pudo conectar con el servidor",
      })
    } finally {
      setActivityLoading(false)
    }
  }

  // Efecto para cargar usuarios al montar el componente
  useEffect(() => {
    fetchUsers()
  }, [searchTerm, roleFilter, statusFilter])

  // Efecto para cargar actividad cuando cambia el usuario o la página
  useEffect(() => {
    if (currentUser && isActivityDialogOpen) {
      fetchUserActivity(currentUser.id)
    }
  }, [currentUser, isActivityDialogOpen, activityPage, activityFilter])

  // Filtrar usuarios según los filtros aplicados
  const filteredUsers = users.filter((user) => {
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && user.is_active) ||
      (statusFilter === "inactive" && !user.is_active)

    return matchesStatus
  })

  // Validar formulario
  const validateForm = (data: UserFormData, isEdit: boolean): boolean => {
    const errors: Partial<UserFormData> = {}

    if (!data.name.trim()) {
      errors.name = "El nombre es obligatorio"
    }

    if (!data.email.trim()) {
      errors.email = "El email es obligatorio"
    } else if (!/\S+@\S+\.\S+/.test(data.email)) {
      errors.email = "Email inválido"
    }

    if (!data.username.trim()) {
      errors.username = "El nombre de usuario es obligatorio"
    } else if (data.username.length < 3) {
      errors.username = "El nombre de usuario debe tener al menos 3 caracteres"
    } else if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
      errors.username = "El nombre de usuario solo puede contener letras, números y guiones bajos"
    }

    if (!isEdit) {
      if (!data.password) {
        errors.password = "La contraseña es obligatoria"
      } else if (data.password.length < 6) {
        errors.password = "La contraseña debe tener al menos 6 caracteres"
      }

      if (data.password !== data.confirmPassword) {
        errors.confirmPassword = "Las contraseñas no coinciden"
      }
    } else if (data.password && data.password.length < 6) {
      errors.password = "La contraseña debe tener al menos 6 caracteres"
    } else if (data.password && data.password !== data.confirmPassword) {
      errors.confirmPassword = "Las contraseñas no coinciden"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Crear usuario
  const handleCreateUser = async () => {
    if (!validateForm(formData, false)) return

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          username: formData.username,
          password: formData.password,
          role: formData.role,
          is_active: formData.is_active,
        }),
      })

      if (res.ok) {
        const newUser = await res.json()
        setUsers([newUser, ...users])
        setIsCreateDialogOpen(false)
        resetForm()
        toast.success("Usuario creado correctamente", {
          description: `${newUser.name} (@${newUser.username}) ha sido creado`,
        })
      } else {
        const error = await res.json()
        toast.error("Error al crear usuario", {
          description: error.error || "No se pudo crear el usuario",
        })
      }
    } catch (error) {
      console.error("Error creating user:", error)
      toast.error("Error de conexión", {
        description: "No se pudo conectar con el servidor",
      })
    }
  }

  // Actualizar usuario
  const handleUpdateUser = async () => {
    if (!currentUser) return
    if (!validateForm(formData, true)) return

    try {
      const userData: any = {
        name: formData.name,
        email: formData.email,
        username: formData.username,
        role: formData.role,
        is_active: formData.is_active,
      }

      // Solo incluir contraseña si se ha modificado
      if (formData.password) {
        userData.password = formData.password
      }

      const res = await fetch(`/api/users/${currentUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      })

      if (res.ok) {
        const updatedUser = await res.json()
        setUsers(users.map((user) => (user.id === updatedUser.id ? { ...user, ...updatedUser } : user)))
        setIsEditDialogOpen(false)
        resetForm()
        toast.success("Usuario actualizado correctamente", {
          description: `${updatedUser.name} (@${updatedUser.username}) ha sido actualizado`,
        })
      } else {
        const error = await res.json()
        toast.error("Error al actualizar usuario", {
          description: error.error || "No se pudo actualizar el usuario",
        })
      }
    } catch (error) {
      console.error("Error updating user:", error)
      toast.error("Error de conexión", {
        description: "No se pudo conectar con el servidor",
      })
    }
  }

  // Eliminar usuario
  const handleDeleteUser = async (userId: number, userName: string, userUsername: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        setUsers(users.filter((user) => user.id !== userId))
        toast.success("Usuario eliminado correctamente", {
          description: `${userName} (@${userUsername}) ha sido eliminado del sistema`,
        })
      } else {
        const error = await res.json()
        toast.error("Error al eliminar usuario", {
          description: error.error || "No se pudo eliminar el usuario",
        })
      }
    } catch (error) {
      console.error("Error deleting user:", error)
      toast.error("Error de conexión", {
        description: "No se pudo conectar con el servidor",
      })
    }
  }

  // Ver actividad de usuario
  const handleViewActivity = (user: User) => {
    setCurrentUser(user)
    setActivityPage(0)
    setActivityFilter("all")
    setIsActivityDialogOpen(true)
  }

  // Editar usuario
  const handleEditUser = (user: User) => {
    setCurrentUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      username: user.username,
      password: "",
      confirmPassword: "",
      role: user.role,
      is_active: user.is_active,
    })
    setIsEditDialogOpen(true)
  }

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
      role: "manager",
      is_active: true,
    })
    setFormErrors({})
    setShowPassword(false)
  }

  // Formatear fecha
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  // Obtener color de badge según el rol
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-500 hover:bg-red-600"
      case "manager":
        return "bg-blue-500 hover:bg-blue-600"
      default:
        return "bg-slate-500 hover:bg-slate-600"
    }
  }

  // Obtener icono para el tipo de acción
  const getActionTypeIcon = (actionType: string) => {
    switch (actionType) {
      case "LOGIN":
        return <LogIn className="h-4 w-4" />
      case "CREATE":
        return <FilePlus className="h-4 w-4" />
      case "UPDATE":
        return <FileEdit className="h-4 w-4" />
      case "DELETE":
        return <FileX className="h-4 w-4" />
      case "VIEW":
        return <Eye className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  // Obtener color para el tipo de acción
  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case "LOGIN":
        return "text-green-500"
      case "CREATE":
        return "text-blue-500"
      case "UPDATE":
        return "text-amber-500"
      case "DELETE":
        return "text-red-500"
      case "VIEW":
        return "text-slate-500"
      default:
        return "text-slate-400"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuarios del Sistema
          </h3>
          <p className="text-sm text-slate-400">{filteredUsers.length} usuarios en el sistema</p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setIsCreateDialogOpen(true)
          }}
          className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-700 border-slate-600 text-white"
            />
          </div>
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-white">
            <SelectValue placeholder="Filtrar por rol" />
          </SelectTrigger>
          <SelectContent className="bg-slate-700 border-slate-600">
            <SelectItem value="all">Todos los roles</SelectItem>
            <SelectItem value="admin">Administradores</SelectItem>
            <SelectItem value="manager">Gerentes</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-white">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent className="bg-slate-700 border-slate-600">
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="icon"
          onClick={fetchUsers}
          className="bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-colors duration-200"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-2" />
            <p className="text-slate-400">Cargando usuarios...</p>
          </div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-400">No se encontraron usuarios</p>
          {(searchTerm || roleFilter !== "all" || statusFilter !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("")
                setRoleFilter("all")
                setStatusFilter("all")
              }}
              className="mt-2 border-slate-600"
            >
              Limpiar filtros
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className={`flex items-center justify-between p-4 bg-slate-700 rounded-lg border transition-all hover:bg-slate-600/50 ${
                !user.is_active ? "border-red-500/30 bg-red-900/10" : "border-slate-600"
              }`}
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="flex-shrink-0">
                  {user.role === "admin" ? (
                    <Shield className="h-8 w-8 text-red-400" />
                  ) : (
                    <UserCog className="h-8 w-8 text-blue-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-medium">{user.name}</h3>
                    <Badge className={getRoleBadgeColor(user.role)}>
                      {user.role === "admin" ? "Administrador" : "Gerente"}
                    </Badge>
                    {!user.is_active && (
                      <Badge variant="outline" className="text-red-400 border-red-400">
                        <XCircle className="h-3 w-3 mr-1" />
                        Inactivo
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                    <Mail className="h-3 w-3" />
                    <span>{user.email}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Creado: {formatDate(user.created_at)}
                    </span>
                    {user.last_login && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Último acceso: {formatDate(user.last_login)}
                      </span>
                    )}
                    {user.stats && (
                      <span className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        {user.stats.total_actions} acciones
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      className="bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-colors duration-200"
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-slate-700 border-slate-600">
                    <DropdownMenuLabel className="text-slate-300">Acciones</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-slate-600" />
                    <DropdownMenuItem
                      onClick={() => handleEditUser(user)}
                      className="text-slate-300 hover:bg-slate-600"
                    >
                      <Edit className="h-3 w-3 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleViewActivity(user)}
                      className="text-slate-300 hover:bg-slate-600"
                    >
                      <ClipboardList className="h-3 w-3 mr-2" />
                      Ver Actividad
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-slate-600" />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                          onSelect={(e) => e.preventDefault()}
                          className="text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3 w-3 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-slate-800 border-slate-700">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-400" />
                            ¿Eliminar usuario?
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-400">
                            Esta acción eliminará permanentemente a <strong>{user.name}</strong> (@{user.username}) del
                            sistema. Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-green-500/10 border-green-500/50 text-green-300 hover:bg-green-600 hover:border-green-600 hover:text-white transition-colors duration-200">
                            Cancelar
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteUser(user.id, user.name, user.username)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Diálogo para crear usuario */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Crear Nuevo Usuario
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Completa el formulario para crear un nuevo usuario en el sistema
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-slate-300">
                Nombre completo
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`bg-slate-700 border-slate-600 text-white ${formErrors.name ? "border-red-500" : ""}`}
                placeholder="Ej: Juan Pérez"
              />
              {formErrors.name && <p className="text-red-400 text-xs mt-1">{formErrors.name}</p>}
            </div>
            <div>
              <Label htmlFor="username" className="text-slate-300">
                Nombre de usuario
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                  className={`bg-slate-700 border-slate-600 text-white pl-10 ${formErrors.username ? "border-red-500" : ""}`}
                  placeholder="Ej: admin, manager1"
                />
              </div>
              {formErrors.username && <p className="text-red-400 text-xs mt-1">{formErrors.username}</p>}
              <p className="text-xs text-slate-400 mt-1">Solo letras, números y guiones bajos. Mínimo 3 caracteres.</p>
            </div>
            <div>
              <Label htmlFor="email" className="text-slate-300">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`bg-slate-700 border-slate-600 text-white pl-10 ${formErrors.email ? "border-red-500" : ""}`}
                  placeholder="Ej: usuario@gimnasio.com"
                />
              </div>
              {formErrors.email && <p className="text-red-400 text-xs mt-1">{formErrors.email}</p>}
            </div>
            <div>
              <Label htmlFor="password" className="text-slate-300">
                Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`bg-slate-700 border-slate-600 text-white pr-10 ${formErrors.password ? "border-red-500" : ""}`}
                  placeholder="Mínimo 6 caracteres"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {formErrors.password && <p className="text-red-400 text-xs mt-1">{formErrors.password}</p>}
            </div>
            <div>
              <Label htmlFor="confirmPassword" className="text-slate-300">
                Confirmar contraseña
              </Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className={`bg-slate-700 border-slate-600 text-white ${formErrors.confirmPassword ? "border-red-500" : ""}`}
                placeholder="Repetir contraseña"
              />
              {formErrors.confirmPassword && <p className="text-red-400 text-xs mt-1">{formErrors.confirmPassword}</p>}
            </div>
            <div>
              <Label htmlFor="role" className="text-slate-300">
                Rol
              </Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger id="role" className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="manager">Gerente</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400 mt-1">
                {formData.role === "admin"
                  ? "Acceso completo a todas las funciones del sistema"
                  : "Acceso limitado a funciones básicas de gestión"}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="active" className="text-slate-300">
                  Estado de la cuenta
                </Label>
                <p className="text-xs text-slate-400">La cuenta estará activa inmediatamente</p>
              </div>
              <Switch
                id="active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateUser} className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="h-4 w-4 mr-2" />
              Crear Usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para editar usuario */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Editar Usuario
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Modifica los datos del usuario {currentUser?.name} (@{currentUser?.username})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name" className="text-slate-300">
                Nombre completo
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`bg-slate-700 border-slate-600 text-white ${formErrors.name ? "border-red-500" : ""}`}
              />
              {formErrors.name && <p className="text-red-400 text-xs mt-1">{formErrors.name}</p>}
            </div>
            <div>
              <Label htmlFor="edit-username" className="text-slate-300">
                Nombre de usuario
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="edit-username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                  className={`bg-slate-700 border-slate-600 text-white pl-10 ${formErrors.username ? "border-red-500" : ""}`}
                />
              </div>
              {formErrors.username && <p className="text-red-400 text-xs mt-1">{formErrors.username}</p>}
            </div>
            <div>
              <Label htmlFor="edit-email" className="text-slate-300">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`bg-slate-700 border-slate-600 text-white pl-10 ${formErrors.email ? "border-red-500" : ""}`}
                />
              </div>
              {formErrors.email && <p className="text-red-400 text-xs mt-1">{formErrors.email}</p>}
            </div>
            <div>
              <Label htmlFor="edit-password" className="text-slate-300 flex items-center gap-2">
                <Lock className="h-3 w-3" />
                Cambiar contraseña <span className="text-xs text-slate-400">(opcional)</span>
              </Label>
              <div className="relative">
                <Input
                  id="edit-password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Dejar en blanco para mantener la actual"
                  className={`bg-slate-700 border-slate-600 text-white pr-10 ${formErrors.password ? "border-red-500" : ""}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {formErrors.password && <p className="text-red-400 text-xs mt-1">{formErrors.password}</p>}
            </div>
            {formData.password && (
              <div>
                <Label htmlFor="edit-confirmPassword" className="text-slate-300">
                  Confirmar nueva contraseña
                </Label>
                <Input
                  id="edit-confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className={`bg-slate-700 border-slate-600 text-white ${formErrors.confirmPassword ? "border-red-500" : ""}`}
                />
                {formErrors.confirmPassword && (
                  <p className="text-red-400 text-xs mt-1">{formErrors.confirmPassword}</p>
                )}
              </div>
            )}
            <div>
              <Label htmlFor="edit-role" className="text-slate-300">
                Rol
              </Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger id="edit-role" className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="manager">Gerente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="edit-active" className="text-slate-300">
                  Estado de la cuenta
                </Label>
                <p className="text-xs text-slate-400">
                  {formData.is_active ? "La cuenta está activa" : "La cuenta está desactivada"}
                </p>
              </div>
              <Switch
                id="edit-active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="border-red-500/50 text-red-300 bg-red-500/10 hover:bg-red-600 hover:border-red-600 hover:text-white transition-colors duration-200"
            >
              Cancelar
            </Button>
            <Button onClick={handleUpdateUser} className="bg-blue-600 hover:bg-blue-700">
              <Save className="h-4 w-4 mr-2" />
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de actividad del usuario */}
      <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Actividad de {currentUser?.name} (@{currentUser?.username})
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Historial de acciones y estadísticas del usuario
            </DialogDescription>
          </DialogHeader>

          {activityLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            </div>
          ) : activityData ? (
            <div className="space-y-4">
              {/* Estadísticas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-700 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-white">{activityData.stats.total_actions}</div>
                  <div className="text-xs text-slate-400">Total acciones</div>
                </div>
                <div className="bg-slate-700 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-green-400">{activityData.stats.login_count}</div>
                  <div className="text-xs text-slate-400">Inicios de sesión</div>
                </div>
                <div className="bg-slate-700 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-blue-400">{activityData.stats.create_count}</div>
                  <div className="text-xs text-slate-400">Creaciones</div>
                </div>
                <div className="bg-slate-700 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-amber-400">{activityData.stats.update_count}</div>
                  <div className="text-xs text-slate-400">Actualizaciones</div>
                </div>
              </div>

              {/* Filtro de actividad */}
              <div className="flex gap-2">
                <Select value={activityFilter} onValueChange={setActivityFilter}>
                  <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Filtrar por acción" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="all">Todas las acciones</SelectItem>
                    <SelectItem value="LOGIN">Inicios de sesión</SelectItem>
                    <SelectItem value="CREATE">Creaciones</SelectItem>
                    <SelectItem value="UPDATE">Actualizaciones</SelectItem>
                    <SelectItem value="DELETE">Eliminaciones</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Lista de actividad */}
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {activityData.activity.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 bg-slate-700 rounded-lg">
                      <div className={`mt-1 ${getActionTypeColor(log.action_type)}`}>
                        {getActionTypeIcon(log.action_type)}
                      </div>
                      <div className="flex-1">
                        <div className="text-white text-sm">{log.description}</div>
                        <div className="text-xs text-slate-400 mt-1">
                          {formatDate(log.created_at)}
                          {log.ip_address && <span className="ml-2">• IP: {log.ip_address}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Paginación */}
              {activityData.pagination.total > activityLimit && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-400">
                    Mostrando {activityPage * activityLimit + 1} -{" "}
                    {Math.min((activityPage + 1) * activityLimit, activityData.pagination.total)} de{" "}
                    {activityData.pagination.total}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActivityPage(0)}
                      disabled={activityPage === 0}
                      className="border-slate-600"
                    >
                      <ChevronsLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActivityPage(Math.max(0, activityPage - 1))}
                      disabled={activityPage === 0}
                      className="border-slate-600"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActivityPage(activityPage + 1)}
                      disabled={(activityPage + 1) * activityLimit >= activityData.pagination.total}
                      className="border-slate-600"
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActivityPage(Math.floor(activityData.pagination.total / activityLimit))}
                      disabled={(activityPage + 1) * activityLimit >= activityData.pagination.total}
                      className="border-slate-600"
                    >
                      <ChevronsRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">No se pudo cargar la actividad del usuario</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
