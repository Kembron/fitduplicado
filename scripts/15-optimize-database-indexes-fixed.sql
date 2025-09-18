-- Optimización de índices para mejorar el rendimiento de consultas
-- Versión corregida basada en el esquema real

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

-- Índices compuestos para consultas específicas
CREATE INDEX IF NOT EXISTS idx_payments_member_payment_date ON payments(member_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_date_range ON payments(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_payments_monthly_revenue ON payments(payment_date, amount);

-- Índices para la tabla memberships
CREATE INDEX IF NOT EXISTS idx_memberships_is_active ON memberships(is_active);
CREATE INDEX IF NOT EXISTS idx_memberships_duration_days ON memberships(duration_days);
CREATE INDEX IF NOT EXISTS idx_memberships_price ON memberships(price);

-- Índices para la tabla users
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Índices para la tabla attendance
CREATE INDEX IF NOT EXISTS idx_attendance_member_id ON attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_check_in ON attendance(check_in);
CREATE INDEX IF NOT EXISTS idx_attendance_check_out ON attendance(check_out);
CREATE INDEX IF NOT EXISTS idx_attendance_member_date ON attendance(member_id, check_in);

-- Índices compuestos para consultas específicas del dashboard
CREATE INDEX IF NOT EXISTS idx_members_active_status ON members(status) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_members_expiring_soon ON members(status, expiry_date) 
WHERE status = 'active' AND expiry_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_recent ON payments(payment_date, amount) 
WHERE payment_date >= CURRENT_DATE - INTERVAL '30 days';

-- Índice para consultas de ingresos por mes
CREATE INDEX IF NOT EXISTS idx_payments_monthly ON payments(date_trunc('month', payment_date), amount);

-- Índice para consultas de membresías activas
CREATE INDEX IF NOT EXISTS idx_members_active_membership ON members(status, membership_id, expiry_date) 
WHERE status IN ('active', 'pending');

-- Estadísticas actualizadas para el optimizador de consultas
ANALYZE members;
ANALYZE payments;
ANALYZE memberships;
ANALYZE users;
ANALYZE attendance;

-- Comentarios para documentar los índices
COMMENT ON INDEX idx_members_status IS 'Optimiza consultas por estado de miembro';
COMMENT ON INDEX idx_payments_monthly_revenue IS 'Optimiza consultas de ingresos mensuales';
COMMENT ON INDEX idx_members_expiring_soon IS 'Optimiza consultas de membresías que expiran pronto';
COMMENT ON INDEX idx_payments_member_payment_date IS 'Optimiza consultas de historial de pagos por miembro';
COMMENT ON INDEX idx_attendance_member_date IS 'Optimiza consultas de asistencia por miembro y fecha';
