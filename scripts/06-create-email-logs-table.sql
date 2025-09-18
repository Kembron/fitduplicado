-- Crear tabla para registrar los emails enviados
CREATE TABLE IF NOT EXISTS email_logs (
    id SERIAL PRIMARY KEY,
    member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
    email_type VARCHAR(50) NOT NULL, -- 'membership_reminder', 'payment_reminder', etc.
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'failed', 'bounced'
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_email_logs_member_id ON email_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);

-- Insertar comentario sobre la tabla
COMMENT ON TABLE email_logs IS 'Registro de todos los emails enviados por el sistema';
COMMENT ON COLUMN email_logs.email_type IS 'Tipo de email: membership_reminder, payment_reminder, welcome, etc.';
COMMENT ON COLUMN email_logs.status IS 'Estado del envío: sent, failed, bounced';
