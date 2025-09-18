-- =====================================================
-- TRUNCATE SEGURO CON VERIFICACIONES
-- =====================================================
-- Script con múltiples verificaciones de seguridad

-- Mostrar estado inicial
DO $$
BEGIN
    RAISE NOTICE '=== ESTADO INICIAL DE LA BASE DE DATOS ===';
    RAISE NOTICE 'Usuarios: %', (SELECT COUNT(*) FROM users);
    RAISE NOTICE 'Membresías: %', (SELECT COUNT(*) FROM memberships);
    RAISE NOTICE 'Socios: %', (SELECT COUNT(*) FROM members);
    RAISE NOTICE 'Pagos: %', (SELECT COUNT(*) FROM payments);
    RAISE NOTICE 'Asistencias: %', (SELECT COUNT(*) FROM attendance);
    RAISE NOTICE '==========================================';
END $$;

-- Verificación de seguridad
DO $$
DECLARE
    total_records INTEGER;
BEGIN
    SELECT 
        (SELECT COUNT(*) FROM users) +
        (SELECT COUNT(*) FROM members) +
        (SELECT COUNT(*) FROM payments) +
        (SELECT COUNT(*) FROM attendance)
    INTO total_records;
    
    RAISE NOTICE 'Total de registros a eliminar: %', total_records;
    
    IF total_records > 10000 THEN
        RAISE NOTICE '⚠️  ADVERTENCIA: Hay más de 10,000 registros';
        RAISE NOTICE '⚠️  Considera hacer un backup antes de continuar';
    END IF;
    
END $$;

-- Proceso de limpieza con manejo robusto de errores
DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration INTERVAL;
BEGIN
    start_time := clock_timestamp();
    RAISE NOTICE 'Iniciando limpieza segura a las %', start_time;
    
    -- Intentar TRUNCATE primero
    BEGIN
        RAISE NOTICE 'Intentando TRUNCATE...';
        
        TRUNCATE TABLE 
            attendance, 
            payments, 
            members, 
            audit_log,
            email_logs,
            welcome_templates,
            reminder_templates,
            system_config,
            gym_settings,
            memberships, 
            users
        RESTART IDENTITY CASCADE;
        
        RAISE NOTICE '✅ TRUNCATE completado exitosamente';
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️  TRUNCATE falló: %', SQLERRM;
            RAISE NOTICE 'Intentando DELETE secuencial...';
            
            -- Fallback a DELETE secuencial
            BEGIN
                -- Eliminar en orden de dependencias
                RAISE NOTICE 'Eliminando asistencias...';
                DELETE FROM attendance;
                
                RAISE NOTICE 'Eliminando pagos...';
                DELETE FROM payments;
                
                RAISE NOTICE 'Eliminando socios...';
                DELETE FROM members;
                
                RAISE NOTICE 'Eliminando logs...';
                DELETE FROM audit_log;
                DELETE FROM email_logs;
                
                RAISE NOTICE 'Eliminando templates...';
                DELETE FROM welcome_templates;
                DELETE FROM reminder_templates;
                
                RAISE NOTICE 'Eliminando configuración...';
                DELETE FROM system_config;
                DELETE FROM gym_settings;
                
                RAISE NOTICE 'Eliminando membresías...';
                DELETE FROM memberships;
                
                RAISE NOTICE 'Eliminando usuarios...';
                DELETE FROM users;
                
                -- Reiniciar secuencias manualmente
                RAISE NOTICE 'Reiniciando secuencias...';
                PERFORM setval('users_id_seq', 1, false);
                PERFORM setval('memberships_id_seq', 1, false);
                PERFORM setval('members_id_seq', 1, false);
                PERFORM setval('payments_id_seq', 1, false);
                PERFORM setval('attendance_id_seq', 1, false);
                
                RAISE NOTICE '✅ DELETE secuencial completado';
                
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE '❌ ERROR CRÍTICO en DELETE: %', SQLERRM;
                    RAISE EXCEPTION 'No se pudo completar la limpieza de la base de datos';
            END;
    END;
    
    end_time := clock_timestamp();
    duration := end_time - start_time;
    
    RAISE NOTICE 'Limpieza completada en: %', duration;
    
END $$;

-- Verificación final
DO $$
DECLARE
    remaining_records INTEGER;
BEGIN
    RAISE NOTICE '=== VERIFICACIÓN FINAL ===';
    
    SELECT 
        (SELECT COUNT(*) FROM users) +
        (SELECT COUNT(*) FROM members) +
        (SELECT COUNT(*) FROM payments) +
        (SELECT COUNT(*) FROM attendance) +
        (SELECT COUNT(*) FROM memberships)
    INTO remaining_records;
    
    IF remaining_records = 0 THEN
        RAISE NOTICE '✅ Base de datos limpiada exitosamente';
        RAISE NOTICE '✅ Todas las tablas están vacías';
    ELSE
        RAISE NOTICE '⚠️  Advertencia: Quedan % registros', remaining_records;
    END IF;
    
    -- Mostrar estado detallado
    RAISE NOTICE 'Usuarios: %', (SELECT COUNT(*) FROM users);
    RAISE NOTICE 'Membresías: %', (SELECT COUNT(*) FROM memberships);
    RAISE NOTICE 'Socios: %', (SELECT COUNT(*) FROM members);
    RAISE NOTICE 'Pagos: %', (SELECT COUNT(*) FROM payments);
    RAISE NOTICE 'Asistencias: %', (SELECT COUNT(*) FROM attendance);
    RAISE NOTICE 'Logs de auditoría: %', (SELECT COUNT(*) FROM audit_log);
    RAISE NOTICE 'Logs de email: %', (SELECT COUNT(*) FROM email_logs);
    RAISE NOTICE '========================';
    
END $$;

-- Verificar estado de las secuencias
SELECT 
    sequence_name,
    last_value,
    is_called
FROM information_schema.sequences 
WHERE sequence_schema = 'public'
ORDER BY sequence_name;

-- Mensaje final
DO $$
BEGIN
    RAISE NOTICE '🎉 Proceso de limpieza segura completado';
    RAISE NOTICE '📝 Revisa los mensajes anteriores para confirmar el éxito';
    RAISE NOTICE '💡 Puedes proceder a insertar nuevos datos';
END $$;
