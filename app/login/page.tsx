import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import LoginForm from "@/components/login-form"

// Force dynamic rendering to avoid static generation issues with cookies
export const dynamic = "force-dynamic"

export default async function LoginPage() {
  const session = await getSession()

  if (session) {
    redirect("/")
  }

  return (
    // Contenedor principal volviendo al centrado original
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      {/* Efectos de fondo (blobs animados) */}
      <div className="absolute inset-0 overflow-hidden -z-10">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-sky-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
      </div>

      {/* Card principal centrado */}
      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <div className="w-20 h-20 mx-auto mb-6 shadow-2xl rounded-2xl flex items-center justify-center">
              <img
                src="/fithouse-logo.jpg"
                alt="FitHouse Gym Logo"
                className="h-full w-full object-contain rounded-2xl"
              />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-sky-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            FitHouse Gym
          </h1>
          <p className="text-slate-400 text-lg">Sistema de Gestión de Socios</p>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 mx-auto mt-4 rounded-full"></div>
        </div>

        <LoginForm />

        {/* Pie de página DENTRO del card principal */}
        <div className="text-center mt-12">
          {" "}
          {/* Aumenté el margen superior para separarlo del formulario */}
          <p className="text-xs text-slate-400 mb-1">Todos los derechos reservados &copy; 2025 FitHouse.</p>
          <p className="text-xs text-slate-400">
            Creado por{" "}
            <a
              href="http://www.kembron.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-sky-400 hover:text-sky-300 underline"
            >
              Kembron
            </a>
          </p>
        </div>

        {/* Efectos de "ping" decorativos - como capa de fondo dentro del card */}
        <div className="absolute -z-10 top-0 left-0 w-full h-full pointer-events-none">
          {" "}
          {/* pointer-events-none para que no interfiera */}
          <div className="absolute top-10 left-10 w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
          <div className="absolute top-20 right-20 w-1 h-1 bg-sky-400 rounded-full animate-ping"></div>
          <div className="absolute bottom-20 left-20 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping"></div>
        </div>
      </div>
    </div>
  )
}
