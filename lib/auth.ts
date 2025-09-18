import { cookies } from "next/headers"
import type { NextRequest } from "next/server"
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

export async function getSession(): Promise<Session | null> {
  const maxRetries = 2
  let retryCount = 0

  while (retryCount < maxRetries) {
    try {
      const cookieStore = await cookies()
      const token = cookieStore.get("auth-token")?.value

      if (!token?.trim()) {
        console.log("No token found in cookies")
        return null
      }

      // Validar formato básico del token
      if (token.split(".").length !== 3) {
        console.log("Invalid token format")
        return null
      }

      console.log("Token found, verifying...")

      const jwtSecret = process.env.JWT_SECRET
      if (!jwtSecret) {
        console.error("JWT_SECRET not configured")
        return null
      }

      const decoded = jwt.verify(token, jwtSecret) as User

      // Validar que el token decodificado tenga los campos requeridos
      if (!decoded.userId || !decoded.email || !decoded.name) {
        console.log("Invalid token payload")
        return null
      }

      console.log("Token verified for user:", decoded.username || decoded.email)

      return {
        user: decoded,
      }
    } catch (error) {
      retryCount++

      if (error.name === "TokenExpiredError") {
        console.log("Token expired")
        return null
      } else if (error.name === "JsonWebTokenError") {
        console.log("Invalid token")
        return null
      } else {
        console.error(`Error verifying token (attempt ${retryCount}/${maxRetries}):`, error)

        if (retryCount >= maxRetries) {
          return null
        }

        // Esperar antes del siguiente intento
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }
  }

  return null
}

export async function createSession(user: { id: number; email: string; username: string; name: string; role: string }) {
  try {
    // Validar datos del usuario
    if (!user.id || !user.email?.trim() || !user.username?.trim() || !user.name?.trim() || !user.role?.trim()) {
      throw new Error("Datos de usuario inválidos para crear sesión")
    }

    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      throw new Error("JWT_SECRET no configurado")
    }

    const payload = {
      userId: user.id,
      email: user.email.toLowerCase().trim(),
      username: user.username.toLowerCase().trim(),
      name: user.name.trim(),
      role: user.role.trim(),
      iat: Math.floor(Date.now() / 1000), // Timestamp de emisión
    }

    const token = jwt.sign(payload, jwtSecret, {
      expiresIn: "7d",
      issuer: "fithouse-gym",
      audience: "fithouse-users",
    })

    const cookieStore = await cookies()

    // Configurar cookie con opciones de seguridad mejoradas
    cookieStore.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 días
      path: "/",
      // Agregar flag de seguridad adicional en producción
      ...(process.env.NODE_ENV === "production" && {
        domain: process.env.COOKIE_DOMAIN,
      }),
    })

    console.log(`✅ Sesión creada para usuario: ${user.username} (${user.email})`)
    return token
  } catch (error) {
    console.error("Error creating session:", error)
    throw new Error("No se pudo crear la sesión")
  }
}

export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete("auth-token")
}

export async function verifyAuth(request: NextRequest): Promise<User | null> {
  const maxRetries = 2
  let retryCount = 0

  while (retryCount < maxRetries) {
    try {
      const authHeader = request.headers.get("authorization")
      const cookieHeader = request.headers.get("cookie")

      let token: string | undefined

      // Try to get token from Authorization header first
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim()
      } else if (cookieHeader) {
        // Try to get token from cookies
        const cookies = cookieHeader.split(";").reduce(
          (acc, cookie) => {
            const [key, value] = cookie.trim().split("=")
            if (key && value) {
              acc[key] = value
            }
            return acc
          },
          {} as Record<string, string>,
        )

        token = cookies["auth-token"]
      }

      if (!token?.trim()) {
        console.log("No token found in request")
        return null
      }

      // Validar formato básico del token
      if (token.split(".").length !== 3) {
        console.log("Invalid token format in request")
        return null
      }

      console.log("Token found, verifying...")

      const jwtSecret = process.env.JWT_SECRET
      if (!jwtSecret) {
        console.error("JWT_SECRET not configured")
        return null
      }

      const decoded = jwt.verify(token, jwtSecret, {
        issuer: "fithouse-gym",
        audience: "fithouse-users",
      }) as User

      // Validar que el token decodificado tenga los campos requeridos
      if (!decoded.userId || !decoded.email || !decoded.name) {
        console.log("Invalid token payload in request")
        return null
      }

      console.log("Token verified for user:", decoded.username || decoded.email)
      return decoded
    } catch (error) {
      retryCount++

      if (error.name === "TokenExpiredError") {
        console.log("Token expired in request")
        return null
      } else if (error.name === "JsonWebTokenError") {
        console.log("Invalid token in request")
        return null
      } else {
        console.error(`Error verifying token in request (attempt ${retryCount}/${maxRetries}):`, error)

        if (retryCount >= maxRetries) {
          return null
        }

        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }
  }

  return null
}
