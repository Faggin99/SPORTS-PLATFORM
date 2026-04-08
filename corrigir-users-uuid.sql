-- ========================================
-- CORRIGIR TABELA USERS - UUID
-- ========================================

-- 1. DESABILITAR RLS TEMPORARIAMENTE
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. REMOVER TODAS AS POLICIES
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view same tenant users" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- 3. DELETAR REGISTRO ANTIGO DO PROF. LAURO
DELETE FROM public.users WHERE email = 'prof.lauromartins@gmail.com';

-- 4. ALTERAR TIPO DA COLUNA ID PARA UUID
ALTER TABLE public.users
    ALTER COLUMN id TYPE UUID USING id::text::uuid,
    ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 5. INSERIR PROF. LAURO COM O UUID CORRETO DO AUTH
INSERT INTO public.users (id, tenant_id, name, email, password, email_verified_at, role)
VALUES (
    'f56519dd-7b57-49a7-acea-9af97fdb7758'::uuid,  -- UUID do Supabase Auth
    1,
    'Prof. Lauro Martins',
    'prof.lauromartins@gmail.com',
    'placeholder',  -- Não usado, autenticação é pelo Supabase Auth
    NOW(),
    'coach'
);

-- 6. RECRIAR POLICIES CORRETAS
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (
        id = auth.uid()
    );

CREATE POLICY "Users can view same tenant users" ON public.users
    FOR SELECT USING (
        tenant_id = (
            SELECT tenant_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (
        id = auth.uid()
    );

-- 7. REABILITAR RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 8. VERIFICAR SE DEU CERTO
SELECT
    id,
    email,
    name,
    role,
    tenant_id
FROM public.users
WHERE email = 'prof.lauromartins@gmail.com';
