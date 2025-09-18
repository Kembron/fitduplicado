-- Script para actualizar los precios de las membresías a valores uruguayos
-- Ejecutar este script para actualizar los precios existentes

-- Actualizar precios de membresías existentes
UPDATE memberships SET price = 1200 WHERE name ILIKE '%básica%' OR name ILIKE '%basica%' OR name ILIKE '%basic%';
UPDATE memberships SET price = 1800 WHERE name ILIKE '%intermedia%' OR name ILIKE '%intermediate%' OR name ILIKE '%standard%';
UPDATE memberships SET price = 2500 WHERE name ILIKE '%premium%' OR name ILIKE '%avanzada%' OR name ILIKE '%advanced%';
UPDATE memberships SET price = 3200 WHERE name ILIKE '%vip%' OR name ILIKE '%completa%' OR name ILIKE '%full%' OR name ILIKE '%elite%';

-- Si no existen membresías, crear las membresías estándar con precios uruguayos
INSERT INTO memberships (name, description, price, duration_days, is_active) 
VALUES 
  ('Membresía Básica', 'Acceso al gimnasio en horarios regulares', 1200, 30, true),
  ('Membresía Intermedia', 'Acceso completo + clases grupales básicas', 1800, 30, true),
  ('Membresía Premium', 'Acceso completo + todas las clases + nutricionista', 2500, 30, true),
  ('Membresía VIP', 'Acceso completo + entrenador personal + todas las clases', 3200, 30, true)
ON CONFLICT (name) DO UPDATE SET 
  price = EXCLUDED.price,
  description = EXCLUDED.description;

-- Verificar los precios actualizados
SELECT name, description, price, duration_days FROM memberships WHERE is_active = true ORDER BY price ASC;
