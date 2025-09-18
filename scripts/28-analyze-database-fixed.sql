-- Script para analizar la estructura de la base de datos (CORREGIDO)

-- 1. Listar todas las tablas existentes
SELECT 'TABLAS EXISTENTES:' as info;
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Verificar usuarios existentes
SELECT 'USUARIOS ACTUALES:' as info;
SELECT id, username, email, role, is_active FROM users ORDER BY id;

-- 3. Verificar membresías existentes
SELECT 'MEMBRESÍAS ACTUALES:' as info;
SELECT id, name, price, duration_days, is_active FROM memberships ORDER BY id;

-- 4. Contar registros en tablas principales
SELECT 'CONTEO DE REGISTROS:' as info;

-- Verificar si cada tabla existe antes de contar
DO $$
BEGIN
    -- Contar members
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'members') THEN
        RAISE NOTICE 'members: %', (SELECT COUNT(*) FROM members);
    ELSE
        RAISE NOTICE 'members: tabla no existe';
    END IF;

    -- Contar payments
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        RAISE NOTICE 'payments: %', (SELECT COUNT(*) FROM payments);
    ELSE
        RAISE NOTICE 'payments: tabla no existe';
    END IF;

    -- Contar attendance
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance') THEN
        RAISE NOTICE 'attendance: %', (SELECT COUNT(*) FROM attendance);
    ELSE
        RAISE NOTICE 'attendance: tabla no existe';
    END IF;

    -- Contar users
    RAISE NOTICE 'users: %', (SELECT COUNT(*) FROM users);
    
    -- Contar memberships
    RAISE NOTICE 'memberships: %', (SELECT COUNT(*) FROM memberships);
END $$;

-- 5. Verificar secuencias existentes (método alternativo)
SELECT 'SECUENCIAS EXISTENTES:' as info;
SELECT sequence_name 
FROM information_schema.sequences 
WHERE sequence_schema = 'public'
ORDER BY sequence_name;

-- 6. Verificar estructura básica de tablas principales
SELECT 'ESTRUCTURA USERS:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

SELECT 'ESTRUCTURA MEMBERSHIPS:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'memberships' 
ORDER BY ordinal_position;

-- 7. Verificar si existen las tablas que vamos a limpiar
SELECT 'VERIFICACIÓN DE TABLAS A LIMPIAR:' as info;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'members') 
        THEN 'members: ✅ EXISTE' 
        ELSE 'members: ❌ NO EXISTE' 
    END as status
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') 
        THEN 'payments: ✅ EXISTE' 
        ELSE 'payments: ❌ NO EXISTE' 
    END as status
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance') 
        THEN 'attendance: ✅ EXISTE' 
        ELSE 'attendance: ❌ NO EXISTE' 
    END as status;
