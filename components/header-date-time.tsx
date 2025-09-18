"use client"

import { useState, useEffect } from "react"
import { Calendar, Clock } from "lucide-react"

export function HeaderDateTime() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null)

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date())
    }

    // Actualizar inmediatamente
    updateTime()

    // Actualizar cada segundo
    const interval = setInterval(updateTime, 1000)

    return () => clearInterval(interval)
  }, [])

  if (!currentTime) {
    return (
      <div className="hidden lg:flex items-center space-x-4 text-white/80">
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4" />
          <span className="text-sm">Cargando...</span>
        </div>
      </div>
    )
  }

  // Formatear fecha para Uruguay
  const uruguayDate = new Intl.DateTimeFormat("es-UY", {
    timeZone: "America/Montevideo",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(currentTime)

  const uruguayTime = new Intl.DateTimeFormat("es-UY", {
    timeZone: "America/Montevideo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(currentTime)

  // Capitalizar primera letra
  const formattedDate = uruguayDate.charAt(0).toUpperCase() + uruguayDate.slice(1)

  return (
    <div className="hidden lg:flex items-center space-x-6 text-white/90">
      <div className="flex items-center space-x-2">
        <Calendar className="h-4 w-4 text-blue-300" />
        <span className="text-sm font-medium">{formattedDate}</span>
      </div>
      <div className="w-px h-6 bg-white/20"></div>
      <div className="flex items-center space-x-2">
        <Clock className="h-4 w-4 text-green-300" />
        <span className="text-sm font-mono font-semibold">{uruguayTime}</span>
      </div>
    </div>
  )
}
