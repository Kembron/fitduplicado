-- DIAGNÓSTICO COMPLETO DE FECHAS EN LA BASE DE DATOS
-- Este script analiza la configuración de zona horaria y los datos de pagos

-- 1. CONFIGURACIÓN DE ZONA HORARIA
SELECT 'CONFIGURACION ZONA HORARIA' as seccion, name, setting, short_desc 
FROM pg_settings 
WHERE name IN ('timezone', 'log_timezone', 'TimeZone');

-- 2. FECHAS ACTUALES EN DIFERENTES FORMATOS
SELECT 
  'FECHAS ACTUALES' as seccion,
  'UTC NOW' as description,
  NOW()::text as valor
UNION ALL
SELECT 
  'FECHAS ACTUALES',
  'UTC DATE',
  CURRENT_DATE::text
UNION ALL
SELECT 
  'FECHAS ACTUALES',
  'Uruguay NOW',
  (NOW() AT TIME ZONE 'America/Montevideo')::text
UNION ALL
SELECT 
  'FECHAS ACTUALES',
  'Uruguay DATE',
  (NOW() AT TIME ZONE 'America/Montevideo')::date::text;

-- 3. ANÁLISIS DE PAGOS POR DÍA (ÚLTIMOS 7 DÍAS)
SELECT 
  'PAGOS POR DIA' as seccion,
  p.payment_date::date as fecha_utc,
  (p.payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Montevideo')::date as fecha_uruguay,
  COUNT(*) as cantidad_pagos,
  SUM(p.amount) as total_amount
FROM payments p
WHERE p.payment_date >= (NOW() - INTERVAL '7 days')
GROUP BY 
  p.payment_date::date,
  (p.payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Montevideo')::date
ORDER BY fecha_uruguay DESC;

-- 4. PAGOS DE HOY ESPECÍFICAMENTE (URUGUAY)
SELECT 
  'PAGOS DE HOY URUGUAY' as seccion,
  COUNT(*) as cantidad_pagos,
  COALESCE(SUM(amount), 0) as total_amount,
  (NOW() AT TIME ZONE 'America/Montevideo')::date as fecha_referencia,
  'America/Montevideo' as zona_horaria
FROM payments 
WHERE (payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Montevideo')::date = 
      (NOW() AT TIME ZONE 'America/Montevideo')::date;

-- 5. PAGOS DE AYER ESPECÍFICAMENTE (URUGUAY)
SELECT 
  'PAGOS DE AYER URUGUAY' as seccion,
  COUNT(*) as cantidad_pagos,
  COALESCE(SUM(amount), 0) as total_amount,
  ((NOW() AT TIME ZONE 'America/Montevideo') - INTERVAL '1 day')::date as fecha_referencia,
  'America/Montevideo' as zona_horaria
FROM payments 
WHERE (payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Montevideo')::date = 
      ((NOW() AT TIME ZONE 'America/Montevideo') - INTERVAL '1 day')::date;

-- 6. MUESTRA DE PAGOS RECIENTES CON CONVERSIÓN DE FECHAS
SELECT 
  'MUESTRA PAGOS RECIENTES' as seccion,
  p.id,
  p.amount,
  p.payment_date as fecha_utc_original,
  (p.payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Montevideo') as fecha_uruguay_completa,
  (p.payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Montevideo')::date as fecha_uruguay_solo_fecha,
  m.name as member_name
FROM payments p
LEFT JOIN members m ON p.member_id = m.id
WHERE p.payment_date >= (NOW() - INTERVAL '3 days')
ORDER BY p.payment_date DESC
LIMIT 10;

-- 7. VERIFICAR DIFERENCIAS ENTRE FECHAS UTC Y URUGUAY
SELECT 
  'DIFERENCIAS FECHAS' as seccion,
  COUNT(*) as total_pagos,
  COUNT(CASE WHEN p.payment_date::date != (p.payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Montevideo')::date THEN 1 END) as pagos_con_diferencia_fecha,
  MIN(p.payment_date) as primer_pago,
  MAX(p.payment_date) as ultimo_pago
FROM payments p;
