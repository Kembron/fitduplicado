// Configuración principal del sistema FitHouse Gym
export const config = {
  // ... (todo lo demás de tu configuración)
  app: {
    name: "FitHouse Gym",
    version: "1.0.0",
    description: "Sistema de gestión integral para gimnasios",
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  },

  // Configuración de base de datos
  database: {
    maxConnections: 20,
    connectionTimeout: 30000,
    queryTimeout: 60000,
  },

  // Configuración de autenticación
  auth: {
    jwtSecret: process.env.JWT_SECRET || "fallback-secret-key",
    jwtExpiresIn: "7d",
    cookieName: "gym-auth-token",
    cookieDomain: process.env.COOKIE_DOMAIN || "localhost",
    sessionTimeout: 7 * 24 * 60 * 60 * 1000, // 7 días en ms
  },

  // Configuración de emails
  email: {
    from: process.env.EMAIL_USER || "noreply@fithouse.gym",
    replyTo: process.env.EMAIL_USER || "info@fithouse.gym",
    maxRetries: 3,
    retryDelay: 2000,
    batchSize: 10,
    rateLimitDelay: 1000,
  },

  // Configuración de membresías
  memberships: {
    gracePeriodDays: 3,
    suspensionDays: 7,
    autoSuspendEnabled: true,
    reminderDays: [7, 3, 1],
    defaultDuration: 30, // días
  },

  // Configuración de pagos
  payments: {
    methods: ["efectivo", "tarjeta", "transferencia", "mercadopago"],
    defaultCurrency: "UYU",
    taxRate: 0.22, // IVA Uruguay
  },

  // Configuración de auditoría
  audit: {
    enabled: true,
    retentionDays: 365,
    logLevel: "info",
    sensitiveFields: ["password", "token", "secret"],
  },

  // Configuración de reportes
  reports: {
    maxExportRows: 10000,
    defaultDateRange: 30, // días
    cacheTimeout: 300000, // 5 minutos
  },

  // Configuración de la interfaz
  ui: {
    itemsPerPage: 20,
    maxSearchResults: 100,
    autoRefreshInterval: 30000, // 30 segundos
    theme: "light",
  },

  // Configuración de notificaciones
  notifications: {
    enabled: true,
    channels: ["email", "system"],
    defaultTemplate: "default",
  },

  // Configuración de backup
  backup: {
    enabled: true,
    schedule: "0 2 * * *", // Diario a las 2 AM
    retentionDays: 30,
    compression: true,
  },
}

// Tipos de membresía disponibles
export const membershipTypes = [
  {
    id: 1,
    name: "Básico",
    description: "Acceso básico al gimnasio",
    price: 1500,
    duration: 30,
    features: ["Acceso a equipos", "Vestuarios"],
  },
  {
    id: 2,
    name: "Estudiante",
    description: "Descuento especial para estudiantes",
    price: 1200,
    duration: 30,
    features: ["Acceso a equipos", "Vestuarios", "Descuento estudiantil"],
  },
  {
    id: 3,
    name: "Premium",
    description: "Acceso completo con clases grupales",
    price: 2500,
    duration: 30,
    features: ["Acceso completo", "Clases grupales", "Asesoramiento"],
  },
  {
    id: 4,
    name: "VIP",
    description: "Acceso premium con entrenador personal",
    price: 4000,
    duration: 30,
    features: ["Acceso VIP", "Entrenador personal", "Nutricionista"],
  },
  {
    id: 5,
    name: "Anual",
    description: "Membresía anual con descuento",
    price: 15000,
    duration: 365,
    features: ["Acceso completo", "Descuento anual", "Beneficios extras"],
  },
]

// Estados de socios
export const memberStatuses = [
  { value: "active", label: "Activo", color: "green" },
  { value: "expired", label: "Vencido", color: "red" },
  { value: "suspended", label: "Suspendido", color: "yellow" },
  { value: "inactive", label: "Inactivo", color: "gray" },
]

// Métodos de pago
export const paymentMethods = [
  { value: "efectivo", label: "Efectivo", icon: "💵" },
  { value: "tarjeta", label: "Tarjeta", icon: "💳" },
  { value: "transferencia", label: "Transferencia", icon: "🏦" },
  { value: "mercadopago", label: "MercadoPago", icon: "💰" },
]

