-- Script de verificación y reparación de tablas necesarias

-- Verificar tablas existentes
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('system_config', 'system_config_extended', 'users', 'members', 'memberships')
ORDER BY table_name;

-- Verificar si existe la tabla users (necesaria para foreign key)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE NOTICE 'Creando tabla users básica...';
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            email VARCHAR(100),
            password_hash VARCHAR(255),
            role VARCHAR(20) DEFAULT 'user',
            created_at TIMESTAMP DEFAULT NOW()
        );
        
        -- Insertar usuario admin por defecto
        INSERT INTO users (username, email, role) 
        VALUES ('admin', 'admin@fithouse.com', 'admin')
        ON CONFLICT (username) DO NOTHING;
    END IF;
END $$;

-- Verificar configuración insertada
SELECT 
    'system_config_extended' as tabla,
    COUNT(*) as registros,
    MAX(created_at) as ultima_actualizacion
FROM system_config_extended
WHERE config_key = 'welcome_email_template'

UNION ALL

SELECT 
    'users' as tabla,
    COUNT(*) as registros,
    MAX(created_at) as ultima_actualizacion
FROM users;

-- Mostrar el template actual
SELECT 
    config_key,
    config_value::json->>'subject' as asunto,
    LEFT(config_value::json->>'content', 200) || '...' as contenido_preview
FROM system_config_extended 
WHERE config_key = 'welcome_email_template';
