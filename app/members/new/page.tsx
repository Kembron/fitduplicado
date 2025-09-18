import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import NewMemberForm from "@/components/new-member-form"

// Force dynamic rendering to avoid static generation issues with cookies
export const dynamic = "force-dynamic"

export default async function NewMemberPage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Nuevo Socio</h1>
        <p className="text-muted-foreground">Registra un nuevo socio en el sistema</p>
      </div>
      <NewMemberForm />
    </div>
  )
}
