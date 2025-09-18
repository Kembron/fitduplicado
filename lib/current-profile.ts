import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { neon } from "@neondatabase/serverless"

export interface Profile {
  id: number
  email: string
  username: string
  role: string
}

export async function currentProfile(): Promise<Profile | null> {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get("auth-token")?.value

    if (!token) {
      return null
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    if (!decoded?.userId) {
      return null
    }

    const sql = neon(process.env.DATABASE_URL!)
    const users = await sql`
      SELECT id, email, username, role 
      FROM users 
      WHERE id = ${decoded.userId} AND active = true
    `

    if (users.length === 0) {
      return null
    }

    return {
      id: users[0].id,
      email: users[0].email,
      username: users[0].username,
      role: users[0].role,
    }
  } catch (error) {
    console.error("Error getting current profile:", error)
    return null
  }
}
