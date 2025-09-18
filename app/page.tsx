import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import Dashboard from "@/components/dashboard"
import MobileHeader from "@/components/mobile-header"
import { HeaderDateTime } from "@/components/header-date-time"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
      </div>

      <header className="relative z-10 bg-slate-800/50 border-b border-slate-700/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop Header - unchanged */}
          <div className="hidden md:flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 flex items-center justify-center">
                <img
                  src="/fithouse-logo.jpg"
                  alt="FitHouse Gym Logo"
                  className="h-full w-full object-contain rounded-xl"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 via-sky-500 to-cyan-400 bg-clip-text text-transparent">
                  FitHouse Gym
                </h1>
                <p className="text-sm text-slate-400">Sistema de Gestión de Socios</p>
              </div>
            </div>

            {/* Center - Date and Time */}
            <div className="flex-1 flex justify-center">
              <HeaderDateTime />
            </div>

            <div className="flex items-center space-x-6">
              <div className="text-right">
                <p className="text-sm text-slate-300">Bienvenido,</p>
                <p className="font-semibold text-white">{session.user.name}</p>
              </div>
              <form action="/api/auth/logout" method="POST">
                <button className="text-sm text-red-400 hover:text-red-300 transition-colors px-4 py-2 rounded-lg hover:bg-red-500/10">
                  Cerrar Sesión
                </button>
              </form>
            </div>
          </div>

          {/* Mobile Header - modern and responsive */}
          <div className="md:hidden">
            <MobileHeader user={session.user} />
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<div className="text-center py-8 text-white">Cargando...</div>}>
          <Dashboard />
        </Suspense>
      </main>
    </div>
  )
}
