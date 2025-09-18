-- Script para crear el usuario administrador con contraseña hasheada
-- Ejecutar este script en tu base de datos Neon

-- Crear tablas si no existen
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Crear tabla de membresías si no existe
CREATE TABLE IF NOT EXISTS memberships (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    duration_days INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Crear tabla de socios si no existe
CREATE TABLE IF NOT EXISTS members (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    document_id VARCHAR(50),
    birth_date DATE,
    address TEXT,
    emergency_contact TEXT,
    notes TEXT,
    membership_id INTEGER REFERENCES memberships(id),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE,
    last_payment_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Crear tabla de pagos si no existe
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members(id),
    amount DECIMAL(10, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    description TEXT,
    membership_id INTEGER REFERENCES memberships(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Crear tabla de asistencias si no existe
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members(id),
    check_in TIMESTAMP NOT NULL DEFAULT NOW(),
    check_out TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Crear tabla de configuración del gimnasio si no existe
CREATE TABLE IF NOT EXISTS gym_settings (
    id SERIAL PRIMARY KEY,
    gym_name VARCHAR(255) NOT NULL DEFAULT 'FitHouse Gym',
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    logo_url TEXT,
    currency VARCHAR(10) NOT NULL DEFAULT 'ARS',
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Eliminar usuario admin existente si existe
DELETE FROM users WHERE email = 'admin@fithouse.com';

-- Insertar usuario administrador con contraseña hasheada (admin123)
-- Hash generado con bcrypt, salt rounds = 12
INSERT INTO users (email, name, password, role) VALUES
('admin@fithouse.com', 'Administrador', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAyqfzK', 'admin');

-- Insertar membresías si no existen
INSERT INTO memberships (name, description, price, duration_days) VALUES
('Básico', 'Acceso a equipamiento básico y áreas comunes', 5000, 30),
('Premium', 'Acceso completo a todas las instalaciones', 8000, 30),
('VIP', 'Acceso completo + entrenador personal', 12000, 30),
('Trimestral', 'Plan Premium por 3 meses con descuento', 21600, 90),
('Semestral', 'Plan Premium por 6 meses con descuento', 38400, 180),
('Anual', 'Plan Premium por 12 meses con descuento', 67200, 365)
ON CONFLICT DO NOTHING;

-- Insertar configuración del gimnasio si no existe
INSERT INTO gym_settings (gym_name, address, phone, email) VALUES
('FitHouse Gym', 'Av. Principal 123, Ciudad', '+54 11 1234-5678', 'info@fithouse.com')
ON CONFLICT DO NOTHING;

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_expiry_date ON members(expiry_date);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_member_id ON attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_check_in ON attendance(check_in);

-- Verificar que el usuario fue creado correctamente
SELECT id, email, name, role, created_at FROM users WHERE email = 'admin@fithouse.com';
