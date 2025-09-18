-- TRUNCATE directo - mantiene usuarios admin/manager y membresías

-- Limpiar datos manteniendo estructura
TRUNCATE TABLE attendance RESTART IDENTITY CASCADE;
TRUNCATE TABLE payments RESTART IDENTITY CASCADE;
TRUNCATE TABLE members RESTART IDENTITY CASCADE;

-- Eliminar usuarios que NO sean admin o manager
DELETE FROM users WHERE role NOT IN ('admin', 'manager');

-- Limpiar logs si existen
DELETE FROM email_logs;

-- Verificar qué quedó
SELECT 'USUARIOS MANTENIDOS:' as info, COUNT(*) as cantidad FROM users;
SELECT 'MEMBRESÍAS MANTENIDAS:' as info, COUNT(*) as cantidad FROM memberships;
SELECT 'SOCIOS ELIMINADOS:' as info, COUNT(*) as cantidad FROM members;
SELECT 'PAGOS ELIMINADOS:' as info, COUNT(*) as cantidad FROM payments;