// Templates de email predefinidos
export const emailTemplates = {
  welcome: {
    subject: "¡Bienvenido a FitHouse Gym!",
    // Aquí es donde haremos el cambio
    template: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">¡Bienvenido a FitHouse Gym!</h2>
        <p>Hola <strong>{{memberName}}</strong>,</p>
        <p>¡Gracias por unirte a nuestra familia fitness! Estamos emocionados de tenerte como parte de FitHouse Gym.</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Detalles de tu membresía:</h3>
          <ul style="list-style-type: none; padding: 0;">
            <li><strong>Tipo de membresía:</strong> {{membershipName}}</li>
            <li><strong>Precio:</strong> {{membershipPrice}}</li> <li><strong>Fecha de vencimiento:</strong> {{expiryDate}}</li>
          </ul>
        </div>
        
        <p>Tu membresía está activa y lista para usar. ¡Esperamos verte pronto en el gimnasio!</p>
        
        <p style="margin-top: 30px;">
          Saludos,<br>
          <strong>El equipo de FitHouse Gym</strong>
        </p>
      </div>
    `,
  },
  
  reminder: {
    subject: "Recordatorio: Tu membresía está por vencer",
    template: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">Recordatorio de Vencimiento - FitHouse Gym</h2>
        <p>Hola <strong>{{memberName}}</strong>,</p>
        <p>Te recordamos que tu membresía está próxima a vencer en {{daysUntilExpiry}} días.</p>
        
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h3 style="color: #856404; margin-top: 0;">Detalles de tu membresía:</h3>
          <ul style="list-style-type: none; padding: 0;">
            <li><strong>Tipo de membresía:</strong> {{membershipName}}</li>
            <li><strong>Fecha de vencimiento:</strong> {{expiryDate}}</li>
            <li><strong>Días restantes:</strong> {{daysUntilExpiry}}</li>
          </ul>
        </div>
        
        <p>Para renovar tu membresía, acércate al gimnasio o contáctanos.</p>
        
        <p style="margin-top: 30px;">
          Saludos,<br>
          <strong>El equipo de FitHouse Gym</strong>
        </p>
      </div>
    `,
  },
  
  suspension: {
    subject: "Membresía Suspendida - FitHouse Gym",
    template: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">Membresía Suspendida - FitHouse Gym</h2>
        <p>Hola <strong>{{memberName}}</strong>,</p>
        <p>Lamentamos informarte que tu membresía ha sido suspendida debido a falta de pago.</p>
        
        <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
          <h3 style="color: #721c24; margin-top: 0;">Estado de tu membresía:</h3>
          <ul style="list-style-type: none; padding: 0;">
            <li><strong>Estado:</strong> Suspendida</li>
            <li><strong>Fecha de vencimiento:</strong> {{expiryDate}}</li>
            <li><strong>Tipo de membresía:</strong> {{membershipName}}</li>
          </ul>
        </div>
        
        <p>Para reactivar tu membresía, realiza el pago correspondiente y contáctanos.</p>
        
        <p style="margin-top: 30px;">
          Saludos,<br>
          <strong>El equipo de FitHouse Gym</strong>
        </p>
      </div>
    `,
  },
}

// Configuración de roles de usuario
export const userRoles = [
  {
    value: "admin",
    label: "Administrador",
    permissions: ["all"],
    description: "Acceso completo al sistema",
  },
  {
    value: "manager",
    label: "Gerente",
    permissions: ["members", "payments", "reports"],
    description: "Gestión de socios y reportes",
  },
  {
    value: "staff",
    label: "Personal",
    permissions: ["members", "attendance"],
    description: "Gestión básica de socios",
  },
]

// Configuración de validación
export const validation = {
  member: {
    name: {
      minLength: 2,
      maxLength: 100,
      required: true,
    },
    email: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      required: false,
    },
    phone: {
      pattern: /^[0-9+\-\s()]+$/,
      minLength: 8,
      maxLength: 20,
      required: false,
    },
    document: {
      pattern: /^[0-9.-]+$/,
      minLength: 7,
      maxLength: 15,
      required: false,
    },
  },
  payment: {
    amount: {
      min: 1,
      max: 999999,
      required: true,
    },
    method: {
      options: paymentMethods.map((m) => m.value),
      required: true,
    },
  },
}

// Configuración de paginación
export const pagination = {
  defaultPageSize: 20,
  pageSizeOptions: [10, 20, 50, 100],
  maxPageSize: 100,
}

// Configuración de fechas
export const dateConfig = {
  format: "DD/MM/YYYY",
  locale: "es-UY",
  timezone: "America/Montevideo",
  firstDayOfWeek: 1, // Lunes
}

// Configuración de moneda
export const currency = {
  code: "UYU",
  symbol: "$",
  decimals: 0,
  thousandsSeparator: ".",
  decimalSeparator: ",",
}

// Exportar precio por defecto para compatibilidad
export const price = membershipTypes[0].price

// Función para obtener configuración por clave
export function getConfig(key: string): any {
  const keys = key.split(".")
  let value: any = config

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = value[k]
    } else {
      return undefined
    }
  }

  return value
}

// Función para validar configuración
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Validar variables de entorno críticas
  if (!process.env.JWT_SECRET) {
    errors.push("JWT_SECRET no está configurado")
  }

  if (!process.env.DATABASE_URL) {
    errors.push("DATABASE_URL no está configurado")
  }

  // Validar configuración de email
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    errors.push("Configuración de email incompleta (EMAIL_USER, EMAIL_APP_PASSWORD)")
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// Configuración por defecto del sistema
export const defaultSystemConfig = {
  gym_name: "FitHouse Gym",
  grace_period_days: 3,
  suspension_days: 7,
  auto_suspend_enabled: true,
  reminder_days_before: 7,
  welcome_email_enabled: true,
  reminder_email_enabled: true,
  backup_enabled: true,
  audit_enabled: true,
}

// Exportar todo como default también
export default {
  config,
  membershipTypes,
  memberStatuses,
  emailTemplates, // <--- No olvides este
  paymentMethods,
  userRoles,
  validation,
  pagination,
  dateConfig,
  currency,
  price,
  getConfig,
  validateConfig,
  defaultSystemConfig,
}
