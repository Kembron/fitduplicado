-- Verificar la estructura actual de la tabla audit_logs
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'audit_logs' 
ORDER BY ordinal_position;

-- Agregar la columna user_name si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_logs' AND column_name = 'user_name'
    ) THEN
        ALTER TABLE audit_logs ADD COLUMN user_name VARCHAR(255);
        RAISE NOTICE 'Columna user_name agregada a audit_logs';
    ELSE
        RAISE NOTICE 'Columna user_name ya existe en audit_logs';
    END IF;
END $$;

-- Verificar que la columna se agregó correctamente
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'audit_logs' AND column_name = 'user_name';

-- Mostrar algunas filas de ejemplo
SELECT id, user_email, user_name, action_type, table_name, created_at
FROM audit_logs 
ORDER BY created_at DESC 
LIMIT 5;
