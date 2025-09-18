-- =====================================================
-- SCRIPT COMPLETO PARA TRUNCAR BASE DE DATOS
-- =====================================================
-- Múltiples opciones para limpiar la base de datos
-- Elige la opción que mejor se adapte a tu situación

-- =====================================================
-- OPCIÓN 1: TRUNCATE COMPLETO (MÁS RÁPIDO)
-- =====================================================
-- Esta es la opción más rápida para desarrollo/testing
-- ADVERTENCIA: Elimina TODOS los datos permanentemente

DO $$
BEGIN
    -- Mostrar estado antes del truncate
    RAISE NOTICE 'Estado antes del TRUNCATE:';
    RAISE NOTICE 'Usuarios: %', (SELECT COUNT(*) FROM users);
    RAISE NOTICE 'Socios: %', (SELECT COUNT(*) FROM members);
    RAISE NOTICE 'Pagos: %', (SELECT COUNT(*) FROM payments);
    RAISE NOTICE 'Asistencias: %', (SELECT COUNT(*) FROM attendance);
    
    -- Truncate con CASCADE para manejar dependencias
    TRUNCATE TABLE 
        attendance, 
        payments, 
        members, 
        memberships, 
        users, 
        gym_settings,
        audit_log,
        email_logs,
        system_config,
        welcome_templates,
        reminder_templates
    RESTART IDENTITY CASCADE;
    
    RAISE NOTICE 'TRUNCATE completado exitosamente';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error en TRUNCATE: %', SQLERRM;
        RAISE NOTICE 'Intentando con DELETE...';
END $$;

-- =====================================================
-- OPCIÓN 2: DELETE EN ORDEN (MÁS COMPATIBLE)
-- =====================================================
-- Esta opción es más lenta pero más compatible
-- Respeta las restricciones de claves foráneas

DO $$
BEGIN
    -- Mostrar estado antes del DELETE
    RAISE NOTICE 'Estado antes del DELETE:';
    RAISE NOTICE 'Usuarios: %', (SELECT COUNT(*) FROM users);
    RAISE NOTICE 'Socios: %', (SELECT COUNT(*) FROM members);
    RAISE NOTICE 'Pagos: %', (SELECT COUNT(*) FROM payments);
    
    -- Eliminar en orden correcto (dependencias primero)
    DELETE FROM attendance;
    DELETE FROM payments;
    DELETE FROM members;
    DELETE FROM audit_log;
    DELETE FROM email_logs;
    DELETE FROM welcome_templates;
    DELETE FROM reminder_templates;
    DELETE FROM system_config;
    DELETE FROM gym_settings;
    DELETE FROM memberships;
    DELETE FROM users;
    
    -- Reiniciar secuencias
    ALTER SEQUENCE users_id_seq RESTART WITH 1;
    ALTER SEQUENCE memberships_id_seq RESTART WITH 1;
    ALTER SEQUENCE members_id_seq RESTART WITH 1;
    ALTER SEQUENCE payments_id_seq RESTART WITH 1;
    ALTER SEQUENCE attendance_id_seq RESTART WITH 1;
    
    RAISE NOTICE 'DELETE completado exitosamente';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error en DELETE: %', SQLERRM;
END $$;

-- =====================================================
-- OPCIÓN 3: TRUNCATE INDIVIDUAL (CONTROL GRANULAR)
-- =====================================================
-- Para cuando necesitas control específico sobre cada tabla

-- Asistencias (sin dependencias)
TRUNCATE TABLE attendance RESTART IDENTITY CASCADE;

-- Pagos (depende de members y memberships)
TRUNCATE TABLE payments RESTART IDENTITY CASCADE;

-- Socios (depende de memberships)
TRUNCATE TABLE members RESTART IDENTITY CASCADE;

-- Logs y auditoría
TRUNCATE TABLE audit_log RESTART IDENTITY CASCADE;
TRUNCATE TABLE email_logs RESTART IDENTITY CASCADE;

-- Templates
TRUNCATE TABLE welcome_templates RESTART IDENTITY CASCADE;
TRUNCATE TABLE reminder_templates RESTART IDENTITY CASCADE;

-- Configuración del sistema
TRUNCATE TABLE system_config RESTART IDENTITY CASCADE;
TRUNCATE TABLE gym_settings RESTART IDENTITY CASCADE;

-- Membresías (puede tener dependencias)
TRUNCATE TABLE memberships RESTART IDENTITY CASCADE;

-- Usuarios (último, puede tener dependencias)
TRUNCATE TABLE users RESTART IDENTITY CASCADE;

-- =====================================================
-- OPCIÓN 4: LIMPIEZA SELECTIVA (MANTIENE CONFIGURACIÓN)
-- =====================================================
-- Mantiene usuarios admin, membresías y configuración del sistema

DO $$
BEGIN
    -- Eliminar solo datos operacionales
    DELETE FROM attendance;
    DELETE FROM payments;
    DELETE FROM members;
    DELETE FROM audit_log WHERE action NOT LIKE '%system%';
    DELETE FROM email_logs;
    
    -- Mantener configuración y usuarios admin
    -- DELETE FROM users WHERE role != 'admin';
    
    -- Reiniciar solo algunas secuencias
    ALTER SEQUENCE members_id_seq RESTART WITH 1;
    ALTER SEQUENCE payments_id_seq RESTART WITH 1;
    ALTER SEQUENCE attendance_id_seq RESTART WITH 1;
    
    RAISE NOTICE 'Limpieza selectiva completada';
    RAISE NOTICE 'Se mantuvieron: usuarios admin, membresías y configuración';
    
END $$;

-- =====================================================
-- VERIFICACIÓN DEL ESTADO FINAL
-- =====================================================
-- Ejecutar después de cualquier opción para verificar

DO $$
BEGIN
    RAISE NOTICE '=== ESTADO FINAL DE LA BASE DE DATOS ===';
    RAISE NOTICE 'Usuarios: %', (SELECT COUNT(*) FROM users);
    RAISE NOTICE 'Membresías: %', (SELECT COUNT(*) FROM memberships);
    RAISE NOTICE 'Socios: %', (SELECT COUNT(*) FROM members);
    RAISE NOTICE 'Pagos: %', (SELECT COUNT(*) FROM payments);
    RAISE NOTICE 'Asistencias: %', (SELECT COUNT(*) FROM attendance);
    RAISE NOTICE 'Logs de auditoría: %', (SELECT COUNT(*) FROM audit_log);
    RAISE NOTICE 'Logs de email: %', (SELECT COUNT(*) FROM email_logs);
    RAISE NOTICE 'Configuración del sistema: %', (SELECT COUNT(*) FROM system_config);
    RAISE NOTICE '==========================================';
END $$;

-- =====================================================
-- COMANDOS ÚTILES ADICIONALES
-- =====================================================

-- Ver el tamaño de las tablas
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE schemaname = 'public'
ORDER BY tablename, attname;

-- Ver información de secuencias
SELECT 
    sequence_name,
    last_value,
    start_value,
    increment_by
FROM information_schema.sequences 
WHERE sequence_schema = 'public';

-- Verificar integridad referencial
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;
