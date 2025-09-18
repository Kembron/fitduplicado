-- Script para limpiar completamente la base de datos
-- CUIDADO: Este script eliminará TODOS los datos

-- Deshabilitar verificación de claves foráneas temporalmente
SET session_replication_role = replica;

-- Eliminar todos los datos de las tablas en orden correcto (respetando claves foráneas)
DELETE FROM attendance;
DELETE FROM payments;
DELETE FROM members;
DELETE FROM memberships;
DELETE FROM users;
DELETE FROM gym_settings;

-- Si existe tabla de auditoría, también limpiarla
DELETE FROM audit_log;

-- Rehabilitar verificación de claves foráneas
SET session_replication_role = DEFAULT;

-- Reiniciar secuencias para que los IDs empiecen desde 1
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE memberships_id_seq RESTART WITH 1;
ALTER SEQUENCE members_id_seq RESTART WITH 1;
ALTER SEQUENCE payments_id_seq RESTART WITH 1;
ALTER SEQUENCE attendance_id_seq RESTART WITH 1;
ALTER SEQUENCE gym_settings_id_seq RESTART WITH 1;

-- Si existe secuencia de auditoría
ALTER SEQUENCE audit_log_id_seq RESTART WITH 1;

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

PRINT 'Base de datos limpiada completamente';
