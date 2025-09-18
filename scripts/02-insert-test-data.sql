-- Script para insertar datos de testing
-- Ejecutar después de limpiar la base de datos

-- 1. Insertar usuario administrador
-- Contraseña: admin123 (hasheada con bcrypt)
INSERT INTO users (email, name, password, role) VALUES
('admin@fithouse.com', 'Administrador Principal', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAyqfzK', 'admin'),
('manager@fithouse.com', 'Manager Gym', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAyqfzK', 'manager');

-- 2. Insertar membresías
INSERT INTO memberships (name, description, price, duration_days, is_active) VALUES
('Básico', 'Acceso a equipamiento básico y áreas comunes', 8000.00, 30, true),
('Premium', 'Acceso completo a todas las instalaciones + clases grupales', 12000.00, 30, true),
('VIP', 'Acceso completo + entrenador personal + nutricionista', 18000.00, 30, true),
('Trimestral Premium', 'Plan Premium por 3 meses con 10% descuento', 32400.00, 90, true),
('Semestral Premium', 'Plan Premium por 6 meses con 15% descuento', 61200.00, 180, true),
('Anual Premium', 'Plan Premium por 12 meses con 20% descuento', 115200.00, 365, true),
('Estudiante', 'Plan especial para estudiantes con descuento', 6000.00, 30, true),
('Familiar', 'Plan para 2 personas con descuento familiar', 20000.00, 30, true);

-- 3. Insertar configuración del gimnasio
INSERT INTO gym_settings (gym_name, address, phone, email, currency, tax_rate) VALUES
('FitHouse Gym', 'Av. Libertador 1234, Buenos Aires, Argentina', '+54 11 4567-8900', 'info@fithouse.com', 'ARS', 0.00);

-- 4. Insertar socios de testing con diferentes estados y situaciones
INSERT INTO members (name, email, phone, document_id, birth_date, address, emergency_contact, notes, membership_id, status, join_date, expiry_date, last_payment_date) VALUES

-- SOCIOS ACTIVOS (membresías vigentes)
('Juan Carlos Pérez', 'juan.perez@email.com', '+54 11 1234-5678', '28456789', '1985-05-15', 'Calle Corrientes 123, CABA', 'María Pérez +54 11 8765-4321', 'Prefiere entrenar por la mañana. Objetivo: tonificación', 2, 'active', '2024-11-01', '2024-12-01', '2024-11-01'),

('María González López', 'maria.gonzalez@email.com', '+54 11 2345-6789', '30123456', '1990-08-22', 'Av. Santa Fe 456, CABA', 'Carlos González +54 11 7654-3210', 'Tiene lesión previa en rodilla derecha. Evitar ejercicios de alto impacto', 3, 'active', '2024-10-15', '2024-12-15', '2024-11-15'),

('Roberto Silva', 'roberto.silva@email.com', '+54 11 3456-7890', '25789012', '1988-03-10', 'Pasaje San Martín 789, CABA', 'Ana Silva +54 11 6543-2109', 'Plan anual. Cliente VIP desde 2023', 6, 'active', '2024-01-15', '2025-01-15', '2024-01-15'),

('Ana Martínez', 'ana.martinez@email.com', '+54 11 4567-8901', '32345678', '1992-11-05', 'Calle Belgrano 234, CABA', 'Pedro Martínez +54 11 5432-1098', 'Estudiante de medicina. Horarios flexibles', 7, 'active', '2024-11-10', '2024-12-10', '2024-11-10'),

('Carlos López', 'carlos.lopez@email.com', '+54 11 5678-9012', '27890123', '1983-07-20', 'Av. Rivadavia 567, CABA', 'Laura López +54 11 4321-0987', 'Plan familiar con su esposa. Prefiere clases grupales', 8, 'active', '2024-11-05', '2024-12-05', '2024-11-05'),

-- SOCIOS VENCIDOS (para testing de pagos pendientes)
('Patricia Rodríguez', 'patricia.rodriguez@email.com', '+54 11 6789-0123', '29456123', '1987-12-03', 'Calle Maipú 890, CABA', 'Miguel Rodríguez +54 11 3210-9876', 'Membresía vencida hace 5 días. Contactar para renovación', 1, 'expired', '2024-09-25', '2024-10-25', '2024-09-25'),

('Diego Fernández', 'diego.fernandez@email.com', '+54 11 7890-1234', '31789456', '1991-04-18', 'Av. Callao 345, CABA', 'Sofía Fernández +54 11 2109-8765', 'Membresía vencida hace 15 días. Deuda pendiente', 2, 'expired', '2024-09-01', '2024-10-01', '2024-09-01'),

('Lucía Morales', 'lucia.morales@email.com', '+54 11 8901-2345', '33654789', '1989-09-25', 'Calle Florida 678, CABA', 'Javier Morales +54 11 1098-7654', 'Ex-cliente VIP. Membresía vencida hace 20 días', 3, 'expired', '2024-08-15', '2024-09-15', '2024-08-15'),

-- SOCIOS SUSPENDIDOS (vencidos hace más de 45 días)
('Fernando Castro', 'fernando.castro@email.com', '+54 11 9012-3456', '26321654', '1984-01-12', 'Av. Corrientes 901, CABA', 'Elena Castro +54 11 0987-6543', 'Suspendido por falta de pago. Último pago hace 60 días', 1, 'suspended', '2024-07-01', '2024-08-01', '2024-07-01'),

('Gabriela Ruiz', 'gabriela.ruiz@email.com', '+54 11 0123-4567', '34987321', '1993-06-30', 'Calle Lavalle 123, CABA', 'Martín Ruiz +54 11 9876-5432', 'Suspendida automáticamente. Contactar para reactivación', 2, 'suspended', '2024-06-15', '2024-07-15', '2024-06-15'),

-- SOCIOS INACTIVOS (sin actividad hace más de 90 días)
('Alejandro Vega', 'alejandro.vega@email.com', '+54 11 1234-5679', '28741963', '1986-10-08', 'Av. 9 de Julio 456, CABA', 'Carmen Vega +54 11 8765-4322', 'Inactivo hace 4 meses. Considerar para campaña de reactivación', 1, 'inactive', '2024-04-01', '2024-05-01', '2024-04-01'),

('Valeria Herrera', 'valeria.herrera@email.com', '+54 11 2345-6780', '35159753', '1994-02-14', 'Calle Reconquista 789, CABA', 'Pablo Herrera +54 11 7654-3211', 'Cliente inactiva. Último contacto en abril 2024', 2, 'inactive', '2024-03-15', '2024-04-15', '2024-03-15'),

-- SOCIOS CANCELADOS
('Mónica Torres', 'monica.torres@email.com', '+54 11 3456-7891', '30852741', '1988-11-20', 'Av. Las Heras 234, CABA', 'Ricardo Torres +54 11 6543-2110', 'Membresía cancelada por mudanza a otra ciudad', 2, 'cancelled', '2024-08-01', '2024-09-01', '2024-08-01');

-- 5. Insertar pagos de testing
INSERT INTO payments (member_id, amount, payment_date, payment_method, description, membership_id, start_date, end_date, created_by) VALUES

-- Pagos de socios activos
(1, 12000.00, '2024-11-01', 'transferencia', 'Pago mensual Premium - Noviembre 2024', 2, '2024-11-01', '2024-12-01', 1),
(2, 18000.00, '2024-11-15', 'tarjeta', 'Pago mensual VIP - Noviembre 2024', 3, '2024-11-15', '2024-12-15', 1),
(3, 115200.00, '2024-01-15', 'transferencia', 'Pago anual Premium con descuento', 6, '2024-01-15', '2025-01-15', 1),
(4, 6000.00, '2024-11-10', 'efectivo', 'Pago mensual Estudiante - Noviembre 2024', 7, '2024-11-10', '2024-12-10', 1),
(5, 20000.00, '2024-11-05', 'transferencia', 'Pago mensual Familiar - Noviembre 2024', 8, '2024-11-05', '2024-12-05', 1),

-- Pagos históricos de socios vencidos
(6, 8000.00, '2024-09-25', 'efectivo', 'Último pago antes del vencimiento', 1, '2024-09-25', '2024-10-25', 1),
(7, 12000.00, '2024-09-01', 'tarjeta', 'Pago Premium - Septiembre 2024', 2, '2024-09-01', '2024-10-01', 1),
(8, 18000.00, '2024-08-15', 'transferencia', 'Último pago VIP antes del vencimiento', 3, '2024-08-15', '2024-09-15', 1),

-- Pagos históricos de socios suspendidos
(9, 8000.00, '2024-07-01', 'efectivo', 'Último pago antes de la suspensión', 1, '2024-07-01', '2024-08-01', 1),
(10, 12000.00, '2024-06-15', 'transferencia', 'Pago Premium antes de suspensión', 2, '2024-06-15', '2024-07-15', 1),

-- Pagos históricos de socios inactivos
(11, 8000.00, '2024-04-01', 'efectivo', 'Último pago antes de inactividad', 1, '2024-04-01', '2024-05-01', 1),
(12, 12000.00, '2024-03-15', 'tarjeta', 'Pago Premium antes de inactividad', 2, '2024-03-15', '2024-04-15', 1),

-- Pago de socio cancelado
(13, 12000.00, '2024-08-01', 'transferencia', 'Último pago antes de cancelación', 2, '2024-08-01', '2024-09-01', 1);

-- 6. Insertar registros de asistencia de testing
INSERT INTO attendance (member_id, check_in, check_out) VALUES

-- Asistencias recientes de socios activos
(1, '2024-11-25 08:30:00', '2024-11-25 10:00:00'),
(1, '2024-11-23 09:15:00', '2024-11-23 11:00:00'),
(1, '2024-11-21 08:00:00', '2024-11-21 09:30:00'),

(2, '2024-11-25 17:00:00', '2024-11-25 18:30:00'),
(2, '2024-11-24 18:00:00', '2024-11-24 19:45:00'),
(2, '2024-11-22 17:30:00', '2024-11-22 19:00:00'),

(3, '2024-11-25 07:00:00', '2024-11-25 08:30:00'),
(3, '2024-11-23 07:15:00', '2024-11-23 09:00:00'),
(3, '2024-11-21 07:30:00', '2024-11-21 09:15:00'),

(4, '2024-11-24 19:00:00', '2024-11-24 20:30:00'),
(4, '2024-11-22 19:30:00', '2024-11-22 21:00:00'),

(5, '2024-11-25 10:00:00', '2024-11-25 11:30:00'),
(5, '2024-11-23 11:00:00', '2024-11-23 12:15:00'),

-- Asistencias históricas de socios vencidos (antes del vencimiento)
(6, '2024-10-20 08:30:00', '2024-10-20 10:00:00'),
(6, '2024-10-18 09:00:00', '2024-10-18 10:30:00'),

(7, '2024-09-28 17:00:00', '2024-09-28 18:30:00'),
(7, '2024-09-26 18:00:00', '2024-09-26 19:30:00'),

-- Asistencias muy antiguas de socios suspendidos/inactivos
(9, '2024-07-25 08:00:00', '2024-07-25 09:30:00'),
(10, '2024-06-20 17:00:00', '2024-06-20 18:30:00'),
(11, '2024-04-15 10:00:00', '2024-04-15 11:30:00'),
(12, '2024-03-20 19:00:00', '2024-03-20 20:30:00');

-- Verificar que los datos se insertaron correctamente
SELECT 'RESUMEN DE DATOS INSERTADOS:' as info;
SELECT 'Usuarios' as tabla, COUNT(*) as cantidad FROM users
UNION ALL
SELECT 'Membresías', COUNT(*) FROM memberships
UNION ALL
SELECT 'Socios', COUNT(*) FROM members
UNION ALL
SELECT 'Pagos', COUNT(*) FROM payments
UNION ALL
SELECT 'Asistencias', COUNT(*) FROM attendance
UNION ALL
SELECT 'Configuración', COUNT(*) FROM gym_settings;

-- Mostrar distribución de socios por estado
SELECT 'DISTRIBUCIÓN POR ESTADO:' as info;
SELECT status as estado, COUNT(*) as cantidad 
FROM members 
GROUP BY status 
ORDER BY cantidad DESC;

SELECT 'Datos de testing insertados correctamente' as mensaje;
