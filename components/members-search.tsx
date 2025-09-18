"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, X } from "lucide-react"

export default function MembersSearch() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchQuery, setSearchQuery] = useState(searchParams.get("query") || "")
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()

    const params = new URLSearchParams()
    if (searchQuery) params.set("query", searchQuery)
    if (statusFilter !== "all") params.set("status", statusFilter)

    router.push(`/members?${params.toString()}`)
  }

  const clearSearch = () => {
    setSearchQuery("")
    setStatusFilter("all")
    router.push("/members")
  }

  return (
    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 mb-4">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          type="text"
          placeholder="Buscar por nombre, email o teléfono..."
          className="pl-9 bg-slate-800/50 border-slate-700"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-full sm:w-[180px] bg-slate-800/50 border-slate-700">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700">
          <SelectItem value="all">Todos los estados</SelectItem>
          <SelectItem value="active">Activos</SelectItem>
          <SelectItem value="expired">Vencidos</SelectItem>
          <SelectItem value="suspended">Suspendidos</SelectItem>
          <SelectItem value="inactive">Inactivos</SelectItem>
          <SelectItem value="cancelled">Cancelados</SelectItem>
        </SelectContent>
      </Select>

      <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
        Buscar
      </Button>

      {(searchQuery || statusFilter !== "all") && (
        <Button
          type="button"
          variant="outline"
          className="border-slate-700 text-slate-300 hover:bg-slate-700/50"
          onClick={clearSearch}
        >
          Limpiar
        </Button>
      )}
    </form>
  )
}
