-- Crear tabla audit_logs si no existe
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    user_email VARCHAR(255),
    user_name VARCHAR(255),
    action_type VARCHAR(50) NOT NULL,
    table_name VARCHAR(100),
    record_id INTEGER,
    description TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email ON audit_logs(user_email);

-- Insertar datos de prueba
INSERT INTO audit_logs (user_email, user_name, action_type, table_name, record_id, description, ip_address, created_at) VALUES
('admin@fithouse.com', 'Administrador', 'LOGIN', 'users', 1, 'Usuario inició sesión en el sistema', '192.168.1.100', NOW() - INTERVAL '1 hour'),
('admin@fithouse.com', 'Administrador', 'CREATE', 'members', 1, 'Nuevo socio creado: Juan Pérez', '192.168.1.100', NOW() - INTERVAL '2 hours'),
('admin@fithouse.com', 'Administrador', 'UPDATE', 'members', 1, 'Información del socio actualizada', '192.168.1.100', NOW() - INTERVAL '3 hours'),
('admin@fithouse.com', 'Administrador', 'PAYMENT', 'payments', 1, 'Pago registrado para socio ID: 1', '192.168.1.100', NOW() - INTERVAL '4 hours'),
('admin@fithouse.com', 'Administrador', 'CREATE', 'members', 2, 'Nuevo socio creado: María García', '192.168.1.100', NOW() - INTERVAL '5 hours'),
('admin@fithouse.com', 'Administrador', 'LOGIN', 'users', 1, 'Usuario inició sesión en el sistema', '192.168.1.100', NOW() - INTERVAL '6 hours'),
('admin@fithouse.com', 'Administrador', 'UPDATE', 'members', 2, 'Estado de membresía actualizado', '192.168.1.100', NOW() - INTERVAL '7 hours'),
('admin@fithouse.com', 'Administrador', 'PAYMENT', 'payments', 2, 'Pago registrado para socio ID: 2', '192.168.1.100', NOW() - INTERVAL '8 hours'),
('admin@fithouse.com', 'Administrador', 'SUSPEND', 'members', 1, 'Socio suspendido por falta de pago', '192.168.1.100', NOW() - INTERVAL '9 hours'),
('admin@fithouse.com', 'Administrador', 'REACTIVATE', 'members', 1, 'Socio reactivado después del pago', '192.168.1.100', NOW() - INTERVAL '10 hours');

-- Verificar que los datos se insertaron correctamente
SELECT COUNT(*) as total_records FROM audit_logs;
