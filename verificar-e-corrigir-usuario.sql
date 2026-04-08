-- ========================================
-- VERIFICAR E CORRIGIR USUÁRIO PROF. LAURO
-- ========================================

-- 1. VERIFICAR USUÁRIO NO SUPABASE AUTH
SELECT
    id as auth_uuid,
    email,
    created_at,
    email_confirmed_at
FROM auth.users
WHERE email = 'prof.lauromartins@gmail.com';

-- 2. VERIFICAR USUÁRIO NA TABELA PUBLIC.USERS
SELECT
    id,
    email,
    name,
    role,
    tenant_id,
    created_at
FROM public.users
WHERE email = 'prof.lauromartins@gmail.com';

-- 3. VERIFICAR SE TENANT EXISTE
SELECT * FROM tenants WHERE id = 1;

-- ========================================
-- INSTRUÇÕES:
-- ========================================
-- Execute as 3 queries acima e me diga os resultados.
-- Depois vou te dar o próximo passo para corrigir.
