-- Optimización de índices para mejorar el rendimiento de consultas

-- Índices para la tabla members
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_created_at ON members(created_at);
CREATE INDEX IF NOT EXISTS idx_members_last_payment_date ON members(last_payment_date);
CREATE INDEX IF NOT EXISTS idx_members_membership_id ON members(membership_id);
CREATE INDEX IF NOT EXISTS idx_members_status_created_at ON members(status, created_at);

-- Índices para la tabla payments
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_status_due_date ON payments(status, due_date);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date_month ON payments(date_trunc('month', payment_date));

-- Índices para la tabla memberships
CREATE INDEX IF NOT EXISTS idx_memberships_is_active ON memberships(is_active);
CREATE INDEX IF NOT EXISTS idx_memberships_duration_days ON memberships(duration_days);

-- Índices para la tabla users
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Índices compuestos para consultas específicas del dashboard
CREATE INDEX IF NOT EXISTS idx_members_active_expiring ON members(status, last_payment_date, membership_id) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_payments_monthly_revenue ON payments(payment_date, amount) 
WHERE payment_date >= date_trunc('month', CURRENT_DATE);

-- Índice para consultas de membresías que expiran
CREATE INDEX IF NOT EXISTS idx_members_expiring_memberships ON members(status, last_payment_date) 
WHERE status = 'active';

-- Estadísticas actualizadas para el optimizador de consultas
ANALYZE members;
ANALYZE payments;
ANALYZE memberships;
ANALYZE users;

-- Comentarios para documentar los índices
COMMENT ON INDEX idx_members_status IS 'Optimiza consultas por estado de miembro';
COMMENT ON INDEX idx_payments_payment_date_month IS 'Optimiza consultas de ingresos mensuales';
COMMENT ON INDEX idx_members_active_expiring IS 'Optimiza consultas de membresías que expiran';
