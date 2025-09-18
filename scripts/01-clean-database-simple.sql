-- Script simplificado para limpiar completamente la base de datos usando TRUNCATE
-- CUIDADO: Este script eliminará TODOS los datos

-- Truncar todas las tablas en un solo comando (respetando claves foráneas)
TRUNCATE TABLE 
    attendance,
    payments,
    members,
    memberships,
    users,
    gym_settings,
    audit_log
CASCADE;

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

SELECT 'Base de datos limpiada completamente con TRUNCATE' as mensaje;
