-- Agregar campo username a la tabla users
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

-- Crear índice para username
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Actualizar usuarios existentes con un username temporal basado en su email
UPDATE users 
SET username = LOWER(SPLIT_PART(email, '@', 1))
WHERE username IS NULL;

-- Hacer el campo username obligatorio
ALTER TABLE users ALTER COLUMN username SET NOT NULL;

-- Agregar constraint para validar formato de username
ALTER TABLE users ADD CONSTRAINT chk_username_format 
CHECK (username ~ '^[a-zA-Z0-9_]{3,}$');

-- Comentario sobre la tabla
COMMENT ON COLUMN users.username IS 'Nombre de usuario único para login (solo letras, números y guiones bajos)';
