-- Crear tabla de auditoría si no existe
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    user_email VARCHAR(255),
    action_type VARCHAR(50) NOT NULL,
    table_name VARCHAR(100),
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    description TEXT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Insertar algunos registros de ejemplo para probar
INSERT INTO audit_logs (user_email, action_type, description, created_at) VALUES
('admin@fithouse.com', 'LOGIN', 'Login exitoso para Administrador', NOW() - INTERVAL '1 hour'),
('admin@fithouse.com', 'CREATE', 'Nuevo socio creado: Juan Pérez', NOW() - INTERVAL '30 minutes'),
('admin@fithouse.com', 'PAYMENT', 'Pago registrado para socio ID: 1', NOW() - INTERVAL '15 minutes'),
('admin@fithouse.com', 'LOGOUT', 'Logout de Administrador', NOW() - INTERVAL '5 minutes');
