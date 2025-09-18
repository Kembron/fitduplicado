-- Script para crear socios de prueba con pagos vencidos
-- Ejecuta este script SOLO si no tienes datos reales y quieres probar la funcionalidad

-- Primero, verificar que existan membresías
DO $$
BEGIN
    -- Crear membresías de prueba si no existen
    INSERT INTO memberships (name, description, price, duration_days, is_active)
    VALUES 
        ('Básico Test', 'Membresía básica de prueba', 1500, 30, true),
        ('Premium Test', 'Membresía premium de prueba', 2500, 30, true)
    ON CONFLICT (name) DO NOTHING;
END $$;

-- Crear socios de prueba con diferentes escenarios de vencimiento
INSERT INTO members (
    name, email, phone, document_id, gender, birth_date, address, 
    emergency_contact, notes, membership_id, status, join_date, expiry_date, last_payment_date
) VALUES 
    -- Socio 1: Vencido hace 15 días (status expired)
    (
        'Juan Pérez (TEST)', 
        'juan.test@example.com', 
        '099123456', 
        '12345678', 
        'masculino', 
        '1990-01-01', 
        'Dirección Test 123', 
        'Emergencia Test', 
        'Socio de prueba - vencido hace 15 días',
        (SELECT id FROM memberships WHERE name = 'Básico Test' LIMIT 1),
        'expired',
        CURRENT_DATE - INTERVAL '60 days',
        CURRENT_DATE - INTERVAL '15 days',
        CURRENT_DATE - INTERVAL '45 days'
    ),
    
    -- Socio 2: Activo pero sin pagar hace 40 días
    (
        'María González (TEST)', 
        'maria.test@example.com', 
        '099234567', 
        '23456789', 
        'femenino', 
        '1985-05-15', 
        'Dirección Test 456', 
        'Emergencia Test 2', 
        'Socio de prueba - activo pero 40 días sin pagar',
        (SELECT id FROM memberships WHERE name = 'Premium Test' LIMIT 1),
        'active',
        CURRENT_DATE - INTERVAL '70 days',
        CURRENT_DATE + INTERVAL '20 days', -- Fecha de vencimiento futura
        CURRENT_DATE - INTERVAL '40 days' -- Último pago hace 40 días
    ),
    
    -- Socio 3: Suspendido hace 30 días
    (
        'Carlos Rodríguez (TEST)', 
        'carlos.test@example.com', 
        '099345678', 
        '34567890', 
        'masculino', 
        '1988-03-20', 
        'Dirección Test 789', 
        'Emergencia Test 3', 
        'Socio de prueba - suspendido hace 30 días',
        (SELECT id FROM memberships WHERE name = 'Básico Test' LIMIT 1),
        'suspended',
        CURRENT_DATE - INTERVAL '90 days',
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE - INTERVAL '60 days'
    ),
    
    -- Socio 4: Activo pero vencido hace 5 días
    (
        'Ana Martínez (TEST)', 
        'ana.test@example.com', 
        '099456789', 
        '45678901', 
        'femenino', 
        '1992-07-10', 
        'Dirección Test 101', 
        'Emergencia Test 4', 
        'Socio de prueba - activo pero vencido hace 5 días',
        (SELECT id FROM memberships WHERE name = 'Premium Test' LIMIT 1),
        'active',
        CURRENT_DATE - INTERVAL '50 days',
        CURRENT_DATE - INTERVAL '5 days', -- Vencido hace 5 días
        CURRENT_DATE - INTERVAL '35 days'
    ),
    
    -- Socio 5: Sin pagos nunca (solo fecha de ingreso hace 50 días)
    (
        'Luis Fernández (TEST)', 
        'luis.test@example.com', 
        '099567890', 
        '56789012', 
        'masculino', 
        '1987-12-05', 
        'Dirección Test 202', 
        'Emergencia Test 5', 
        'Socio de prueba - nunca pagó, ingresó hace 50 días',
        (SELECT id FROM memberships WHERE name = 'Básico Test' LIMIT 1),
        'active',
        CURRENT_DATE - INTERVAL '50 days',
        CURRENT_DATE - INTERVAL '20 days', -- Debería haber vencido hace 20 días
        NULL -- Nunca pagó
    ),
    
    -- Socio 6: Activo y al día (para contraste)
    (
        'Sofia López (TEST)', 
        'sofia.test@example.com', 
        '099678901', 
        '67890123', 
        'femenino', 
        '1995-09-25', 
        'Dirección Test 303', 
        'Emergencia Test 6', 
        'Socio de prueba - al día con pagos',
        (SELECT id FROM memberships WHERE name = 'Premium Test' LIMIT 1),
        'active',
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE + INTERVAL '15 days', -- Vence en 15 días
        CURRENT_DATE - INTERVAL '5 days' -- Pagó hace 5 días
    )
ON CONFLICT (email) DO NOTHING;

-- Mostrar resumen de los socios de prueba creados
SELECT 
    'Socios de prueba creados' as descripcion,
    COUNT(*) as cantidad
FROM members 
WHERE name LIKE '%(TEST)%';

-- Mostrar detalles de los socios de prueba
SELECT 
    m.name,
    m.status,
    m.join_date,
    m.expiry_date,
    m.last_payment_date,
    ms.name as membership_name,
    
    -- Días desde el último pago o ingreso
    CASE 
        WHEN m.last_payment_date IS NOT NULL THEN 
            EXTRACT(days FROM (CURRENT_DATE - m.last_payment_date))
        ELSE 
            EXTRACT(days FROM (CURRENT_DATE - m.join_date))
    END as dias_sin_pagar,
    
    -- Días vencidos
    CASE 
        WHEN m.expiry_date IS NOT NULL AND m.expiry_date < CURRENT_DATE THEN 
            EXTRACT(days FROM (CURRENT_DATE - m.expiry_date))
        ELSE 0
    END as dias_vencido,
    
    -- Debería aparecer como vencido
    CASE 
        WHEN m.status IN ('expired', 'suspended') THEN 'SÍ'
        WHEN m.expiry_date IS NOT NULL AND m.expiry_date < CURRENT_DATE - INTERVAL '1 day' THEN 'SÍ'
        WHEN (CASE 
            WHEN m.last_payment_date IS NOT NULL THEN 
                EXTRACT(days FROM (CURRENT_DATE - m.last_payment_date))
            ELSE 
                EXTRACT(days FROM (CURRENT_DATE - m.join_date))
        END) > 35 THEN 'SÍ'
        ELSE 'NO'
    END as deberia_aparecer_vencido
    
FROM members m
LEFT JOIN memberships ms ON m.membership_id = ms.id
WHERE m.name LIKE '%(TEST)%'
ORDER BY m.name;

-- Instrucciones finales
SELECT 
    '=== INSTRUCCIONES ===' as mensaje,
    'Ahora deberías ver 5 socios con pagos vencidos en el modal' as detalle
UNION ALL
SELECT 
    'Para limpiar los datos de prueba después:', 
    'DELETE FROM members WHERE name LIKE ''%(TEST)%'';'
UNION ALL
SELECT 
    'Para limpiar las membresías de prueba:', 
    'DELETE FROM memberships WHERE name LIKE ''%Test'';';
