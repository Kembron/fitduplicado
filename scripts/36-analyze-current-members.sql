-- Script completo para analizar el estado actual de los socios
-- y determinar por qué no aparecen pagos vencidos

-- 1. ANÁLISIS GENERAL DE SOCIOS
SELECT 
  status,
  COUNT(*) as cantidad,
  ROUND(AVG(CASE 
      WHEN last_payment_date IS NOT NULL THEN 
          EXTRACT(days FROM (CURRENT_DATE - last_payment_date))
      ELSE 
          EXTRACT(days FROM (CURRENT_DATE - join_date))
  END)) as promedio_dias_sin_pagar
FROM members 
WHERE status NOT IN ('cancelled')
GROUP BY status
ORDER BY cantidad DESC;

-- 2. ANÁLISIS DETALLADO DE CADA SOCIO
SELECT 
  m.id,
  m.name,
  m.status,
  m.join_date,
  m.expiry_date,
  m.last_payment_date,
  ms.name as membership_name,
  ms.price,
  ms.duration_days,
  
  -- Días desde el último pago
  CASE 
    WHEN m.last_payment_date IS NOT NULL THEN 
      EXTRACT(days FROM (CURRENT_DATE - m.last_payment_date))
    ELSE 
      EXTRACT(days FROM (CURRENT_DATE - m.join_date))
  END as dias_sin_pagar,
  
  -- Días vencidos (si expiry_date existe)
  CASE 
    WHEN m.expiry_date IS NOT NULL AND m.expiry_date < CURRENT_DATE THEN 
      EXTRACT(days FROM (CURRENT_DATE - m.expiry_date))
    ELSE 0
  END as dias_vencido,
  
  -- Evaluación si debería considerarse vencido
  CASE 
    WHEN m.status IN ('expired', 'suspended') THEN 'SÍ - Por status'
    WHEN m.expiry_date IS NOT NULL AND m.expiry_date < CURRENT_DATE - INTERVAL '1 day' THEN 'SÍ - Por fecha vencida'
    WHEN (CASE 
      WHEN m.last_payment_date IS NOT NULL THEN 
        EXTRACT(days FROM (CURRENT_DATE - m.last_payment_date))
      ELSE 
        EXTRACT(days FROM (CURRENT_DATE - m.join_date))
    END) > 35 THEN 'SÍ - Más de 35 días sin pagar'
    WHEN m.status = 'active' AND (CASE 
      WHEN m.last_payment_date IS NOT NULL THEN 
        EXTRACT(days FROM (CURRENT_DATE - m.last_payment_date))
      ELSE 
        EXTRACT(days FROM (CURRENT_DATE - m.join_date))
    END) > 45 THEN 'SÍ - Activo pero 45+ días sin pagar'
    ELSE 'NO'
  END as deberia_estar_vencido
  
FROM members m
LEFT JOIN memberships ms ON m.membership_id = ms.id
WHERE m.status NOT IN ('cancelled', 'inactive')
ORDER BY 
  CASE 
    WHEN m.last_payment_date IS NOT NULL THEN 
      EXTRACT(days FROM (CURRENT_DATE - m.last_payment_date))
    ELSE 
      EXTRACT(days FROM (CURRENT_DATE - m.join_date))
  END DESC;

-- 3. CONTAR CUÁNTOS DEBERÍAN ESTAR VENCIDOS SEGÚN LOS NUEVOS CRITERIOS
SELECT 
  'Socios que deberían aparecer como vencidos' as descripcion,
  COUNT(*) as cantidad
FROM members m
LEFT JOIN memberships ms ON m.membership_id = ms.id
WHERE m.status NOT IN ('cancelled', 'inactive')
AND ms.id IS NOT NULL
AND (
    -- Criterio 1: Status explícito
    m.status IN ('expired', 'suspended')
    OR
    -- Criterio 2: Fecha vencida
    (m.expiry_date IS NOT NULL AND m.expiry_date < CURRENT_DATE - INTERVAL '1 day')
    OR
    -- Criterio 3: Más de 35 días sin pagar
    (CASE 
        WHEN m.last_payment_date IS NOT NULL THEN 
            EXTRACT(days FROM (CURRENT_DATE - m.last_payment_date))
        ELSE 
            EXTRACT(days FROM (CURRENT_DATE - m.join_date))
    END) > 35
    OR
    -- Criterio 4: Activos pero 45+ días sin pagar
    (m.status = 'active' AND (CASE 
        WHEN m.last_payment_date IS NOT NULL THEN 
            EXTRACT(days FROM (CURRENT_DATE - m.last_payment_date))
        ELSE 
            EXTRACT(days FROM (CURRENT_DATE - m.join_date))
    END) > 45)
);

-- 4. VERIFICAR SI HAY MEMBRESÍAS CONFIGURADAS
SELECT 
  'Membresías disponibles' as descripcion,
  COUNT(*) as cantidad
FROM memberships 
WHERE is_active = true;

-- 5. VERIFICAR SI HAY PAGOS REGISTRADOS
SELECT 
  'Pagos registrados (últimos 90 días)' as descripcion,
  COUNT(*) as cantidad
FROM payments 
WHERE payment_date >= CURRENT_DATE - INTERVAL '90 days';

-- 6. ÚLTIMOS PAGOS REGISTRADOS
SELECT 
  'ÚLTIMOS PAGOS' as seccion,
  p.payment_date,
  m.name as member_name,
  p.amount,
  p.payment_method
FROM payments p
JOIN members m ON p.member_id = m.id
ORDER BY p.payment_date DESC
LIMIT 10;

</merged_code>
