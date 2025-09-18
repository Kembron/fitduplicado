"use client"

import { useState } from "react"
import { toast } from "sonner"

interface Membership {
  id: number
  name: string
  description: string
  price: number
  duration_days: number
  is_active: boolean
  members_count?: number
}

interface MembershipFormData {
  name: string
  description: string
  price: number
  duration_days: number
}

export function useMemberships() {
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all")
  const [sortBy, setSortBy] = useState<"name" | "price" | "duration" | "created">("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  const fetchMemberships = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/memberships")
      if (res.ok) {
        const data = await res.json()
        setMemberships(data)
        toast.success(`✅ ${data.length} membresías cargadas`)
      } else {
        const errorData = await res.json()
        toast.error("❌ Error al cargar las membresías", {
          description: errorData.error,
        })
      }
    } catch (error) {
      console.error("Error fetching memberships:", error)
      toast.error("🚨 Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  const createMembership = async (membershipData: MembershipFormData) => {
    try {
      setLoading(true)
      const res = await fetch("/api/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(membershipData),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success("🎉 Membresía creada", {
          description: `"${membershipData.name}" está lista para usar`,
        })
        fetchMemberships()
        return true
      } else {
        toast.error("❌ Error al crear membresía", {
          description: data.error,
        })
        return false
      }
    } catch (error) {
      console.error("Error creating membership:", error)
      toast.error("🚨 Error de conexión")
      return false
    } finally {
      setLoading(false)
    }
  }

  const updateMembership = async (membership: Membership) => {
    try {
      const res = await fetch(`/api/memberships/${membership.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(membership),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success("💾 Cambios guardados", {
          description: `"${membership.name}" actualizada correctamente`,
        })
        setMemberships((prev) => prev.map((m) => (m.id === membership.id ? data : m)))
        return true
      } else {
        toast.error("❌ Error al actualizar", {
          description: data.error,
        })
        return false
      }
    } catch (error) {
      console.error("Error updating membership:", error)
      toast.error("🚨 Error de conexión")
      return false
    }
  }

  const deleteMembership = async (id: number, name: string) => {
    try {
      const res = await fetch(`/api/memberships/${id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        toast.success("🗑️ Membresía eliminada", {
          description: `"${name}" ha sido removida`,
        })
        setMemberships((prev) => prev.filter((m) => m.id !== id))
        return true
      } else {
        const data = await res.json()
        toast.error("❌ No se pudo eliminar", {
          description: data.error,
        })
        return false
      }
    } catch (error) {
      console.error("Error deleting membership:", error)
      toast.error("🚨 Error al eliminar")
      return false
    }
  }

  const toggleMembershipStatus = async (membership: Membership) => {
    const newStatus = !membership.is_active
    setMemberships((prev) => prev.map((m) => (m.id === membership.id ? { ...m, is_active: newStatus } : m)))

    const success = await updateMembership({ ...membership, is_active: newStatus })
    if (!success) {
      // Revert on error
      setMemberships((prev) => prev.map((m) => (m.id === membership.id ? membership : m)))
    }
  }

  // Filtered and sorted memberships
  const filteredMemberships = memberships
    .filter((membership) => {
      const matchesSearch =
        membership.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        membership.description.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFilter =
        filterStatus === "all" ||
        (filterStatus === "active" && membership.is_active) ||
        (filterStatus === "inactive" && !membership.is_active)
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      let aValue: any, bValue: any
      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case "price":
          aValue = a.price
          bValue = b.price
          break
        case "duration":
          aValue = a.duration_days
          bValue = b.duration_days
          break
        case "created":
          aValue = a.id
          bValue = b.id
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1
      return 0
    })

  return {
    memberships: filteredMemberships,
    loading,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    fetchMemberships,
    createMembership,
    updateMembership,
    deleteMembership,
    toggleMembershipStatus,
  }
}
