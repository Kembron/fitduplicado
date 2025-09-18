-- Script para debuggear el problema de ingresos mensuales

-- 1. Verificar si existen pagos en la tabla
SELECT 
  COUNT(*) as total_payments,
  MIN(payment_date) as earliest_payment,
  MAX(payment_date) as latest_payment,
  SUM(amount) as total_amount
FROM payments;

-- 2. Verificar pagos del mes actual
SELECT 
  COUNT(*) as payments_this_month,
  SUM(amount) as revenue_this_month,
  date_trunc('month', CURRENT_DATE) as current_month_start
FROM payments 
WHERE payment_date >= date_trunc('month', CURRENT_DATE);

-- 3. Verificar pagos por mes (últimos 3 meses)
SELECT 
  date_trunc('month', payment_date) as month,
  COUNT(*) as payment_count,
  SUM(amount) as total_revenue
FROM payments 
WHERE payment_date >= CURRENT_DATE - interval '3 months'
GROUP BY date_trunc('month', payment_date)
ORDER BY month DESC;

-- 4. Verificar estructura de la tabla payments
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'payments' 
ORDER BY ordinal_position;

-- 5. Mostrar algunos pagos de ejemplo
SELECT 
  id, 
  member_id, 
  amount, 
  payment_date,
  payment_method,
  created_at
FROM payments 
ORDER BY payment_date DESC 
LIMIT 10;
