-- Crear tabla para configuración extendida del sistema
CREATE TABLE IF NOT EXISTS system_config_extended (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL,
  config_value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id)
);

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_system_config_extended_key 
ON system_config_extended(config_key);

-- Insertar template de bienvenida por defecto si no existe
INSERT INTO system_config_extended (config_key, config_value, created_by)
SELECT 
  'welcome_email_template',
  '{"subject":"¡Bienvenido a FitHouse Gym! 🏋️","content":"¡Hola {{memberName}}!\\n\\n¡Te damos la más cordial bienvenida a FitHouse Gym! 🎉\\n\\nEstamos muy emocionados de tenerte como parte de nuestra familia fitness. A partir de hoy, tienes acceso completo a todas nuestras instalaciones y servicios.\\n\\n📋 DETALLES DE TU MEMBRESÍA:\\n• Tipo de membresía: {{membershipName}}\\n• Fecha de inicio: {{joinDate}}\\n• Fecha de vencimiento: {{expiryDate}}\\n• Precio mensual: ${{price}}\\n\\n🏋️ ¿QUÉ PUEDES HACER AHORA?\\n• Acceder al gimnasio en nuestros horarios de atención\\n• Utilizar todos los equipos y máquinas\\n• Participar en nuestras clases grupales\\n• Consultar con nuestros entrenadores\\n\\n💡 CONSEJOS PARA EMPEZAR:\\n• Llega 15 minutos antes para familiarizarte con las instalaciones\\n• No olvides traer una toalla y botella de agua\\n• Si tienes dudas, nuestro personal estará encantado de ayudarte\\n• Establece metas realistas y mantén la constancia\\n\\n📞 CONTACTO:\\nSi tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.\\n\\n¡Esperamos verte pronto y que disfrutes al máximo tu experiencia en FitHouse Gym!\\n\\n¡A entrenar se ha dicho! 💪"}',
  1
WHERE NOT EXISTS (
  SELECT 1 FROM system_config_extended 
  WHERE config_key = 'welcome_email_template'
);

-- Agregar columna de template de bienvenida a la tabla system_config como fallback
ALTER TABLE system_config 
ADD COLUMN IF NOT EXISTS welcome_template TEXT;

-- Comentarios para documentación
COMMENT ON TABLE system_config_extended IS 'Configuración extendida del sistema para templates y configuraciones avanzadas';
COMMENT ON COLUMN system_config_extended.config_key IS 'Clave única de configuración';
COMMENT ON COLUMN system_config_extended.config_value IS 'Valor de configuración en formato JSON';
COMMENT ON COLUMN system_config_extended.created_by IS 'Usuario que creó la configuración';
