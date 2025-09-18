-- Crear soporte para templates de bienvenida
-- Este script asegura que tengamos las tablas necesarias

-- 1. Crear tabla system_config_extended si no existe
CREATE TABLE IF NOT EXISTS system_config_extended (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Agregar columna welcome_template a system_config si no existe
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'system_config' 
        AND column_name = 'welcome_template'
    ) THEN
        ALTER TABLE system_config ADD COLUMN welcome_template TEXT;
    END IF;
END $$;

-- 3. Asegurar que existe al menos un registro en system_config
INSERT INTO system_config (
    grace_period_days,
    auto_suspend_days,
    auto_inactive_days,
    enable_notifications,
    enable_auto_reports,
    allow_partial_payments,
    require_member_photo,
    theme_mode
) VALUES (
    7, 45, 90, true, false, false, true, 'system'
) ON CONFLICT (id) DO NOTHING;

-- 4. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_system_config_extended_key ON system_config_extended(config_key);

-- Verificar que todo esté creado correctamente
SELECT 'system_config_extended table created' as status
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_config_extended');

SELECT 'welcome_template column added' as status
WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_config' AND column_name = 'welcome_template');
