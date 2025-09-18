-- Actualizar el usuario admin con username específico
UPDATE users 
SET username = 'admin'
WHERE email = 'admin@fithouse.com' OR role = 'admin';

-- Si no existe un usuario admin, crearlo
INSERT INTO users (name, email, username, password, role, is_active, created_at)
SELECT 
  'Administrador',
  'admin@fithouse.com',
  'admin',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: admin123
  'admin',
  true,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE username = 'admin' OR (email = 'admin@fithouse.com' AND role = 'admin')
);

-- Verificar que el usuario admin existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin') THEN
    RAISE NOTICE 'ADVERTENCIA: No se pudo crear o encontrar el usuario admin';
  ELSE
    RAISE NOTICE 'Usuario admin configurado correctamente con username: admin';
  END IF;
END $$;
