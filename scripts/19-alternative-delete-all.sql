-- Script alternativo usando DELETE (si TRUNCATE no funciona)
-- Útil si hay problemas de permisos con TRUNCATE

-- Eliminar todos los datos en orden correcto (respetando claves foráneas)
DELETE FROM attendance;
DELETE FROM payments;
DELETE FROM members;
DELETE FROM memberships;
DELETE FROM users;
DELETE FROM gym_settings;
DELETE FROM audit_log;
DELETE FROM email_logs;
DELETE FROM system_config;

-- Reiniciar secuencias para que los IDs empiecen desde 1
ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS memberships_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS members_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS payments_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS attendance_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS gym_settings_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS audit_log_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS email_logs_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS system_config_id_seq RESTART WITH 1;

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
SELECT 'gym_settings', COUNT(*) FROM gym_settings
UNION ALL
SELECT 'audit_log', COUNT(*) FROM audit_log
UNION ALL
SELECT 'email_logs', COUNT(*) FROM email_logs
UNION ALL
SELECT 'system_config', COUNT(*) FROM system_config;

SELECT 'Base de datos limpiada con DELETE - Lista para migración' as mensaje;
