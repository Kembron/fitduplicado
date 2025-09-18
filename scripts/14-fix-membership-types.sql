-- Script para verificar y corregir los tipos de datos en la tabla memberships

-- Mostrar la estructura actual de la tabla
\d memberships;

-- Verificar los valores actuales
SELECT 
  id, 
  name, 
  price, 
  pg_typeof(price) as price_type,
  duration_days,
  pg_typeof(duration_days) as duration_type,
  is_active
FROM memberships;

-- Asegurar que price sea numérico
ALTER TABLE memberships 
ALTER COLUMN price TYPE numeric(10,2) USING price::numeric(10,2);

-- Asegurar que duration_days sea entero
ALTER TABLE memberships 
ALTER COLUMN duration_days TYPE integer USING duration_days::integer;

-- Asegurar que is_active sea booleano
ALTER TABLE memberships 
ALTER COLUMN is_active TYPE boolean USING is_active::boolean;

-- Verificar los valores después de la conversión
SELECT 
  id, 
  name, 
  price, 
  pg_typeof(price) as price_type,
  duration_days,
  pg_typeof(duration_days) as duration_type,
  is_active
FROM memberships;

-- Limpiar el cache de la aplicación (esto no afecta la BD, solo es informativo)
SELECT 'Recuerda reiniciar la aplicación para limpiar el cache' as nota;
