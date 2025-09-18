interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: RegExp
  custom?: (value: any) => string | null
}

interface ValidationSchema {
  [key: string]: ValidationRule
}

export function validateForm<T extends Record<string, any>>(
  data: T,
  schema: ValidationSchema,
): { isValid: boolean; errors: Partial<T> } {
  const errors: Partial<T> = {}

  Object.entries(schema).forEach(([field, rules]) => {
    const value = data[field]

    if (rules.required && (!value || (typeof value === "string" && !value.trim()))) {
      errors[field as keyof T] = `${field} es obligatorio` as T[keyof T]
      return
    }

    if (value && typeof value === "string") {
      if (rules.minLength && value.length < rules.minLength) {
        errors[field as keyof T] = `${field} debe tener al menos ${rules.minLength} caracteres` as T[keyof T]
        return
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        errors[field as keyof T] = `${field} no puede tener más de ${rules.maxLength} caracteres` as T[keyof T]
        return
      }

      if (rules.pattern && !rules.pattern.test(value)) {
        errors[field as keyof T] = `${field} tiene un formato inválido` as T[keyof T]
        return
      }
    }

    if (value && typeof value === "number") {
      if (rules.min !== undefined && value < rules.min) {
        errors[field as keyof T] = `${field} debe ser mayor a ${rules.min}` as T[keyof T]
        return
      }

      if (rules.max !== undefined && value > rules.max) {
        errors[field as keyof T] = `${field} no puede ser mayor a ${rules.max}` as T[keyof T]
        return
      }
    }

    if (rules.custom) {
      const customError = rules.custom(value)
      if (customError) {
        errors[field as keyof T] = customError as T[keyof T]
        return
      }
    }
  })

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

// Esquemas de validación predefinidos
export const membershipValidationSchema: ValidationSchema = {
  name: {
    required: true,
    minLength: 3,
    maxLength: 100,
  },
  price: {
    required: true,
    min: 1,
    max: 1000000,
  },
  duration_days: {
    required: true,
    min: 1,
    max: 3650,
  },
}

export const userValidationSchema: ValidationSchema = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  password: {
    minLength: 6,
    maxLength: 100,
  },
}

export const systemConfigValidationSchema: ValidationSchema = {
  grace_period_days: {
    required: true,
    min: 0,
    max: 30,
  },
  auto_suspend_days: {
    required: true,
    min: 1,
    max: 365,
  },
  auto_inactive_days: {
    required: true,
    min: 1,
    max: 365,
  },
}
