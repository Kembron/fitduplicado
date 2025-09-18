import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import ReportsDashboard from "@/components/reports-dashboard"

// Force dynamic rendering to avoid static generation issues with cookies
export const dynamic = "force-dynamic"

export default async function ReportsPage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen">
      <ReportsDashboard />
    </div>
  )
}
