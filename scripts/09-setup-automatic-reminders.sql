-- Crear tabla para configuración de recordatorios automáticos si no existe
CREATE TABLE IF NOT EXISTS reminder_schedule (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  days_before INTEGER NOT NULL,
  time_of_day TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar configuración por defecto si no existe
INSERT INTO reminder_schedule (type, days_before, time_of_day)
SELECT 'membership_expiry', 3, '08:00:00'
WHERE NOT EXISTS (
  SELECT 1 FROM reminder_schedule WHERE type = 'membership_expiry' AND days_before = 3
);

-- Agregar configuración del sistema para recordatorios automáticos
INSERT INTO system_config (key, value, description)
SELECT 'automatic_reminders_enabled', 'true', 'Habilitar/deshabilitar recordatorios automáticos'
WHERE NOT EXISTS (
  SELECT 1 FROM system_config WHERE key = 'automatic_reminders_enabled'
);

-- Crear función para enviar recordatorios automáticamente
CREATE OR REPLACE FUNCTION send_automatic_reminders()
RETURNS INTEGER AS $$
DECLARE
  members_count INTEGER;
BEGIN
  -- Verificar si los recordatorios automáticos están habilitados
  IF (SELECT value FROM system_config WHERE key = 'automatic_reminders_enabled') = 'false' THEN
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
  
  -- La función real enviaría los emails a través de un trigger o job
  -- Aquí solo devolvemos el conteo para simular
  RETURN members_count;
END;
$$ LANGUAGE plpgsql;

-- Crear índice para mejorar rendimiento de consultas de recordatorios
CREATE INDEX IF NOT EXISTS idx_members_expiry_date ON members(expiry_date);
