-- Script para crear pagos de prueba si no existen

-- Verificar si hay pagos existentes
DO $$
DECLARE
    payment_count INTEGER;
    member_count INTEGER;
    test_member_id INTEGER;
BEGIN
    -- Contar pagos existentes
    SELECT COUNT(*) INTO payment_count FROM payments;
    
    -- Contar miembros existentes
    SELECT COUNT(*) INTO member_count FROM members WHERE status = 'active';
    
    RAISE NOTICE 'Pagos existentes: %, Miembros activos: %', payment_count, member_count;
    
    -- Si no hay pagos y hay miembros, crear algunos pagos de prueba
    IF payment_count = 0 AND member_count > 0 THEN
        -- Obtener el primer miembro activo
        SELECT id INTO test_member_id FROM members WHERE status = 'active' LIMIT 1;
        
        IF test_member_id IS NOT NULL THEN
            -- Crear pagos de prueba para los últimos 3 meses
            INSERT INTO payments (member_id, amount, payment_date, payment_method, description, membership_id, start_date, end_date, created_by)
            VALUES 
            -- Mes actual
            (test_member_id, 2500, CURRENT_DATE - interval '5 days', 'efectivo', 'Pago mensual - Prueba', 1, CURRENT_DATE - interval '5 days', CURRENT_DATE + interval '25 days', 1),
            (test_member_id, 1500, CURRENT_DATE - interval '10 days', 'transferencia', 'Pago mensual - Prueba', 1, CURRENT_DATE - interval '10 days', CURRENT_DATE + interval '20 days', 1),
            
            -- Mes anterior
            (test_member_id, 2000, CURRENT_DATE - interval '35 days', 'efectivo', 'Pago mensual - Prueba', 1, CURRENT_DATE - interval '35 days', CURRENT_DATE - interval '5 days', 1),
            (test_member_id, 1800, CURRENT_DATE - interval '40 days', 'tarjeta', 'Pago mensual - Prueba', 1, CURRENT_DATE - interval '40 days', CURRENT_DATE - interval '10 days', 1),
            
            -- Hace 2 meses
            (test_member_id, 2200, CURRENT_DATE - interval '65 days', 'efectivo', 'Pago mensual - Prueba', 1, CURRENT_DATE - interval '65 days', CURRENT_DATE - interval '35 days', 1);
            
            RAISE NOTICE 'Se crearon 5 pagos de prueba para el miembro ID: %', test_member_id;
        ELSE
            RAISE NOTICE 'No se encontraron miembros activos para crear pagos de prueba';
        END IF;
    ELSE
        RAISE NOTICE 'Ya existen pagos en la base de datos o no hay miembros activos';
    END IF;
END $$;

-- Verificar los pagos creados
SELECT 
    COUNT(*) as total_payments,
    SUM(amount) as total_amount,
    MIN(payment_date) as earliest_payment,
    MAX(payment_date) as latest_payment
FROM payments;

-- Mostrar pagos por mes
SELECT 
    date_trunc('month', payment_date) as month,
    COUNT(*) as payment_count,
    SUM(amount) as total_revenue
FROM payments 
GROUP BY date_trunc('month', payment_date)
ORDER BY month DESC;
