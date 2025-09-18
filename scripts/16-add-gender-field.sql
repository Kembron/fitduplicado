-- Agregar campo de género a la tabla members
ALTER TABLE members 
ADD COLUMN gender VARCHAR(20) DEFAULT 'no_especificado';

-- Agregar comentario para documentar los valores válidos
COMMENT ON COLUMN members.gender IS 'Género del socio: masculino, femenino, no_especificado';

-- Crear índice para consultas por género (opcional, para reportes futuros)
CREATE INDEX IF NOT EXISTS idx_members_gender ON members(gender);

-- Actualizar registros existentes (opcional)
-- UPDATE members SET gender = 'no_especificado' WHERE gender IS NULL;
