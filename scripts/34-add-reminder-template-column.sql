-- Agregar columna reminder_template a la tabla system_config
-- Este script es seguro para ejecutar múltiples veces

DO $$
BEGIN
    -- Verificar si la columna ya existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'system_config' 
        AND column_name = 'reminder_template'
    ) THEN
        -- Agregar la columna si no existe
        ALTER TABLE system_config 
        ADD COLUMN reminder_template TEXT;
        
        RAISE NOTICE 'Columna reminder_template agregada exitosamente a system_config';
    ELSE
        RAISE NOTICE 'La columna reminder_template ya existe en system_config';
    END IF;
END $$;

-- Verificar que la columna se creó correctamente
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'system_config' 
AND column_name = 'reminder_template';

-- Mostrar estructura actual de la tabla system_config
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'system_config'
ORDER BY ordinal_position;
