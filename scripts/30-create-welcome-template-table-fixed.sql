-- Script robusto para crear tabla de configuración de templates
-- Maneja todos los casos posibles y errores

-- 1. Crear tabla system_config_extended si no existe
CREATE TABLE IF NOT EXISTS system_config_extended (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER DEFAULT 1
);

-- 2. Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_system_config_extended_key 
ON system_config_extended(config_key);

-- 3. Crear trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Aplicar trigger a la tabla
DROP TRIGGER IF EXISTS update_system_config_extended_updated_at ON system_config_extended;
CREATE TRIGGER update_system_config_extended_updated_at
    BEFORE UPDATE ON system_config_extended
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Insertar template de bienvenida por defecto
INSERT INTO system_config_extended (config_key, config_value, created_by)
VALUES (
    'welcome_email_template',
    '{"subject":"¡Bienvenido a FitHouse Gym! 🏋️","content":"¡Hola {{memberName}}!\\n\\n¡Te damos la más cordial bienvenida a FitHouse Gym! 🎉\\n\\nEstamos muy emocionados de tenerte como parte de nuestra familia fitness. A partir de hoy, tienes acceso completo a todas nuestras instalaciones y servicios.\\n\\n📋 DETALLES DE TU MEMBRESÍA:\\n• Tipo de membresía: {{membershipName}}\\n• Fecha de inicio: {{joinDate}}\\n• Fecha de vencimiento: {{expiryDate}}\\n• Precio mensual: ${{price}}\\n\\n🏋️ ¿QUÉ PUEDES HACER AHORA?\\n• Acceder al gimnasio en nuestros horarios de atención\\n• Utilizar todos los equipos y máquinas\\n• Participar en nuestras clases grupales\\n• Consultar con nuestros entrenadores\\n\\n💡 CONSEJOS PARA EMPEZAR:\\n• Llega 15 minutos antes para familiarizarte con las instalaciones\\n• No olvides traer una toalla y botella de agua\\n• Si tienes dudas, nuestro personal estará encantado de ayudarte\\n• Establece metas realistas y mantén la constancia\\n\\n📞 CONTACTO:\\nSi tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.\\n\\n¡Esperamos verte pronto y que disfrutes al máximo tu experiencia en FitHouse Gym!\\n\\n¡A entrenar se ha dicho! 💪"}',
    1
)
ON CONFLICT (config_key) DO NOTHING;

-- 6. Verificar que la tabla existe y tiene datos
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_config_extended') THEN
        RAISE NOTICE 'Tabla system_config_extended creada exitosamente';
        RAISE NOTICE 'Registros en la tabla: %', (SELECT COUNT(*) FROM system_config_extended);
    ELSE
        RAISE EXCEPTION 'Error: No se pudo crear la tabla system_config_extended';
    END IF;
END $$;

-- 7. Mostrar el contenido insertado para verificación
SELECT 
    config_key,
    LEFT(config_value, 100) || '...' as config_preview,
    created_at
FROM system_config_extended 
WHERE config_key = 'welcome_email_template';
