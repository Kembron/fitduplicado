-- Actualizar la tabla email_logs para incluir el campo subject
ALTER TABLE email_logs 
ADD COLUMN IF NOT EXISTS subject VARCHAR(255);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_email_logs_member_id ON email_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON email_logs(email_type);

-- Comentarios para documentar la tabla
COMMENT ON TABLE email_logs IS 'Registro de todos los emails enviados a los socios';
COMMENT ON COLUMN email_logs.member_id IS 'ID del socio que recibió el email';
COMMENT ON COLUMN email_logs.email_type IS 'Tipo de email: reminder, custom, welcome, promotion';
COMMENT ON COLUMN email_logs.subject IS 'Asunto del email enviado';
COMMENT ON COLUMN email_logs.sent_at IS 'Fecha y hora de envío del email';
COMMENT ON COLUMN email_logs.status IS 'Estado del envío: sent, failed, pending';
