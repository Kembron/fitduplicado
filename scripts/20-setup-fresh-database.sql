-- Script para configurar la base de datos después del truncate
-- Crea datos básicos necesarios para el funcionamiento

-- Crear usuario administrador por defecto
INSERT INTO users (username, email, password_hash, role, is_active, created_at, updated_at)
VALUES (
    'admin',
    'admin@gym.com',
    '$2b$10$rOzJqQZ8kVxHvGxmTqK./.vQZpQZ8kVxHvGxmTqK./.vQZpQZ8kVx', -- password: admin123
    'admin',
    true,
    NOW(),
    NOW()
);

-- Crear membresías básicas
INSERT INTO memberships (name, price, duration_days, description, is_active, created_at, updated_at)
VALUES 
    ('Membresía Mensual', 1300, 30, 'Membresía mensual estándar', true, NOW(), NOW()),
    ('Membresía Trimestral', 3600, 90, 'Membresía por 3 meses', true, NOW(), NOW()),
    ('Membresía Semestral', 6900, 180, 'Membresía por 6 meses', true, NOW(), NOW()),
    ('Membresía Anual', 12000, 365, 'Membresía anual con descuento', true, NOW(), NOW());

-- Configuración básica del gimnasio
INSERT INTO gym_settings (setting_key, setting_value, description, created_at, updated_at)
VALUES 
    ('gym_name', 'Mi Gimnasio', 'Nombre del gimnasio', NOW(), NOW()),
    ('gym_address', 'Dirección del gimnasio', 'Dirección física', NOW(), NOW()),
    ('gym_phone', '+598 99 123 456', 'Teléfono de contacto', NOW(), NOW()),
    ('gym_email', 'contacto@gimnasio.com', 'Email de contacto', NOW(), NOW());

-- Verificar datos creados
SELECT 'Usuarios creados:' as info, COUNT(*) as cantidad FROM users
UNION ALL
SELECT 'Membresías creadas:', COUNT(*) FROM memberships
UNION ALL
SELECT 'Configuraciones creadas:', COUNT(*) FROM gym_settings;

SELECT 'Base de datos configurada y lista para migración' as mensaje;
