/**
 * Configuración de precios de membresías
 * Este archivo centraliza la gestión de precios para el sistema
 */

// Precio base por defecto (en pesos uruguayos)
export const price = 1500

// Configuración de precios por tipo de membresía
export const MEMBERSHIP_PRICES = {
  daily: 500,
  weekly: 2500,
  monthly_basic: 8000,
  monthly_premium: 12000,
  quarterly: 20000,
  annual: 80000,
} as const

// Tipos para TypeScript
export type MembershipType = keyof typeof MEMBERSHIP_PRICES

/**
 * Obtiene el precio de una membresía por su ID o tipo
 * @param membershipId - ID de la membresía en la base de datos
 * @param membershipType - Tipo de membresía (opcional)
 * @returns Precio de la membresía
 */
export function getMembershipPrice(membershipId?: number, membershipType?: string): number {
  // Si se proporciona un tipo específico, intentar mapearlo
  if (membershipType) {
    const normalizedType = membershipType.toLowerCase().replace(/\s+/g, "_") as MembershipType
    if (normalizedType in MEMBERSHIP_PRICES) {
      return MEMBERSHIP_PRICES[normalizedType]
    }
  }

  // Mapeo por ID (esto debería venir de la base de datos idealmente)
  const priceMap: Record<number, number> = {
    1: MEMBERSHIP_PRICES.daily,
    2: MEMBERSHIP_PRICES.weekly,
    3: MEMBERSHIP_PRICES.monthly_basic,
    4: MEMBERSHIP_PRICES.monthly_premium,
    5: MEMBERSHIP_PRICES.quarterly,
    6: MEMBERSHIP_PRICES.annual,
  }

  return membershipId && priceMap[membershipId] ? priceMap[membershipId] : price
}

/**
 * Calcula el precio por día de una membresía
 * @param totalPrice - Precio total de la membresía
 * @param durationDays - Duración en días
 * @returns Precio por día
 */
export function getPricePerDay(totalPrice: number, durationDays: number): number {
  return Math.round((totalPrice / durationDays) * 100) / 100
}

/**
 * Aplica descuentos a un precio base
 * @param basePrice - Precio base
 * @param discountPercent - Porcentaje de descuento (0-100)
 * @returns Precio con descuento aplicado
 */
export function applyDiscount(basePrice: number, discountPercent: number): number {
  const discount = (basePrice * discountPercent) / 100
  return Math.round((basePrice - discount) * 100) / 100
}
