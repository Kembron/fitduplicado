import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import AutoReminderChecker from "@/components/auto-reminder-checker"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "FitHouse Gym | Gestión",
  description: "Sistema completo de gestión para gimnasios",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FitHouse Gym",
  },
  generator: "Kembron",
  // Se agregó o modificó esta sección para incluir el favicon.
  icons: {
    icon: "/logo.png", // Apunta directamente a 'logo.png' en tu carpeta 'public'.
    shortcut: "/logo.png", // Puedes usar el mismo logo para accesos directos.
    apple: "/icon-192x192.png", // Mantiene la configuración existente para iOS.
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Las siguientes meta tags y links son comúnmente manejadas por la propiedad 'metadata' en Next.js 13+
            y se mantienen aquí solo si hay una razón específica para sobrescribir o si son adicionales.
            No es necesario que las elimines, pero ten en cuenta que 'metadata' es la forma preferida.
        */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="FitHouse Gym" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        {/* <link rel="apple-touch-icon" href="/icon-192x192.png" /> // Esto ya está cubierto por icons.apple en metadata */}
        {/* <link rel="manifest" href="/manifest.json" /> // Esto ya está cubierto por la propiedad manifest en metadata */}

        {/* El script del Service Worker se mantiene aquí ya que no es manejado directamente por `metadata` */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {/* Sistema de verificación automática de recordatorios cada 3 horas */}
          <AutoReminderChecker />

          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
