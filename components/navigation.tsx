"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, Users, CreditCard, BarChart3, Settings, Shield, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Socios", href: "/members", icon: Users },
  { name: "Pagos", href: "/payments", icon: CreditCard },
  { name: "Reportes", href: "/reports", icon: BarChart3 },
  { name: "Auditoría", href: "/audit", icon: Shield },
  { name: "Configuración", href: "/settings", icon: Settings },
]

export default function Navigation() {
  const pathname = usePathname()

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" })

      if (response.redirected) {
        window.location.href = response.url
      } else if (response.ok) {
        window.location.href = "/login"
      } else {
        console.error("Error logging out")
        window.location.href = "/login"
      }
    } catch (error) {
      console.error("Error logging out:", error)
      window.location.href = "/login"
    }
  }

  return (
    <nav className="bg-slate-900 border-r border-slate-700 w-64 min-h-screen p-4">
      <div className="flex flex-col h-full">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-white">FitHouse Gym</h1>
          <p className="text-sm text-slate-400">Sistema de Gestión</p>
        </div>

        <div className="flex-1 space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white",
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </div>

        <div className="mt-auto pt-4 border-t border-slate-700">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Cerrar Sesión
          </Button>
        </div>
      </div>
    </nav>
  )
}
