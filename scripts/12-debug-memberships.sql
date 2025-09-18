-- Script para diagnosticar problemas con membresías

-- 1. Verificar estructura de la tabla memberships
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'memberships' 
ORDER BY ordinal_position;

-- 2. Verificar todas las membresías existentes
SELECT 
    id,
    name,
    description,
    price,
    duration_days,
    is_active,
    CASE 
        WHEN is_active THEN 'ACTIVA' 
        ELSE 'INACTIVA' 
    END as status_text
FROM memberships 
ORDER BY price ASC, name ASC;

-- 3. Verificar si hay membresías activas
SELECT 
    COUNT(*) as total_memberships,
    COUNT(*) FILTER (WHERE is_active = true) as active_memberships,
    COUNT(*) FILTER (WHERE is_active = false) as inactive_memberships
FROM memberships;

-- 4. Verificar datos específicos que podrían causar problemas
SELECT 
    id,
    name,
    price,
    duration_days,
    is_active,
    CASE 
        WHEN price IS NULL THEN 'PRECIO NULO'
        WHEN price <= 0 THEN 'PRECIO INVÁLIDO'
        WHEN duration_days IS NULL THEN 'DURACIÓN NULA'
        WHEN duration_days <= 0 THEN 'DURACIÓN INVÁLIDA'
        WHEN name IS NULL OR name = '' THEN 'NOMBRE VACÍO'
        ELSE 'OK'
    END as validation_status
FROM memberships;

-- 5. Si no hay membresías, crear algunas por defecto
INSERT INTO memberships (name, description, price, duration_days, is_active)
SELECT * FROM (VALUES
    ('Básico', 'Membresía básica mensual', 1200, 30, true),
    ('Estudiante', 'Membresía especial para estudiantes', 1500, 30, true),
    ('Premium', 'Membresía premium con beneficios', 2500, 30, true),
    ('VIP', 'Membresía VIP con acceso completo', 4500, 30, true),
    ('Anual Premium', 'Membresía anual con descuento', 24000, 365, true)
) AS v(name, description, price, duration_days, is_active)
WHERE NOT EXISTS (SELECT 1 FROM memberships WHERE is_active = true);
