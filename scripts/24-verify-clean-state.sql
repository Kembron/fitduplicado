-- Script para verificar el estado después de la limpieza

-- Mostrar usuarios mantenidos
SELECT 'USUARIOS ACTIVOS:' as categoria, '' as detalle
UNION ALL
SELECT username, CONCAT(email, ' (', role, ')') 
FROM users 
WHERE is_active = true
ORDER BY categoria DESC, detalle;

-- Mostrar membresías disponibles
SELECT 'MEMBRESÍAS ACTIVAS:' as categoria, '' as detalle
UNION ALL
SELECT name, CONCAT('$', price::text, ' - ', duration_days::text, ' días')
FROM memberships 
WHERE is_active = true
ORDER BY categoria DESC, detalle;

-- Contar registros en tablas principales
SELECT 
    'Usuarios' as tabla, COUNT(*) as total FROM users
UNION ALL
SELECT 'Membresías', COUNT(*) FROM memberships
UNION ALL
SELECT 'Socios', COUNT(*) FROM members
UNION ALL
SELECT 'Pagos', COUNT(*) FROM payments
UNION ALL
SELECT 'Asistencias', COUNT(*) FROM attendance
ORDER BY tabla;

-- Estado final
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM members) = 0 
        AND (SELECT COUNT(*) FROM payments) = 0 
        AND (SELECT COUNT(*) FROM users WHERE role IN ('admin', 'manager')) > 0
        AND (SELECT COUNT(*) FROM memberships WHERE is_active = true) > 0
        THEN '✅ Base de datos lista para migración'
        ELSE '❌ Verificar estado de la base de datos'
    END as estado;
