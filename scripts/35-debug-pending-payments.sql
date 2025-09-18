-- Script para debuggear y verificar los pagos pendientes
-- Ejecutar este script para entender qué socios deberían aparecer como vencidos

-- 1. Ver todos los socios y sus fechas de pago
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
      (CURRENT_DATE - m.last_payment_date)
    ELSE 
      (CURRENT_DATE - m.join_date)
  END as days_since_last_payment,
  -- Días vencidos
  CASE 
    WHEN m.expiry_date IS NOT NULL AND m.expiry_date < CURRENT_DATE THEN 
      (CURRENT_DATE - m.expiry_date)
    ELSE 0
  END as days_overdue
FROM members m
LEFT JOIN memberships ms ON m.membership_id = ms.id
WHERE m.status IN ('active', 'expired', 'suspended')
ORDER BY 
  CASE 
    WHEN m.last_payment_date IS NOT NULL THEN 
      (CURRENT_DATE - m.last_payment_date)
    ELSE 
      (CURRENT_DATE - m.join_date)
  END DESC;

-- 2. Ver específicamente los que deberían ser pagos pendientes
SELECT 
  'PAGOS PENDIENTES DETECTADOS' as titulo,
  COUNT(*) as total_pendientes,
  SUM(ms.price) as monto_total_adeudado
FROM members m
LEFT JOIN memberships ms ON m.membership_id = ms.id
WHERE m.status IN ('active', 'expired', 'suspended')
AND ms.id IS NOT NULL
AND (
  -- Membresía vencida
  (m.expiry_date IS NOT NULL AND m.expiry_date < CURRENT_DATE)
  OR
  -- Sin pagos por más de 90 días
  (CASE 
    WHEN m.last_payment_date IS NOT NULL THEN 
      (CURRENT_DATE - m.last_payment_date)
    ELSE 
      (CURRENT_DATE - m.join_date)
  END > 90)
  OR
  -- Status expired o suspended
  (m.status IN ('expired', 'suspended'))
)
AND (CASE 
  WHEN m.last_payment_date IS NOT NULL THEN 
    (CURRENT_DATE - m.last_payment_date)
  ELSE 
    (CURRENT_DATE - m.join_date)
END <= 365); -- No incluir socios inactivos por más de 1 año

-- 3. Ver el detalle de cada caso
SELECT 
  m.name,
  m.status,
  m.expiry_date,
  m.last_payment_date,
  ms.name as membership,
  ms.price,
  CASE 
    WHEN m.expiry_date IS NOT NULL AND m.expiry_date < CURRENT_DATE THEN 'VENCIDO POR FECHA'
    WHEN (CASE 
      WHEN m.last_payment_date IS NOT NULL THEN 
        (CURRENT_DATE - m.last_payment_date)
      ELSE 
        (CURRENT_DATE - m.join_date)
    END > 90) THEN 'VENCIDO POR TIEMPO (>90 días)'
    WHEN m.status IN ('expired', 'suspended') THEN 'VENCIDO POR STATUS'
    ELSE 'OTRO'
  END as razon_vencimiento,
  CASE 
    WHEN m.last_payment_date IS NOT NULL THEN 
      (CURRENT_DATE - m.last_payment_date)
    ELSE 
      (CURRENT_DATE - m.join_date)
  END as days_since_last_payment
FROM members m
LEFT JOIN memberships ms ON m.membership_id = ms.id
WHERE m.status IN ('active', 'expired', 'suspended')
AND ms.id IS NOT NULL
AND (
  (m.expiry_date IS NOT NULL AND m.expiry_date < CURRENT_DATE)
  OR
  (CASE 
    WHEN m.last_payment_date IS NOT NULL THEN 
      (CURRENT_DATE - m.last_payment_date)
    ELSE 
      (CURRENT_DATE - m.join_date)
  END > 90)
  OR
  (m.status IN ('expired', 'suspended'))
)
AND (CASE 
  WHEN m.last_payment_date IS NOT NULL THEN 
    (CURRENT_DATE - m.last_payment_date)
  ELSE 
    (CURRENT_DATE - m.join_date)
END <= 365)
ORDER BY 
  CASE 
    WHEN m.last_payment_date IS NOT NULL THEN 
      (CURRENT_DATE - m.last_payment_date)
    ELSE 
      (CURRENT_DATE - m.join_date)
  END DESC;
