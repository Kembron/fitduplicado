-- Script para limpiar solo las tablas que existen
-- Mantiene membresías y usuarios admin/manager

-- Verificar qué tablas existen primero
DO $$
BEGIN
    -- Eliminar attendance si existe
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'attendance') THEN
        DELETE FROM attendance;
        RAISE NOTICE 'Tabla attendance limpiada';
    ELSE
        RAISE NOTICE 'Tabla attendance no existe';
    END IF;

    -- Eliminar payments si existe
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payments') THEN
        DELETE FROM payments;
        RAISE NOTICE 'Tabla payments limpiada';
    ELSE
        RAISE NOTICE 'Tabla payments no existe';
    END IF;

    -- Eliminar members si existe
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'members') THEN
        DELETE FROM members;
        RAISE NOTICE 'Tabla members limpiada';
    ELSE
        RAISE NOTICE 'Tabla members no existe';
    END IF;

    -- Eliminar audit_log si existe
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_log') THEN
        DELETE FROM audit_log;
        RAISE NOTICE 'Tabla audit_log limpiada';
    ELSE
        RAISE NOTICE 'Tabla audit_log no existe - saltando';
    END IF;

    -- Eliminar email_logs si existe
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_logs') THEN
        DELETE FROM email_logs;
        RAISE NOTICE 'Tabla email_logs limpiada';
    ELSE
        RAISE NOTICE 'Tabla email_logs no existe - saltando';
    END IF;

    -- Eliminar usuarios que NO sean admin o manager
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        DELETE FROM users WHERE role NOT IN ('admin', 'manager');
        RAISE NOTICE 'Usuarios no-admin eliminados';
    END IF;

END $$;

-- Reiniciar secuencias solo si las tablas existen
DO $$
BEGIN
    -- Reiniciar secuencia de members
    IF EXISTS (SELECT FROM information_schema.sequences WHERE sequence_name = 'members_id_seq') THEN
        PERFORM setval('members_id_seq', 1, false);
        RAISE NOTICE 'Secuencia members_id_seq reiniciada';
    END IF;

    -- Reiniciar secuencia de payments
    IF EXISTS (SELECT FROM information_schema.sequences WHERE sequence_name = 'payments_id_seq') THEN
        PERFORM setval('payments_id_seq', 1, false);
        RAISE NOTICE 'Secuencia payments_id_seq reiniciada';
    END IF;

    -- Reiniciar secuencia de attendance
    IF EXISTS (SELECT FROM information_schema.sequences WHERE sequence_name = 'attendance_id_seq') THEN
        PERFORM setval('attendance_id_seq', 1, false);
        RAISE NOTICE 'Secuencia attendance_id_seq reiniciada';
    END IF;

END $$;

-- Mostrar estado final
SELECT 'LIMPIEZA COMPLETADA' as mensaje;

-- Verificar usuarios mantenidos
SELECT 'USUARIOS MANTENIDOS:' as info;
SELECT id, username, email, role, is_active 
FROM users 
WHERE role IN ('admin', 'manager')
ORDER BY role, username;

-- Verificar membresías mantenidas
SELECT 'MEMBRESÍAS DISPONIBLES:' as info;
SELECT id, name, price, duration_days, is_active 
FROM memberships 
ORDER BY price;
