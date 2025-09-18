-- Mejorar la tabla email_logs con índices y constraints
ALTER TABLE email_logs 
ADD COLUMN IF NOT EXISTS subject VARCHAR(255),
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_email_logs_member_id ON email_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_date ON email_logs(DATE(sent_at));

-- Agregar constraint para email_type
ALTER TABLE email_logs 
ADD CONSTRAINT IF NOT EXISTS chk_email_type 
CHECK (email_type IN ('membership_reminder', 'custom', 'welcome', 'promotion', 'payment_reminder'));

-- Agregar constraint para status
ALTER TABLE email_logs 
ADD CONSTRAINT IF NOT EXISTS chk_status 
CHECK (status IN ('sent', 'failed', 'pending', 'bounced'));

-- Comentarios para documentar la tabla
COMMENT ON TABLE email_logs IS 'Registro completo de todos los emails enviados por el sistema';
COMMENT ON COLUMN email_logs.member_id IS 'ID del socio que recibió el email';
COMMENT ON COLUMN email_logs.email_type IS 'Tipo de email: membership_reminder, custom, welcome, promotion, payment_reminder';
COMMENT ON COLUMN email_logs.subject IS 'Asunto del email enviado';
COMMENT ON COLUMN email_logs.sent_at IS 'Fecha y hora de envío del email';
COMMENT ON COLUMN email_logs.status IS 'Estado del envío: sent, failed, pending, bounced';
COMMENT ON COLUMN email_logs.error_message IS 'Mensaje de error en caso de fallo en el envío';

-- Crear vista para estadísticas de emails
CREATE OR REPLACE VIEW email_stats AS
SELECT 
    email_type,
    status,
    COUNT(*) as count,
    DATE(sent_at) as date
FROM email_logs
GROUP BY email_type, status, DATE(sent_at)
ORDER BY date DESC, email_type, status;

COMMENT ON VIEW email_stats IS 'Vista con estadísticas de emails enviados por tipo, estado y fecha';
