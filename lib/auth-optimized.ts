import { cookies } from "next/headers"
import jwt from "jsonwebtoken"

export interface User {
  userId: number
  email: string
  username: string
  name: string
  role: string
}

export interface Session {
  user: User
}

// Cache simple en memoria para sesiones (solo para desarrollo)
const sessionCache = new Map<string, { user: User; expires: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

/**
 * Versión optimizada de getSession con cache y mejor manejo de errores
 */
export async function getSessionOptimized(): Promise<Session | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value

    if (!token?.trim()) {
      return null
    }

    // Verificar cache primero
    const cached = sessionCache.get(token)
    if (cached && cached.expires > Date.now()) {
      return { user: cached.user }
    }

    // Validar formato básico del token rápidamente
    const tokenParts = token.split(".")
    if (tokenParts.length !== 3) {
      return null
    }

    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      console.error("JWT_SECRET not configured")
      return null
    }

    // Verificar token
    const decoded = jwt.verify(token, jwtSecret, {
      issuer: "fithouse-gym",
      audience: "fithouse-users",
    }) as User

    // Validar campos requeridos
    if (!decoded.userId || !decoded.email || !decoded.name) {
      return null
    }

    // Guardar en cache
    sessionCache.set(token, {
      user: decoded,
      expires: Date.now() + CACHE_DURATION,
    })

    return { user: decoded }
  } catch (error) {
    if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
      return null
    }
    console.error("Error verifying token:", error)
    return null
  }
}

/**
 * Función rápida para verificar solo el rol del usuario
 */
export async function getUserRole(): Promise<string | null> {
  try {
    const session = await getSessionOptimized()
    console.log("getUserRole: Session data:", session)
    return session?.user?.role || null
  } catch {
    return null
  }
}

/**
 * Función para limpiar cache de sesión
 */
export function clearSessionCache(): void {
  sessionCache.clear()
}

/**
 * Función para verificar si el usuario es admin sin cargar toda la sesión
 */
export async function isUserAdmin(): Promise<boolean> {
  try {
    const role = await getUserRole()
    return role === "admin"
  } catch {
    return false
  }
}
