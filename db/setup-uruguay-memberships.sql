-- Script específico para configurar membresías con precios uruguayos
-- Este script asegura que las membresías tengan precios acordes al mercado uruguayo

-- Eliminar membresías existentes si es necesario (opcional)
-- DELETE FROM memberships;

-- Insertar o actualizar membresías con precios uruguayos
INSERT INTO memberships (name, description, price, duration_days, is_active) 
VALUES 
  ('Básica', 'Acceso al gimnasio en horarios de 6:00 a 22:00. Incluye uso de máquinas y pesas libres.', 1200, 30, true),
  ('Intermedia', 'Todo lo de Básica + acceso a clases grupales (spinning, aeróbicos, funcional).', 1800, 30, true),
  ('Premium', 'Todo lo de Intermedia + acceso a sauna + consulta nutricional mensual.', 2500, 30, true),
  ('VIP Elite', 'Acceso completo + entrenador personal 2 veces por semana + todas las clases + nutricionista.', 3200, 30, true),
  ('Estudiante', 'Membresía especial para estudiantes con carnet vigente. Horarios limitados.', 900, 30, true),
  ('Anual Básica', 'Membresía básica con descuento por pago anual anticipado.', 12000, 365, true)
ON CONFLICT (name) DO UPDATE SET 
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  duration_days = EXCLUDED.duration_days;

-- Actualizar cualquier membresía existente que pueda tener precios antiguos
UPDATE memberships 
SET price = CASE 
  WHEN name ILIKE '%básica%' OR name ILIKE '%basica%' OR name ILIKE '%basic%' THEN 1200
  WHEN name ILIKE '%intermedia%' OR name ILIKE '%intermediate%' OR name ILIKE '%standard%' THEN 1800
  WHEN name ILIKE '%premium%' OR name ILIKE '%avanzada%' OR name ILIKE '%advanced%' THEN 2500
  WHEN name ILIKE '%vip%' OR name ILIKE '%completa%' OR name ILIKE '%full%' OR name ILIKE '%elite%' THEN 3200
  WHEN name ILIKE '%estudiante%' OR name ILIKE '%student%' THEN 900
  WHEN name ILIKE '%anual%' OR name ILIKE '%annual%' THEN 12000
  ELSE price
END
WHERE is_active = true;

-- Mostrar las membresías configuradas
SELECT 
  id,
  name as "Membresía",
  description as "Descripción", 
  CONCAT('$U ', price) as "Precio",
  CONCAT(duration_days, ' días') as "Duración"
FROM memberships 
WHERE is_active = true 
ORDER BY price ASC;
