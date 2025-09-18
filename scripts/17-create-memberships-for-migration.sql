-- Crear membresías necesarias para la migración
INSERT INTO memberships (name, price, duration_days, description, is_active, created_at, updated_at)
VALUES 
  ('Membresía Mensual', 1300, 30, 'Membresía mensual estándar', true, NOW(), NOW()),
  ('Membresía Promocional', 1200, 30, 'Membresía mensual promocional', true, NOW(), NOW()),
  ('Otros Servicios', 500, 30, 'Otros servicios y actividades', true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Verificar que se crearon correctamente
SELECT id, name, price, duration_days, is_active 
FROM memberships 
WHERE is_active = true
ORDER BY price DESC;
