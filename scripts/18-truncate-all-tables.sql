-- Script para limpiar completamente la base de datos usando TRUNCATE
-- CUIDADO: Este script eliminará TODOS los datos permanentemente

-- Deshabilitar verificación de claves foráneas temporalmente
SET session_replication_role = replica;

-- Truncar todas las tablas en orden correcto (respetando dependencias)
TRUNCATE TABLE 
    attendance,
    payments,
    members,
    memberships,
    users,
    gym_settings,
    audit_log,
    email_logs,
    system_config
RESTART IDENTITY CASCADE;

-- Rehabilitar verificación de claves foráneas
SET session_replication_role = DEFAULT;

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

SELECT 'Base de datos limpiada completamente - Lista para migración' as mensaje;
