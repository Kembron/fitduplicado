-- Añadir índices para mejorar el rendimiento de las consultas de actividad de usuarios

-- Índice para búsquedas por usuario
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- Índice para filtrado por tipo de acción
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);

-- Índice para ordenar por fecha de creación (muy común en logs de actividad)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Índice compuesto para consultas comunes que filtran por usuario y tipo de acción
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action_type);

-- Índice para búsquedas por tabla afectada
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);

-- Actualizar estadísticas para optimizar el planificador de consultas
ANALYZE audit_logs;

-- Mensaje de confirmación
SELECT 'Índices de actividad de usuarios creados correctamente' as message;
