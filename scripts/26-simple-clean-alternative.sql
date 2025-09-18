-- Alternativa más simple - solo elimina lo básico

-- Eliminar datos principales (en orden de dependencias)
DELETE FROM payments WHERE 1=1;
DELETE FROM members WHERE 1=1;

-- Eliminar usuarios no-admin
DELETE FROM users WHERE role NOT IN ('admin', 'manager');

-- Reiniciar contadores
SELECT setval('members_id_seq', 1, false);
SELECT setval('payments_id_seq', 1, false);

-- Verificar resultado
SELECT 'ESTADO DESPUÉS DE LIMPIEZA:' as titulo;

SELECT 
    'Usuarios' as tabla, 
    COUNT(*) as total,
    STRING_AGG(DISTINCT role, ', ') as roles
FROM users
GROUP BY 'Usuarios'

UNION ALL

SELECT 
    'Membresías' as tabla, 
    COUNT(*) as total,
    CONCAT(COUNT(*), ' activas') as roles
FROM memberships 
WHERE is_active = true

UNION ALL

SELECT 'Socios' as tabla, COUNT(*) as total, 'eliminados' as roles FROM members
UNION ALL
SELECT 'Pagos' as tabla, COUNT(*) as total, 'eliminados' as roles FROM payments;

SELECT 'Base de datos lista para migración' as mensaje;
