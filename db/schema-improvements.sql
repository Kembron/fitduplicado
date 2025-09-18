-- Agregar nuevos estados y campos para mejor gestión
ALTER TABLE members ADD COLUMN IF NOT EXISTS last_attendance DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS inactive_since DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS auto_suspended BOOLEAN DEFAULT FALSE;

-- Actualizar el enum de status (si usas enum) o simplemente documentar los nuevos estados:
-- 'active' - Socio activo y al día
-- 'expired' - Vencido pero aún considerado cliente (hasta 30 días)
-- 'suspended' - Suspendido automáticamente (más de 30 días sin pagar)
-- 'inactive' - Inactivo por falta de asistencia (más de 60 días sin venir)
-- 'cancelled' - Dado de baja manualmente
-- 'pending' - Próximo a vencer (7 días)

-- Función para actualizar estados automáticamente
CREATE OR REPLACE FUNCTION update_member_statuses()
RETURNS void AS $$
BEGIN
    -- Marcar como suspended a socios vencidos hace más de 30 días
    UPDATE members 
    SET status = 'suspended', 
        auto_suspended = TRUE,
        inactive_since = CASE 
            WHEN inactive_since IS NULL THEN expiry_date + INTERVAL '30 days'
            ELSE inactive_since 
        END
    WHERE status IN ('expired', 'pending') 
    AND expiry_date < CURRENT_DATE - INTERVAL '30 days';
    
    -- Marcar como inactive a socios que no vienen hace más de 60 días
    UPDATE members 
    SET status = 'inactive',
        inactive_since = CASE 
            WHEN inactive_since IS NULL THEN last_attendance + INTERVAL '60 days'
            ELSE inactive_since 
        END
    WHERE status = 'active' 
    AND last_attendance IS NOT NULL 
    AND last_attendance < CURRENT_DATE - INTERVAL '60 days';
    
END;
$$ LANGUAGE plpgsql;
