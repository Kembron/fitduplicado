import { neon } from "@neondatabase/serverless"

export const db = {
  query: async (text: string, params: any[] = []) => {
    const sql = neon(process.env.DATABASE_URL!)
    // Change this line:
    const result = await sql.query(text, params) // Use sql.query() for text and params
    return { rows: result }
  },
}
