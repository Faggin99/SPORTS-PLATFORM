-- ========================================
-- RECRIAR TODAS AS TABELAS DO ZERO - CORRETO
-- ========================================
-- ATENÇÃO: Isso vai APAGAR TODOS OS DADOS!

-- 1. DESABILITAR RLS EM TUDO
ALTER TABLE IF EXISTS training_activity_files DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS training_activity_stages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS training_activity_contents DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS training_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS activity_titles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS training_activity_blocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS training_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS training_microcycles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS athletes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contents DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tenants DISABLE ROW LEVEL SECURITY;

-- 2. APAGAR TODAS AS TABELAS (ordem reversa para respeitar foreign keys)
DROP TABLE IF EXISTS training_activity_files CASCADE;
DROP TABLE IF EXISTS training_activity_stages CASCADE;
DROP TABLE IF EXISTS training_activity_contents CASCADE;
DROP TABLE IF EXISTS training_activities CASCADE;
DROP TABLE IF EXISTS activity_titles CASCADE;
DROP TABLE IF EXISTS training_activity_blocks CASCADE;
DROP TABLE IF EXISTS training_sessions CASCADE;
DROP TABLE IF EXISTS training_microcycles CASCADE;
DROP TABLE IF EXISTS athletes CASCADE;
DROP TABLE IF EXISTS stages CASCADE;
DROP TABLE IF EXISTS contents CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- 3. APAGAR FUNÇÃO DE UPDATE
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 4. RECRIAR TUDO CORRETAMENTE (com users usando UUID desde o início)

-- Tenants
CREATE TABLE tenants (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(255) UNIQUE NOT NULL,
    domain VARCHAR(255),
    logo TEXT,
    theme_config JSONB,
    settings JSONB,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users (UUID desde o início!)
CREATE TABLE public.users (
    id UUID PRIMARY KEY,  -- UUID, não BIGSERIAL!
    tenant_id BIGINT REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    password VARCHAR(255) NOT NULL,
    remember_token VARCHAR(100),
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('superadmin', 'admin', 'coach', 'staff', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_tenant ON public.users(tenant_id);
CREATE INDEX idx_users_email ON public.users(email);

-- Athletes
CREATE TABLE athletes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id BIGINT REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    position VARCHAR(100),
    jersey_number INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    observation TEXT,
    "group" VARCHAR(100),
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_athletes_tenant_group ON athletes(tenant_id, "group");

-- Training Microcycles
CREATE TABLE training_microcycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id BIGINT REFERENCES tenants(id) ON DELETE CASCADE,
    week_identifier VARCHAR(20) NOT NULL,
    name VARCHAR(255),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_microcycles_tenant_week ON training_microcycles(tenant_id, week_identifier);

-- Training Sessions
CREATE TABLE training_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    microcycle_id UUID REFERENCES training_microcycles(id) ON DELETE CASCADE,
    tenant_id BIGINT REFERENCES tenants(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    day_name VARCHAR(50) NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, date)
);

CREATE INDEX idx_sessions_tenant_date ON training_sessions(tenant_id, date);

-- Training Activity Blocks
CREATE TABLE training_activity_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    "order" INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_blocks_session_order ON training_activity_blocks(session_id, "order");

-- Contents
CREATE TABLE contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id BIGINT REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    abbreviation VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_contents_tenant ON contents(tenant_id);

-- Activity Titles
CREATE TABLE activity_titles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id BIGINT REFERENCES tenants(id) ON DELETE CASCADE,
    content_id UUID REFERENCES contents(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_titles_tenant ON activity_titles(tenant_id);

-- Training Activities
CREATE TABLE training_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID REFERENCES training_activity_blocks(id) ON DELETE CASCADE,
    title_id UUID REFERENCES activity_titles(id) ON DELETE SET NULL,
    tenant_id BIGINT REFERENCES tenants(id) ON DELETE CASCADE,
    description TEXT,
    groups JSONB NOT NULL,
    is_rest BOOLEAN DEFAULT false,
    duration_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activities_block ON training_activities(block_id);

-- Training Activity Contents
CREATE TABLE training_activity_contents (
    activity_id UUID REFERENCES training_activities(id) ON DELETE CASCADE,
    content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
    PRIMARY KEY (activity_id, content_id)
);

-- Training Activity Stages
CREATE TABLE training_activity_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID REFERENCES training_activities(id) ON DELETE CASCADE,
    stage_name VARCHAR(255) NOT NULL,
    "order" INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stages
CREATE TABLE stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id BIGINT REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    content_name VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_stages_tenant ON stages(tenant_id);

-- Training Activity Files
CREATE TABLE training_activity_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID REFERENCES training_activities(id) ON DELETE CASCADE,
    session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
    tenant_id BIGINT REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,  -- UUID!
    file_path TEXT NOT NULL,
    file_type VARCHAR(20) CHECK (file_type IN ('video', 'pdf')),
    phase VARCHAR(20) DEFAULT 'none' CHECK (phase IN ('pre', 'post', 'none')),
    original_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_single_parent CHECK (
        (session_id IS NULL AND activity_id IS NOT NULL) OR
        (session_id IS NOT NULL AND activity_id IS NULL)
    )
);

-- 5. CRIAR FUNÇÃO E TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_athletes_updated_at BEFORE UPDATE ON athletes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_microcycles_updated_at BEFORE UPDATE ON training_microcycles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON training_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_blocks_updated_at BEFORE UPDATE ON training_activity_blocks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contents_updated_at BEFORE UPDATE ON contents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_activity_titles_updated_at BEFORE UPDATE ON activity_titles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON training_activities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_activity_stages_updated_at BEFORE UPDATE ON training_activity_stages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stages_updated_at BEFORE UPDATE ON stages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_activity_files_updated_at BEFORE UPDATE ON training_activity_files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. INSERIR DADOS INICIAIS
INSERT INTO tenants (id, name, subdomain, status)
VALUES (1, 'Futsport', 'futsport', 'active');

INSERT INTO public.users (id, tenant_id, name, email, password, email_verified_at, role)
VALUES (
    'f56519dd-7b57-49a7-acea-9af97fdb7758'::uuid,  -- UUID do Supabase Auth
    1,
    'Prof. Lauro Martins',
    'prof.lauromartins@gmail.com',
    'placeholder',
    NOW(),
    'coach'
);

-- 7. VERIFICAR
SELECT 'Tenant criado:' as info, * FROM tenants;
SELECT 'Usuário criado:' as info, id, email, name, role, tenant_id FROM public.users;
