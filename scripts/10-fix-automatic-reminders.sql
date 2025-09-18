-- Primero verificar la estructura de system_config
DO $$
BEGIN
    -- Verificar si la tabla system_config existe y tiene las columnas correctas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'system_config' AND column_name = 'config_key'
    ) THEN
        -- Si no existe la columna config_key, crearla
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_config') THEN
            ALTER TABLE system_config ADD COLUMN IF NOT EXISTS config_key VARCHAR(255);
            ALTER TABLE system_config ADD COLUMN IF NOT EXISTS config_value TEXT;
            ALTER TABLE system_config ADD COLUMN IF NOT EXISTS description TEXT;
        ELSE
            -- Crear la tabla si no existe
            CREATE TABLE system_config (
                id SERIAL PRIMARY KEY,
                config_key VARCHAR(255) UNIQUE NOT NULL,
                config_value TEXT,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        END IF;
    END IF;
END $$;

-- Crear tabla para configuración de recordatorios automáticos
CREATE TABLE IF NOT EXISTS reminder_schedule (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  days_before INTEGER NOT NULL,
  time_of_day TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar configuración por defecto para recordatorios
INSERT INTO reminder_schedule (type, days_before, time_of_day)
SELECT 'membership_expiry', 3, '08:00:00'
WHERE NOT EXISTS (
  SELECT 1 FROM reminder_schedule WHERE type = 'membership_expiry' AND days_before = 3
);

-- Insertar configuración del sistema usando la columna correcta
INSERT INTO system_config (config_key, config_value, description)
SELECT 'automatic_reminders_enabled', 'true', 'Habilitar/deshabilitar recordatorios automáticos'
WHERE NOT EXISTS (
  SELECT 1 FROM system_config WHERE config_key = 'automatic_reminders_enabled'
);

INSERT INTO system_config (config_key, config_value, description)
SELECT 'reminder_time', '08:00', 'Hora de envío de recordatorios (formato HH:MM)'
WHERE NOT EXISTS (
  SELECT 1 FROM system_config WHERE config_key = 'reminder_time'
);

INSERT INTO system_config (config_key, config_value, description)
SELECT 'reminder_days_before', '3', 'Días de anticipación para recordatorios'
WHERE NOT EXISTS (
  SELECT 1 FROM system_config WHERE config_key = 'reminder_days_before'
);

-- Crear función para enviar recordatorios automáticamente
CREATE OR REPLACE FUNCTION send_automatic_reminders()
RETURNS INTEGER AS $$
DECLARE
  members_count INTEGER;
  reminder_enabled TEXT;
BEGIN
  -- Verificar si los recordatorios automáticos están habilitados
  SELECT config_value INTO reminder_enabled 
  FROM system_config 
  WHERE config_key = 'automatic_reminders_enabled';
  
  IF reminder_enabled IS NULL OR reminder_enabled = 'false' THEN
    RETURN 0;
  END IF;
  
  -- Contar cuántos miembros tienen membresías por vencer en 3 días
  SELECT COUNT(*) INTO members_count
  FROM members m
  LEFT JOIN memberships ms ON m.membership_id = ms.id
  WHERE m.status = 'active'
  AND m.email IS NOT NULL
  AND m.email != ''
  AND m.expiry_date = CURRENT_DATE + INTERVAL '3 days';
  
  RETURN members_count;
END;
$$ LANGUAGE plpgsql;

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_members_expiry_date ON members(expiry_date);
CREATE INDEX IF NOT EXISTS idx_members_status_email ON members(status, email);
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(config_key);

-- Crear vista para estadísticas de recordatorios
CREATE OR REPLACE VIEW reminder_stats AS
SELECT 
  COUNT(*) as total_reminders_sent,
  COUNT(CASE WHEN status = 'sent' THEN 1 END) as successful_sends,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_sends,
  MAX(sent_at) as last_reminder_sent,
  DATE(MAX(sent_at)) as last_reminder_date
FROM email_logs 
WHERE email_type = 'membership_reminder';

COMMENT ON TABLE reminder_schedule IS 'Configuración de horarios para recordatorios automáticos';
COMMENT ON TABLE system_config IS 'Configuración general del sistema';
COMMENT ON VIEW reminder_stats IS 'Estadísticas de recordatorios enviados';
