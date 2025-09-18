-- Crear usuario admin después de limpiar la base de datos
-- Este usuario será necesario para la migración

INSERT INTO users (
    username, 
    email, 
    password_hash, 
    role, 
    is_active, 
    created_at, 
    updated_at
) VALUES (
    'admin',
    'admin@gym.com',
    '$2b$10$dummy.hash.for.migration.only.replace.later',
    'admin',
    true,
    NOW(),
    NOW()
);

-- Verificar que se creó el usuario
SELECT id, username, email, role, is_active 
FROM users 
WHERE role = 'admin';

SELECT 'Usuario admin creado exitosamente' as mensaje;
