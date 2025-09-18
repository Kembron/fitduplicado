-- Script para debuggear y verificar las tablas de welcome template

-- 1. Verificar si existe la tabla system_config
SELECT 'system_config table exists' as status
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_config');

-- 2. Verificar si existe la columna welcome_template
SELECT 'welcome_template column exists' as status
WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_config' AND column_name = 'welcome_template');

-- 3. Verificar si existe la tabla system_config_extended
SELECT 'system_config_extended table exists' as status
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_config_extended');

-- 4. Ver el contenido actual de system_config
SELECT id, welcome_template, 
       CASE 
         WHEN welcome_template IS NULL THEN 'NULL'
         WHEN welcome_template = '' THEN 'EMPTY'
         ELSE 'HAS_DATA'
       END as template_status
FROM system_config;

-- 5. Ver el contenido actual de system_config_extended (si existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_config_extended') THEN
        RAISE NOTICE 'system_config_extended contents:';
        PERFORM * FROM system_config_extended WHERE config_key = 'welcome_email_template';
    ELSE
        RAISE NOTICE 'system_config_extended table does not exist';
    END IF;
END $$;

-- 6. Limpiar datos de prueba si existen
DELETE FROM system_config WHERE welcome_template LIKE '%4444444444444%';

-- 7. Crear estructura completa si no existe
DO $$ 
BEGIN 
    -- Crear columna welcome_template si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'system_config' 
        AND column_name = 'welcome_template'
    ) THEN
        ALTER TABLE system_config ADD COLUMN welcome_template TEXT;
        RAISE NOTICE 'Added welcome_template column to system_config';
    END IF;
    
    -- Asegurar que existe al menos un registro en system_config
    INSERT INTO system_config (
        grace_period_days, auto_suspend_days, auto_inactive_days,
        enable_notifications, enable_auto_reports, allow_partial_payments,
        require_member_photo, theme_mode
    ) VALUES (
        7, 45, 90, true, false, false, true, 'system'
    ) ON CONFLICT (id) DO NOTHING;
    
    -- Crear tabla system_config_extended si no existe
    CREATE TABLE IF NOT EXISTS system_config_extended (
        id SERIAL PRIMARY KEY,
        config_key VARCHAR(255) UNIQUE NOT NULL,
        config_value TEXT NOT NULL,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    RAISE NOTICE 'Database structure verified and created if needed';
END $$;

-- 8. Verificar estado final
SELECT 'Final verification:' as status;
SELECT COUNT(*) as system_config_records FROM system_config;
SELECT COUNT(*) as system_config_extended_records FROM system_config_extended WHERE config_key = 'welcome_email_template';
