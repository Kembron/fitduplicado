-- Crear tabla de configuración del sistema
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    grace_period_days INTEGER DEFAULT 7 CHECK (grace_period_days >= 0 AND grace_period_days <= 30),
    auto_suspend_days INTEGER DEFAULT 45 CHECK (auto_suspend_days >= 1 AND auto_suspend_days <= 365),
    auto_inactive_days INTEGER DEFAULT 90 CHECK (auto_inactive_days >= 1 AND auto_inactive_days <= 365),
    enable_notifications BOOLEAN DEFAULT true,
    enable_auto_reports BOOLEAN DEFAULT false,
    allow_partial_payments BOOLEAN DEFAULT false,
    require_member_photo BOOLEAN DEFAULT true,
    theme_mode VARCHAR(10) DEFAULT 'system' CHECK (theme_mode IN ('light', 'dark', 'system')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insertar configuración por defecto si no existe
INSERT INTO system_config (
    grace_period_days,
    auto_suspend_days,
    auto_inactive_days,
    enable_notifications,
    enable_auto_reports,
    allow_partial_payments,
    require_member_photo,
    theme_mode
) 
SELECT 7, 45, 90, true, false, false, true, 'system'
WHERE NOT EXISTS (SELECT 1 FROM system_config);

-- Crear índice para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_system_config_updated_at ON system_config(updated_at DESC);
