-- Script para verificar y corregir problemas de zona horaria en Uruguay
-- Zona horaria: America/Montevideo (UTC-3)

-- 1. Configurar zona horaria para esta sesión
SET timezone = 'America/Montevideo';

-- 2. Verificar configuración actual de timezone
SELECT 
  'Configuración de Timezone' as info,
  current_setting('timezone') as timezone_actual,
  NOW() as fecha_hora_actual,
  CURRENT_DATE as fecha_actual;

-- 3. Verificar pagos del mes actual
SELECT 
  'Pagos del mes actual' as info,
  COUNT(*) as cantidad_pagos,
  COALESCE(SUM(amount), 0) as total_ingresos,
  MIN(payment_date) as primer_pago,
  MAX(payment_date) as ultimo_pago
FROM payments 
WHERE payment_date >= date_trunc('month', CURRENT_DATE);

-- 4. Comparar con mes anterior
SELECT 
  'Pagos del mes anterior' as info,
  COUNT(*) as cantidad_pagos,
  COALESCE(SUM(amount), 0) as total_ingresos
FROM payments 
WHERE payment_date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
  AND payment_date < date_trunc('month', CURRENT_DATE);

-- 5. Mostrar todos los pagos recientes
SELECT 
  'Pagos recientes' as info,
  member_id,
  amount,
  payment_date,
  date_trunc('month', payment_date) as mes_pago
FROM payments 
WHERE payment_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY payment_date DESC
LIMIT 10;

-- 6. Estadísticas de miembros
SELECT 
  'Estadísticas de Miembros' as info,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as socios_activos,
  COUNT(CASE WHEN join_date >= date_trunc('month', CURRENT_DATE) THEN 1 END) as nuevos_este_mes,
  COUNT(CASE WHEN status = 'expired' THEN 1 END) as socios_vencidos,
  COUNT(CASE WHEN status = 'active' AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as proximos_a_vencer
FROM members;

-- 7. Verificar pagos vencidos con montos
SELECT 
  'Pagos Vencidos' as info,
  COUNT(*) as cantidad_vencidos,
  COALESCE(SUM(ms.price), 0) as monto_total_vencido
FROM members m
LEFT JOIN memberships ms ON m.membership_id = ms.id
WHERE m.status = 'expired';

-- 8. Mostrar fechas importantes para debug
SELECT 
  'Fechas de Referencia' as info,
  CURRENT_DATE as fecha_actual,
  date_trunc('month', CURRENT_DATE) as inicio_mes_actual,
  date_trunc('month', CURRENT_DATE - INTERVAL '1 month') as inicio_mes_anterior,
  CURRENT_DATE + INTERVAL '30 days' as fecha_30_dias_futuro;

-- 9. Verificar estructura de tabla payments
SELECT 
  'Estructura tabla payments' as info,
  COUNT(*) as total_pagos,
  MIN(payment_date) as pago_mas_antiguo,
  MAX(payment_date) as pago_mas_reciente,
  COUNT(DISTINCT member_id) as miembros_con_pagos
FROM payments;

-- 10. Verificar estructura de tabla members
SELECT 
  'Estructura tabla members' as info,
  COUNT(*) as total_miembros,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as activos,
  COUNT(CASE WHEN status = 'expired' THEN 1 END) as vencidos,
  COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspendidos,
  COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactivos
FROM members;
