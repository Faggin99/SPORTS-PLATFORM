-- ========================================
-- ATUALIZAR ID DO USUÁRIO PARA UUID CORRETO
-- ========================================

-- 1. Verificar o tipo atual da coluna ID
SELECT
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name = 'id';

-- 2. A coluna é BIGINT, mas precisa ser UUID
-- Vamos deletar e recriar o usuário com UUID

-- Deletar usuário antigo
DELETE FROM public.users WHERE email = 'prof.lauromartins@gmail.com';

-- Alterar tipo da coluna para UUID
ALTER TABLE public.users
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE UUID USING gen_random_uuid();

-- Inserir usuário com UUID correto do Supabase Auth
INSERT INTO public.users (id, tenant_id, name, email, password, email_verified_at, role, created_at, updated_at)
VALUES (
    'f56519dd-7b57-49a7-acea-9af97fdb7758'::uuid,
    1,
    'Prof. Lauro Martins',
    'prof.lauromartins@gmail.com',
    'placeholder',
    NOW(),
    'coach',
    NOW(),
    NOW()
);

-- Verificar se deu certo
SELECT
    id,
    email,
    name,
    role,
    tenant_id
FROM public.users
WHERE email = 'prof.lauromartins@gmail.com';

-- O ID agora deve ser: f56519dd-7b57-49a7-acea-9af97fdb7758
