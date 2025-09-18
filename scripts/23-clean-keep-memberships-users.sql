-- Script para limpiar la base de datos manteniendo membresías y usuarios admin/manager
-- Elimina solo los datos de socios, pagos, asistencias, etc.

-- Eliminar datos en orden correcto (de dependientes a principales)
DELETE FROM attendance;
DELETE FROM payments;
DELETE FROM members;

-- Eliminar logs y configuraciones (opcional, puedes comentar si quieres mantenerlos)
DELETE FROM audit_log;
DELETE FROM email_logs;

-- Eliminar usuarios que NO sean admin o manager
DELETE FROM users 
WHERE role NOT IN ('admin', 'manager');

-- Reiniciar secuencias solo para las tablas que limpiamos
SELECT setval('members_id_seq', 1, false);
SELECT setval('payments_id_seq', 1, false);
SELECT setval('attendance_id_seq', 1, false);
SELECT setval('audit_log_id_seq', 1, false);
SELECT setval('email_logs_id_seq', 1, false);

-- Verificar qué quedó en la base de datos
SELECT 'USUARIOS MANTENIDOS:' as info;
SELECT id, username, email, role, is_active 
FROM users 
ORDER BY role, username;

SELECT 'MEMBRESÍAS MANTENIDAS:' as info;
SELECT id, name, price, duration_days, is_active 
FROM memberships 
ORDER BY price;

-- Verificar que las tablas limpiadas estén vacías
SELECT 'TABLAS LIMPIADAS:' as info;
SELECT 'members' as tabla, COUNT(*) as registros FROM members
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'attendance', COUNT(*) FROM attendance
UNION ALL
SELECT 'audit_log', COUNT(*) FROM audit_log
UNION ALL
SELECT 'email_logs', COUNT(*) FROM email_logs;

-- Mensaje de confirmación
SELECT 'Base de datos limpiada - Membresías y usuarios admin/manager mantenidos' as mensaje;
