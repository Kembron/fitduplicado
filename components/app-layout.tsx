"use client"

import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, CalendarDays, ChevronDown, ClipboardList, LogOut, Menu, Search, Shield, User } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { HeaderDateTime } from "@/components/header-date-time"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isSearching, setIsSearching] = useState(false)

  const handleLogout = async () => {
    try {
      // Hacer la petición de logout
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      })

      // Si la respuesta es una redirección, navegar manualmente
      if (response.redirected) {
        window.location.href = response.url
      } else if (response.ok) {
        // Si no hay redirección automática, navegar manualmente
        window.location.href = "/login"
      } else {
        console.error("Error al cerrar sesión")
      }
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
      // En caso de error, navegar al login de todas formas
      window.location.href = "/login"
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Desktop Header - con fecha y hora en el medio */}
        <div className="hidden md:flex h-16 items-center gap-4 px-4 md:px-6">
          {/* Left Navigation */}
          <nav className="flex flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold md:text-base">
              <CalendarDays className="h-6 w-6" />
              <span>FitHouse Gym</span>
            </Link>
            <Link href="/" className="text-foreground transition-colors hover:text-foreground">
              Dashboard
            </Link>
            <Link href="/members" className="text-muted-foreground transition-colors hover:text-foreground">
              Socios
            </Link>
            <Link href="/reports" className="text-muted-foreground transition-colors hover:text-foreground">
              Reportes
            </Link>
            <Link href="/audit" className="text-muted-foreground transition-colors hover:text-foreground">
              Auditoría
            </Link>
          </nav>

          {/* Center - Date and Time */}
          <div className="flex-1 flex justify-center">
            <HeaderDateTime />
          </div>

          {/* Right Side - Search and User */}
          <div className="flex items-center gap-4">
            <div className="relative flex items-center gap-4 md:gap-2 lg:gap-4">
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 bg-transparent"
                onClick={() => setIsSearching(!isSearching)}
              >
                <Search className="h-5 w-5" />
                <span className="sr-only">Toggle search</span>
              </Button>
              {isSearching && (
                <div className="absolute right-0 top-0 z-10 flex w-80 items-center overflow-hidden rounded-md border bg-background p-1">
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <Input
                    className="flex h-8 w-full border-0 bg-transparent p-2 shadow-none focus-visible:ring-0"
                    placeholder="Buscar socios..."
                    autoFocus
                    onBlur={() => setIsSearching(false)}
                  />
                </div>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full bg-transparent">
                  <Bell className="h-5 w-5" />
                  <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0">3</Badge>
                  <span className="sr-only">Toggle notifications</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <div className="flex flex-col gap-1">
                    <div className="text-sm font-medium">5 membresías por vencer</div>
                    <div className="text-xs text-muted-foreground">Hace 5 minutos</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <div className="flex flex-col gap-1">
                    <div className="text-sm font-medium">3 pagos pendientes</div>
                    <div className="text-xs text-muted-foreground">Hace 15 minutos</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <div className="flex flex-col gap-1">
                    <div className="text-sm font-medium">Nuevo socio registrado</div>
                    <div className="text-xs text-muted-foreground">Hace 3 horas</div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src="/placeholder.svg" alt="Admin" />
                    <AvatarFallback>A</AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline">Admin</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Actividad
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Shield className="mr-2 h-4 w-4" />
                  Seguridad
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Modern Mobile Header */}
        <div className="flex md:hidden h-14 items-center justify-between px-4 bg-gradient-to-r from-blue-600 to-blue-700">
          {/* Left side - Logo and Menu */}
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Abrir menú</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <div className="flex flex-col h-full">
                  {/* Header del Sheet */}
                  <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/10 rounded-lg">
                        <CalendarDays className="h-6 w-6" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-lg">FitHouse Gym</h2>
                        <p className="text-blue-100 text-sm">Sistema de Gestión</p>
                      </div>
                    </div>
                  </div>

                  {/* Navigation */}
                  <nav className="flex-1 p-4">
                    <div className="space-y-2">
                      <Link
                        href="/"
                        className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="p-1.5 bg-blue-100 rounded-md">
                          <CalendarDays className="h-4 w-4 text-blue-600" />
                        </div>
                        Dashboard
                      </Link>
                      <Link
                        href="/members"
                        className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="p-1.5 bg-green-100 rounded-md">
                          <User className="h-4 w-4 text-green-600" />
                        </div>
                        Socios
                      </Link>
                      <Link
                        href="/reports"
                        className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="p-1.5 bg-purple-100 rounded-md">
                          <ClipboardList className="h-4 w-4 text-purple-600" />
                        </div>
                        Reportes
                      </Link>
                      <Link
                        href="/audit"
                        className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="p-1.5 bg-orange-100 rounded-md">
                          <Shield className="h-4 w-4 text-orange-600" />
                        </div>
                        Auditoría
                      </Link>
                    </div>
                  </nav>

                  {/* User section at bottom */}
                  <div className="p-4 border-t">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src="/placeholder.svg" alt="Admin" />
                        <AvatarFallback className="bg-blue-600 text-white">A</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">Admin</p>
                        <p className="text-xs text-muted-foreground truncate">admin@fithouse.com</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={handleLogout}
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/10 rounded-md">
                <CalendarDays className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-white font-semibold text-base leading-tight">FitHouse</h1>
                <p className="text-blue-100 text-xs leading-tight">Gym</p>
              </div>
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2">
            {/* Search Button */}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 h-9 w-9"
              onClick={() => setIsSearching(!isSearching)}
            >
              <Search className="h-4 w-4" />
            </Button>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-9 w-9 relative">
                  <Bell className="h-4 w-4" />
                  <Badge className="absolute -right-1 -top-1 h-4 w-4 rounded-full p-0 text-xs bg-red-500 border-0">
                    3
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notificaciones
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-64 overflow-y-auto">
                  <DropdownMenuItem className="p-3">
                    <div className="flex flex-col gap-1 w-full">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                        <div className="text-sm font-medium">5 membresías por vencer</div>
                      </div>
                      <div className="text-xs text-muted-foreground ml-4">Hace 5 minutos</div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="p-3">
                    <div className="flex flex-col gap-1 w-full">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
                        <div className="text-sm font-medium">3 pagos pendientes</div>
                      </div>
                      <div className="text-xs text-muted-foreground ml-4">Hace 15 minutos</div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="p-3">
                    <div className="flex flex-col gap-1 w-full">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                        <div className="text-sm font-medium">Nuevo socio registrado</div>
                      </div>
                      <div className="text-xs text-muted-foreground ml-4">Hace 3 horas</div>
                    </div>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-white hover:bg-white/10 h-9 px-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src="/placeholder.svg" alt="Admin" />
                    <AvatarFallback className="bg-white text-blue-600 text-xs">A</AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/placeholder.svg" alt="Admin" />
                      <AvatarFallback className="bg-blue-600 text-white">A</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">Admin</p>
                      <p className="text-xs text-muted-foreground">admin@fithouse.com</p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Actividad
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Shield className="mr-2 h-4 w-4" />
                  Seguridad
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {isSearching && (
          <div className="md:hidden border-t bg-background p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9 pr-4 h-10"
                placeholder="Buscar socios..."
                autoFocus
                onBlur={() => setIsSearching(false)}
              />
            </div>
          </div>
        )}
      </header>
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  )
}
