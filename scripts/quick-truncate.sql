-- =====================================================
-- TRUNCATE RÁPIDO PARA DESARROLLO
-- =====================================================
-- Script simple y directo para limpiar toda la BD

-- Truncate completo con manejo de errores
DO $$
BEGIN
    RAISE NOTICE 'Iniciando limpieza rápida de la base de datos...';
    
    -- Intentar TRUNCATE primero (más rápido)
    BEGIN
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
        
        RAISE NOTICE '✅ TRUNCATE completado exitosamente';
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️  TRUNCATE falló, intentando DELETE: %', SQLERRM;
            
            -- Fallback a DELETE si TRUNCATE falla
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
            
            RAISE NOTICE '✅ DELETE completado como fallback';
    END;
    
END $$;

-- Verificar resultado
SELECT 
    'users' as tabla, COUNT(*) as registros FROM users
UNION ALL
SELECT 
    'members' as tabla, COUNT(*) as registros FROM members
UNION ALL
SELECT 
    'payments' as tabla, COUNT(*) as registros FROM payments
UNION ALL
SELECT 
    'attendance' as tabla, COUNT(*) as registros FROM attendance
ORDER BY tabla;
