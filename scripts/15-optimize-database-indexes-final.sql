-- Optimización de índices para mejorar el rendimiento de consultas
-- Versión final sin funciones no inmutables

-- Índices para la tabla members
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_created_at ON members(created_at);
CREATE INDEX IF NOT EXISTS idx_members_last_payment_date ON members(last_payment_date);
CREATE INDEX IF NOT EXISTS idx_members_membership_id ON members(membership_id);
CREATE INDEX IF NOT EXISTS idx_members_status_created_at ON members(status, created_at);
CREATE INDEX IF NOT EXISTS idx_members_expiry_date ON members(expiry_date);
CREATE INDEX IF NOT EXISTS idx_members_join_date ON members(join_date);

-- Índices para la tabla payments (basado en el esquema real)
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_membership_id ON payments(membership_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_start_date ON payments(start_date);
CREATE INDEX IF NOT EXISTS idx_payments_end_date ON payments(end_date);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_amount ON payments(amount);

-- Índices compuestos para consultas específicas
CREATE INDEX IF NOT EXISTS idx_payments_member_payment_date ON payments(member_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_date_range ON payments(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_payments_date_amount ON payments(payment_date, amount);

-- Índices para la tabla memberships
CREATE INDEX IF NOT EXISTS idx_memberships_is_active ON memberships(is_active);
CREATE INDEX IF NOT EXISTS idx_memberships_duration_days ON memberships(duration_days);
CREATE INDEX IF NOT EXISTS idx_memberships_price ON memberships(price);

-- Índices para la tabla users
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Índices para la tabla attendance (si existe)
CREATE INDEX IF NOT EXISTS idx_attendance_member_id ON attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_check_in ON attendance(check_in);
CREATE INDEX IF NOT EXISTS idx_attendance_check_out ON attendance(check_out);
CREATE INDEX IF NOT EXISTS idx_attendance_member_date ON attendance(member_id, check_in);

-- Índices parciales con condiciones estáticas (sin funciones no inmutables)
CREATE INDEX IF NOT EXISTS idx_members_active_status ON members(expiry_date, last_payment_date) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_members_pending_status ON members(expiry_date, last_payment_date) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_members_suspended_status ON members(expiry_date, last_payment_date) 
WHERE status = 'suspended';

-- Índice para membresías activas
CREATE INDEX IF NOT EXISTS idx_memberships_active ON memberships(name, price, duration_days) 
WHERE is_active = true;

-- Índices para consultas de ordenamiento común
CREATE INDEX IF NOT EXISTS idx_members_name ON members(name);
CREATE INDEX IF NOT EXISTS idx_payments_desc_date ON payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_members_expiry_desc ON members(expiry_date DESC);

-- Estadísticas actualizadas para el optimizador de consultas
ANALYZE members;
ANALYZE payments;
ANALYZE memberships;
ANALYZE users;

-- Verificar si la tabla attendance existe antes de analizarla
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'attendance') THEN
        EXECUTE 'ANALYZE attendance';
    END IF;
END $$;

-- Comentarios para documentar los índices
COMMENT ON INDEX idx_members_status IS 'Optimiza consultas por estado de miembro';
COMMENT ON INDEX idx_payments_date_amount IS 'Optimiza consultas de ingresos por fecha';
COMMENT ON INDEX idx_members_active_status IS 'Optimiza consultas de miembros activos';
COMMENT ON INDEX idx_payments_member_payment_date IS 'Optimiza consultas de historial de pagos por miembro';
COMMENT ON INDEX idx_members_expiry_date IS 'Optimiza consultas de fechas de expiración';

-- Mostrar información sobre los índices creados
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('members', 'payments', 'memberships', 'users', 'attendance')
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
