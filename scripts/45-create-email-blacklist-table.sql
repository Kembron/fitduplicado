-- Crear tabla para blacklist de emails
CREATE TABLE IF NOT EXISTS email_blacklist (
    id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    error_type VARCHAR(50) NOT NULL CHECK (error_type IN ('invalid_email', 'permanent_failure', 'bounce', 'spam_complaint', 'temporary_failure')),
    error_message TEXT NOT NULL,
    first_error_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_attempt_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    attempt_count INTEGER DEFAULT 1,
    is_permanent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla para control de rate limiting
CREATE TABLE IF NOT EXISTS email_rate_control (
    id SERIAL PRIMARY KEY,
    batch_date DATE NOT NULL DEFAULT CURRENT_DATE,
    max_emails_per_day INTEGER DEFAULT 100,
    max_emails_per_batch INTEGER DEFAULT 10,
    batch_delay_minutes INTEGER DEFAULT 5,
    emails_sent_today INTEGER DEFAULT 0,
    last_batch_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_email_blacklist_member_id ON email_blacklist(member_id);
CREATE INDEX IF NOT EXISTS idx_email_blacklist_permanent ON email_blacklist(is_permanent);
CREATE INDEX IF NOT EXISTS idx_email_blacklist_email ON email_blacklist(email);
CREATE INDEX IF NOT EXISTS idx_email_rate_control_date ON email_rate_control(batch_date);

-- Insertar configuración inicial si no existe
INSERT INTO email_rate_control (batch_date, emails_sent_today)
SELECT CURRENT_DATE, 0
WHERE NOT EXISTS (
    SELECT 1 FROM email_rate_control WHERE batch_date = CURRENT_DATE
);

COMMENT ON TABLE email_blacklist IS 'Lista negra de emails que han fallado permanentemente';
COMMENT ON TABLE email_rate_control IS 'Control de límites de envío de emails por día';
