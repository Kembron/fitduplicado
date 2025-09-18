-- CREAR PAGOS DE PRUEBA PARA HOY Y AYER (ZONA HORARIA URUGUAY)
-- Este script crea pagos de prueba si no existen para facilitar las pruebas

DO $$
DECLARE
    today_uruguay DATE;
    yesterday_uruguay DATE;
    test_member_id INTEGER;
    test_membership_id INTEGER;
    test_user_id INTEGER;
    payments_today INTEGER;
    payments_yesterday INTEGER;
BEGIN
    -- Calcular fechas en zona horaria de Uruguay
    today_uruguay := (NOW() AT TIME ZONE 'America/Montevideo')::date;
    yesterday_uruguay := ((NOW() AT TIME ZONE 'America/Montevideo') - INTERVAL '1 day')::date;
    
    RAISE NOTICE 'Fecha hoy Uruguay: %', today_uruguay;
    RAISE NOTICE 'Fecha ayer Uruguay: %', yesterday_uruguay;
    
    -- Verificar si ya existen pagos para hoy
    SELECT COUNT(*) INTO payments_today
    FROM payments 
    WHERE (payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Montevideo')::date = today_uruguay;
    
    -- Verificar si ya existen pagos para ayer
    SELECT COUNT(*) INTO payments_yesterday
    FROM payments 
    WHERE (payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Montevideo')::date = yesterday_uruguay;
    
    RAISE NOTICE 'Pagos existentes hoy: %', payments_today;
    RAISE NOTICE 'Pagos existentes ayer: %', payments_yesterday;
    
    -- Obtener IDs de prueba
    SELECT id INTO test_member_id FROM members LIMIT 1;
    SELECT id INTO test_membership_id FROM memberships LIMIT 1;
    SELECT id INTO test_user_id FROM users LIMIT 1;
    
    -- Crear pagos para HOY si no existen
    IF payments_today = 0 THEN
        RAISE NOTICE 'Creando pagos de prueba para HOY...';
        
        -- Crear varios pagos a diferentes horas del día (en zona horaria Uruguay)
        INSERT INTO payments (member_id, membership_id, amount, payment_method, payment_date, description, created_by, created_at)
        VALUES 
            (test_member_id, test_membership_id, 5000, 'efectivo', 
             (today_uruguay::timestamp + INTERVAL '9 hours') AT TIME ZONE 'America/Montevideo' AT TIME ZONE 'UTC',
             'Pago de prueba - HOY mañana', test_user_id, NOW()),
            (test_member_id, test_membership_id, 3500, 'tarjeta', 
             (today_uruguay::timestamp + INTERVAL '14 hours') AT TIME ZONE 'America/Montevideo' AT TIME ZONE 'UTC',
             'Pago de prueba - HOY tarde', test_user_id, NOW()),
            (test_member_id, test_membership_id, 2800, 'transferencia', 
             (today_uruguay::timestamp + INTERVAL '18 hours') AT TIME ZONE 'America/Montevideo' AT TIME ZONE 'UTC',
             'Pago de prueba - HOY noche', test_user_id, NOW());
             
        RAISE NOTICE 'Creados 3 pagos para HOY';
    END IF;
    
    -- Crear pagos para AYER si no existen
    IF payments_yesterday = 0 THEN
        RAISE NOTICE 'Creando pagos de prueba para AYER...';
        
        -- Crear varios pagos para ayer
        INSERT INTO payments (member_id, membership_id, amount, payment_method, payment_date, description, created_by, created_at)
        VALUES 
            (test_member_id, test_membership_id, 4200, 'efectivo', 
             (yesterday_uruguay::timestamp + INTERVAL '10 hours') AT TIME ZONE 'America/Montevideo' AT TIME ZONE 'UTC',
             'Pago de prueba - AYER mañana', test_user_id, NOW()),
            (test_member_id, test_membership_id, 6800, 'mercadopago', 
             (yesterday_uruguay::timestamp + INTERVAL '16 hours') AT TIME ZONE 'America/Montevideo' AT TIME ZONE 'UTC',
             'Pago de prueba - AYER tarde', test_user_id, NOW());
             
        RAISE NOTICE 'Creados 2 pagos para AYER';
    END IF;
    
    -- Mostrar resumen final
    SELECT COUNT(*) INTO payments_today
    FROM payments 
    WHERE (payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Montevideo')::date = today_uruguay;
    
    SELECT COUNT(*) INTO payments_yesterday
    FROM payments 
    WHERE (payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Montevideo')::date = yesterday_uruguay;
    
    RAISE NOTICE '=== RESUMEN FINAL ===';
    RAISE NOTICE 'Total pagos HOY (%): %', today_uruguay, payments_today;
    RAISE NOTICE 'Total pagos AYER (%): %', yesterday_uruguay, payments_yesterday;
    
END $$;
