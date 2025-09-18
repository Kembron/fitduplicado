-- Script para arreglar la tabla de membresías

-- 1. Verificar la estructura actual de la tabla
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'memberships' 
ORDER BY ordinal_position;

-- 2. Asegurar que la tabla tenga la estructura correcta
-- Si no existe, crearla
CREATE TABLE IF NOT EXISTS memberships (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    duration_days INTEGER NOT NULL CHECK (duration_days > 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Agregar índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_memberships_active ON memberships(is_active);
CREATE INDEX IF NOT EXISTS idx_memberships_price ON memberships(price);
CREATE INDEX IF NOT EXISTS idx_memberships_name ON memberships(name);

-- 4. Limpiar datos inconsistentes
UPDATE memberships 
SET is_active = true 
WHERE is_active IS NULL;

UPDATE memberships 
SET description = COALESCE(description, '') 
WHERE description IS NULL;

-- 5. Eliminar membresías duplicadas (mantener la más reciente)
WITH duplicates AS (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY LOWER(name) ORDER BY id DESC) as rn
    FROM memberships
)
DELETE FROM memberships 
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- 6. Insertar membresías por defecto si no existen
INSERT INTO memberships (name, description, price, duration_days, is_active)
SELECT * FROM (VALUES
    ('Básico', 'Membresía básica mensual con acceso completo al gimnasio', 1200.00, 30, true),
    ('Estudiante', 'Membresía especial para estudiantes con descuento', 1500.00, 30, true),
    ('Premium', 'Membresía premium con beneficios adicionales', 2500.00, 30, true),
    ('VIP', 'Membresía VIP con acceso completo y servicios exclusivos', 4500.00, 30, true),
    ('Anual Premium', 'Membresía anual con descuento significativo', 24000.00, 365, true)
) AS v(name, description, price, duration_days, is_active)
WHERE NOT EXISTS (
    SELECT 1 FROM memberships WHERE LOWER(name) = LOWER(v.name)
);

-- 7. Verificar el resultado final
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
    END as status
FROM memberships 
ORDER BY price ASC, name ASC;

-- 8. Verificar conteo
SELECT 
    COUNT(*) as total_memberships,
    COUNT(*) FILTER (WHERE is_active = true) as active_memberships,
    COUNT(*) FILTER (WHERE is_active = false) as inactive_memberships
FROM memberships;
