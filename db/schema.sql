-- Crear tablas para FitHouse Gym

-- Tabla de usuarios (administradores del sistema)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabla de membresías/planes
CREATE TABLE memberships (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    duration_days INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabla de socios
CREATE TABLE members (
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

-- Tabla de pagos
CREATE TABLE payments (
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

-- Tabla de asistencias
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members(id),
    check_in TIMESTAMP NOT NULL DEFAULT NOW(),
    check_out TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabla de configuración del gimnasio
CREATE TABLE gym_settings (
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

-- Índices para mejorar el rendimiento
CREATE INDEX idx_members_status ON members(status);
CREATE INDEX idx_members_expiry_date ON members(expiry_date);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);
CREATE INDEX idx_payments_member_id ON payments(member_id);
CREATE INDEX idx_attendance_member_id ON attendance(member_id);
CREATE INDEX idx_attendance_check_in ON attendance(check_in);

-- Insertar datos iniciales

-- Insertar membresías
INSERT INTO memberships (name, description, price, duration_days) VALUES
('Básico', 'Acceso a equipamiento básico y áreas comunes', 5000, 30),
('Premium', 'Acceso completo a todas las instalaciones', 8000, 30),
('VIP', 'Acceso completo + entrenador personal', 12000, 30),
('Trimestral', 'Plan Premium por 3 meses con descuento', 21600, 90),
('Semestral', 'Plan Premium por 6 meses con descuento', 38400, 180),
('Anual', 'Plan Premium por 12 meses con descuento', 67200, 365);

-- Insertar usuario administrador
-- La contraseña 'admin123' hasheada con bcrypt
INSERT INTO users (email, name, password, role) VALUES
('admin@fithouse.com', 'Administrador', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Insertar configuración del gimnasio
INSERT INTO gym_settings (gym_name, address, phone, email) VALUES
('FitHouse Gym', 'Av. Principal 123, Ciudad', '+54 11 1234-5678', 'info@fithouse.com');

-- Insertar socios de ejemplo
INSERT INTO members (name, email, phone, document_id, birth_date, address, emergency_contact, notes, membership_id, status, join_date, expiry_date) VALUES
('Juan Pérez', 'juan@email.com', '+54 11 1234-5678', '28456789', '1985-05-15', 'Calle 123, Ciudad', 'María Pérez +54 11 8765-4321', 'Prefiere entrenar por la mañana', 2, 'active', '2024-01-15', '2024-12-15'),
('María González', 'maria@email.com', '+54 11 2345-6789', '30123456', '1990-08-22', 'Av. Central 456, Ciudad', 'Carlos González +54 11 7654-3210', 'Tiene lesión en rodilla derecha', 1, 'active', '2024-02-01', '2024-11-01'),
('Carlos López', 'carlos@email.com', '+54 11 3456-7890', '25789012', '1988-03-10', 'Pasaje 789, Ciudad', 'Ana López +54 11 6543-2109', 'Alergias: látex', 2, 'expired', '2023-12-01', '2024-10-01'),
('Ana Martínez', 'ana@email.com', '+54 11 4567-8901', '32345678', '1992-11-05', 'Calle Norte 234, Ciudad', 'Pedro Martínez +54 11 5432-1098', 'Objetivo: tonificación', 3, 'active', '2024-03-10', '2025-03-10'),
('Roberto Silva', 'roberto@email.com', '+54 11 5678-9012', '27890123', '1983-07-20', 'Av. Sur 567, Ciudad', 'Laura Silva +54 11 4321-0987', 'Prefiere clases grupales', 1, 'pending', '2024-10-01', '2024-12-01');

-- Insertar pagos de ejemplo
INSERT INTO payments (member_id, amount, payment_date, payment_method, description, membership_id, start_date, end_date, created_by) VALUES
(1, 8000, '2024-01-15', 'efectivo', 'Pago inicial', 2, '2024-01-15', '2024-02-15', 1),
(1, 8000, '2024-02-15', 'transferencia', 'Renovación mensual', 2, '2024-02-15', '2024-03-15', 1),
(1, 67200, '2024-03-15', 'tarjeta', 'Cambio a plan anual', 6, '2024-03-15', '2024-12-15', 1),
(2, 5000, '2024-02-01', 'efectivo', 'Pago inicial', 1, '2024-02-01', '2024-03-01', 1),
(2, 5000, '2024-03-01', 'efectivo', 'Renovación mensual', 1, '2024-03-01', '2024-04-01', 1),
(2, 38400, '2024-04-01', 'transferencia', 'Cambio a plan semestral', 5, '2024-04-01', '2024-11-01', 1),
(3, 8000, '2023-12-01', 'tarjeta', 'Pago inicial', 2, '2023-12-01', '2024-01-01', 1),
(3, 8000, '2024-01-01', 'tarjeta', 'Renovación mensual', 2, '2024-01-01', '2024-02-01', 1),
(3, 8000, '2024-02-01', 'tarjeta', 'Renovación mensual', 2, '2024-02-01', '2024-03-01', 1),
(4, 12000, '2024-03-10', 'transferencia', 'Pago inicial', 3, '2024-03-10', '2024-04-10', 1),
(4, 12000, '2024-04-10', 'transferencia', 'Renovación mensual', 3, '2024-04-10', '2024-05-10', 1),
(4, 12000, '2024-05-10', 'transferencia', 'Renovación mensual', 3, '2024-05-10', '2024-06-10', 1),
(5, 5000, '2024-10-01', 'efectivo', 'Pago inicial', 1, '2024-10-01', '2024-11-01', 1),
(5, 5000, '2024-11-01', 'efectivo', 'Renovación mensual', 1, '2024-11-01', '2024-12-01', 1);

-- Insertar asistencias de ejemplo
INSERT INTO attendance (member_id, check_in, check_out) VALUES
(1, '2024-10-01 08:30:00', '2024-10-01 10:00:00'),
(1, '2024-10-03 09:15:00', '2024-10-03 11:00:00'),
(1, '2024-10-05 08:00:00', '2024-10-05 09:30:00'),
(2, '2024-10-01 17:00:00', '2024-10-01 18:30:00'),
(2, '2024-10-02 18:00:00', '2024-10-02 19:45:00'),
(3, '2024-10-02 10:00:00', '2024-10-02 11:30:00'),
(3, '2024-10-04 11:00:00', '2024-10-04 12:15:00'),
(4, '2024-10-01 07:00:00', '2024-10-01 08:30:00'),
(4, '2024-10-03 07:15:00', '2024-10-03 09:00:00'),
(4, '2024-10-05 07:30:00', '2024-10-05 09:15:00'),
(5, '2024-10-02 19:00:00', '2024-10-02 20:30:00'),
(5, '2024-10-04 19:30:00', '2024-10-04 21:00:00');
