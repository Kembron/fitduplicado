-- Script simple para limpiar la base de datos sin permisos especiales
-- Elimina todos los datos en orden correcto respetando claves foráneas

-- Eliminar datos en orden correcto (de dependientes a principales)
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
SELECT setval('users_id_seq', 1, false);
SELECT setval('memberships_id_seq', 1, false);
SELECT setval('members_id_seq', 1, false);
SELECT setval('payments_id_seq', 1, false);
SELECT setval('attendance_id_seq', 1, false);
SELECT setval('gym_settings_id_seq', 1, false);
SELECT setval('audit_log_id_seq', 1, false);
SELECT setval('email_logs_id_seq', 1, false);
SELECT setval('system_config_id_seq', 1, false);

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

-- Mensaje de confirmación
SELECT 'Base de datos limpiada completamente - Lista para migración' as mensaje;
