import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import AuditClientPage from "./AuditClientPage"

// Añade esta línea para forzar la renderización dinámica en el servidor
export const dynamic = 'force-dynamic';

export default async function AuditPage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  return <AuditClientPage />
}
