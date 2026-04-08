-- ========================================
-- DIAGNÓSTICO COMPLETO - SUPABASE
-- ========================================

-- 1. VERIFICAR ESTRUTURA DA TABELA USERS
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. VERIFICAR TODOS OS USUÁRIOS NA TABELA USERS
SELECT
    id,
    tenant_id,
    name,
    email,
    role,
    created_at
FROM public.users;

-- 3. VERIFICAR USUÁRIO NO AUTH
SELECT
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users
WHERE email = 'prof.lauromartins@gmail.com';

-- 4. VERIFICAR SE RLS ESTÁ ATIVO
SELECT
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'users' AND schemaname = 'public';

-- 5. LISTAR TODAS AS POLICIES DA TABELA USERS
SELECT
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'users';

-- 6. TESTAR ACESSO DIRETO (SEM RLS)
-- Execute isso separadamente
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

SELECT
    id,
    email,
    name,
    role
FROM public.users
WHERE email = 'prof.lauromartins@gmail.com';

-- 7. REABILITAR RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
