import { redirect, notFound } from "next/navigation"
import { getSession } from "@/lib/auth"
import { getMemberById } from "@/lib/database"
import MemberDetailsModal from "@/components/member-details-modal"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

// Force dynamic rendering to avoid static generation issues with cookies
export const dynamic = "force-dynamic"

interface MemberPageProps {
  params: {
    id: string
  }
}

function BackButton() {
  "use client"

  return (
    <Button
      variant="outline"
      size="sm"
      className="border-slate-600 text-slate-300 hover:bg-slate-700/50 bg-transparent"
      onClick={() => window.history.back()}
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      Volver
    </Button>
  )
}

export default async function MemberPage({ params }: MemberPageProps) {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  const member = await getMemberById(Number.parseInt(params.id))

  if (!member) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <BackButton />
          <h1 className="text-2xl font-bold text-white">Detalles del Socio</h1>
        </div>

        {/* Member Details Modal as Full Page */}
        <MemberDetailsModal member={member} />
      </div>
    </div>
  )
}
