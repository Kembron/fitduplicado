"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"

interface User {
  name: string
  role?: string
}

interface MobileHeaderProps {
  user: User
}

export default function MobileHeader({ user }: MobileHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Ensure component is mounted before using portal
  useEffect(() => {
    setMounted(true)
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isMenuOpen])

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  // Get button position for menu positioning
  const getButtonPosition = () => {
    if (!buttonRef.current) return { top: 0, right: 0 }
    const rect = buttonRef.current.getBoundingClientRect()
    return {
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    }
  }

  const MenuPortal = () => {
    if (!mounted || !isMenuOpen) return null

    const position = getButtonPosition()

    return createPortal(
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm"
          style={{ zIndex: 999998 }}
          onClick={() => setIsMenuOpen(false)}
        />

        {/* Menu */}
        <div
          ref={menuRef}
          className="fixed w-64 bg-slate-800/95 backdrop-blur-xl border border-slate-600/50 rounded-xl shadow-2xl animate-in slide-in-from-top-2 duration-200"
          style={{
            top: `${position.top}px`,
            right: `${position.right}px`,
            zIndex: 999999,
          }}
        >
          <div className="p-4 border-b border-slate-600/30">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-lg">{user.name?.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <p className="text-white font-semibold">{user.name}</p>
                <p className="text-slate-400 text-sm">
                  {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Administrador"}
                </p>
              </div>
            </div>
          </div>

          <div className="p-2">
            <form action="/api/auth/logout" method="POST" className="w-full">
              <button className="w-full text-left px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200 flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span>Cerrar Sesión</span>
              </button>
            </form>
          </div>
        </div>
      </>,
      document.body,
    )
  }

  return (
    <>
      {/* Top row with logo and user info */}
      <div className="flex justify-between items-center py-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 flex items-center justify-center">
            <img src="/fithouse-logo.jpg" alt="FitHouse Gym Logo" className="h-full w-full object-contain rounded-lg" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 via-sky-400 to-cyan-300 bg-clip-text text-transparent">
              FitHouse
            </h1>
            <p className="text-xs text-slate-400 leading-tight">Gestión de Socios</p>
          </div>
        </div>

        {/* User menu button */}
        <div className="relative">
          <button
            ref={buttonRef}
            className="flex items-center space-x-2 bg-slate-700/50 hover:bg-slate-600/50 transition-all duration-200 rounded-xl px-3 py-2 border border-slate-600/30"
            onClick={toggleMenu}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-semibold">{user.name?.charAt(0).toUpperCase()}</span>
            </div>
            <svg
              className={`w-4 h-4 text-slate-300 transition-transform duration-200 ${isMenuOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Welcome message bar */}
      <div className="bg-gradient-to-r from-blue-500/10 via-sky-500/10 to-cyan-400/10 border border-blue-500/20 rounded-lg px-4 py-2 mb-4">
        <p className="text-center text-sm">
          <span className="text-slate-300">¡Bienvenido de vuelta, </span>
          <span className="text-white font-semibold">{user.name}!</span>
        </p>
      </div>

      {/* Menu Portal */}
      <MenuPortal />
    </>
  )
}
