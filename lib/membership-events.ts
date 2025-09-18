// Sistema de eventos para sincronizar membresías entre componentes
type MembershipEventType = "created" | "updated" | "deleted" | "status_changed"

interface MembershipEvent {
  type: MembershipEventType
  membershipId?: number
  membership?: any
  timestamp: number
}

type MembershipEventListener = (event: MembershipEvent) => void

class MembershipEventManager {
  private listeners: MembershipEventListener[] = []

  // Suscribirse a eventos de membresías
  subscribe(listener: MembershipEventListener): () => void {
    this.listeners.push(listener)

    // Retornar función para desuscribirse
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  // Emitir evento de membresía
  emit(type: MembershipEventType, data?: { membershipId?: number; membership?: any }) {
    const event: MembershipEvent = {
      type,
      membershipId: data?.membershipId,
      membership: data?.membership,
      timestamp: Date.now(),
    }

    console.log("MembershipEvent emitted:", event)

    // Notificar a todos los listeners
    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (error) {
        console.error("Error in membership event listener:", error)
      }
    })
  }

  // Métodos de conveniencia
  membershipCreated(membership: any) {
    this.emit("created", { membership })
  }

  membershipUpdated(membership: any) {
    this.emit("updated", { membershipId: membership.id, membership })
  }

  membershipDeleted(membershipId: number) {
    this.emit("deleted", { membershipId })
  }

  membershipStatusChanged(membership: any) {
    this.emit("status_changed", { membershipId: membership.id, membership })
  }
}

// Instancia singleton
export const membershipEvents = new MembershipEventManager()

// Hook personalizado para React
export function useMembershipEvents() {
  return membershipEvents
}
