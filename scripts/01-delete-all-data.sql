-- Script alternativo para limpiar la base de datos usando DELETE
-- Útil si TRUNCATE no funciona por permisos

-- Eliminar todos los datos de las tablas en orden correcto (respetando claves foráneas)
DELETE FROM attendance;
DELETE FROM payments;
DELETE FROM members;
DELETE FROM memberships;
DELETE FROM users;
DELETE FROM gym_settings;

-- Si existe tabla de auditoría, también limpiarla
DELETE FROM audit_log;

-- Verificar que las tablas estén vacías
SELECT 'users' as tabla, COUNT(*) as registros FROM users
UNION ALL
SELECT 'memberships', COUNT(*) FROM memberships
UNION ALL
SELECT 'members', COUNT(*) FROM members
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'attendance', COUNT(*) FROM attendance
UNION ALL
SELECT 'gym_settings', COUNT(*) FROM gym_settings;

SELECT 'Base de datos limpiada completamente con DELETE' as mensaje;
