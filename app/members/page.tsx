import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import MembersSearch from "@/components/members-search"

// Force dynamic rendering to avoid static generation issues with cookies
export const dynamic = "force-dynamic"

export default async function MembersPage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Gestión de Socios</h1>
        <p className="text-muted-foreground">Busca, edita y gestiona los socios del gimnasio</p>
      </div>
      <MembersSearch />
    </div>
  )
}
