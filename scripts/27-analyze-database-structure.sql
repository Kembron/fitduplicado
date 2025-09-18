-- Script para analizar la estructura de la base de datos

-- 1. Listar todas las tablas existentes
SELECT 'TABLAS EXISTENTES:' as info;
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Verificar estructura de tabla users
SELECT 'ESTRUCTURA TABLA USERS:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- 3. Verificar usuarios existentes
SELECT 'USUARIOS ACTUALES:' as info;
SELECT * FROM users ORDER BY id;

-- 4. Verificar estructura de tabla memberships
SELECT 'ESTRUCTURA TABLA MEMBERSHIPS:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'memberships' 
ORDER BY ordinal_position;

-- 5. Verificar membresías existentes
SELECT 'MEMBRESÍAS ACTUALES:' as info;
SELECT * FROM memberships ORDER BY id;

-- 6. Contar registros en todas las tablas principales
SELECT 'CONTEO DE REGISTROS:' as info;

SELECT 'members' as tabla, COUNT(*) as total FROM members
UNION ALL
SELECT 'payments' as tabla, COUNT(*) as total FROM payments
UNION ALL
SELECT 'users' as tabla, COUNT(*) as total FROM users
UNION ALL
SELECT 'memberships' as tabla, COUNT(*) as total FROM memberships
UNION ALL
SELECT 'attendance' as tabla, COUNT(*) as total FROM attendance;

-- 7. Verificar secuencias existentes
SELECT 'SECUENCIAS EXISTENTES:' as info;
SELECT sequence_name, last_value 
FROM information_schema.sequences 
WHERE sequence_schema = 'public'
ORDER BY sequence_name;

-- 8. Verificar constraints de foreign key
SELECT 'FOREIGN KEYS:' as info;
SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, tc.constraint_name;
