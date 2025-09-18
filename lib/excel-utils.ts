// Utilidades para generar archivos Excel en el frontend
export function generateExcelFile(data: any[], filename: string) {
  if (!data || data.length === 0) {
    throw new Error("No hay datos para exportar")
  }

  // Crear contenido CSV (compatible con Excel)
  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header]
          // Escapar comillas y envolver en comillas si contiene comas
          if (typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        })
        .join(","),
    ),
  ].join("\n")

  // Crear y descargar archivo
  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" }) // \ufeff es BOM para UTF-8
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
  }).format(amount)
}

export function formatDate(date: string): string {
  if (!date) return ""
  return new Date(date).toLocaleDateString("es-UY")
}

export function formatDateTime(date: string): string {
  if (!date) return ""
  return new Date(date).toLocaleString("es-UY")
}

// Función para generar estadísticas de exportación
export function generateExportStats(data: any[], type: "members" | "payments") {
  if (type === "members") {
    const statusCount = data.reduce(
      (acc, member) => {
        acc[member.Estado] = (acc[member.Estado] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const membershipCount = data.reduce(
      (acc, member) => {
        const membership = member.Membresía || "Sin membresía"
        acc[membership] = (acc[membership] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return {
      total: data.length,
      by_status: statusCount,
      by_membership: membershipCount,
    }
  }

  if (type === "payments") {
    const totalAmount = data.reduce((sum, payment) => sum + Number(payment.Monto || 0), 0)
    const methodCount = data.reduce(
      (acc, payment) => {
        acc[payment["Método Pago"]] = (acc[payment["Método Pago"]] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const monthlyTotals = data.reduce(
      (acc, payment) => {
        const month = new Date(payment["Fecha Pago"]).toISOString().slice(0, 7) // YYYY-MM
        acc[month] = (acc[month] || 0) + Number(payment.Monto || 0)
        return acc
      },
      {} as Record<string, number>,
    )

    return {
      total: data.length,
      total_amount: totalAmount,
      by_method: methodCount,
      by_month: monthlyTotals,
    }
  }

  return {}
}
