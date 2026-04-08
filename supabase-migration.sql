-- ========================================
-- SPORTS PLATFORM - SUPABASE MIGRATION
-- Migração completa do banco de dados
-- ========================================

-- ========================================
-- 1. TENANTS TABLE (Multi-tenancy)
-- ========================================
CREATE TABLE IF NOT EXISTS tenants (
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

-- ========================================
-- 2. USERS TABLE (extends auth.users)
-- Roles: superadmin, admin, coach, staff, user
-- ========================================
CREATE TABLE IF NOT EXISTS public.users (
    id BIGSERIAL PRIMARY KEY,
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

CREATE INDEX IF NOT EXISTS idx_users_tenant ON public.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- ========================================
-- 3. ATHLETES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS athletes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id BIGINT REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    position VARCHAR(100),
    jersey_number INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    observation TEXT,
    "group" VARCHAR(100), -- G1, G2, G3, Transição, DM
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_athletes_tenant_group ON athletes(tenant_id, "group");

-- ========================================
-- 4. TRAINING MICROCYCLES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS training_microcycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id BIGINT REFERENCES tenants(id) ON DELETE CASCADE,
    week_identifier VARCHAR(20) NOT NULL, -- ISO week format: "YYYY-WW"
    name VARCHAR(255),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_microcycles_tenant_week ON training_microcycles(tenant_id, week_identifier);
CREATE INDEX IF NOT EXISTS idx_microcycles_tenant_date ON training_microcycles(tenant_id, start_date);

-- ========================================
-- 5. TRAINING SESSIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS training_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    microcycle_id UUID REFERENCES training_microcycles(id) ON DELETE CASCADE,
    tenant_id BIGINT REFERENCES tenants(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    day_name VARCHAR(50) NOT NULL, -- Segunda, Terça, etc
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, date)
);

CREATE INDEX IF NOT EXISTS idx_sessions_tenant_date ON training_sessions(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_sessions_microcycle ON training_sessions(microcycle_id);

-- ========================================
-- 6. TRAINING ACTIVITY BLOCKS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS training_activity_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    "order" INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocks_session_order ON training_activity_blocks(session_id, "order");

-- ========================================
-- 7. CONTENTS TABLE (Biblioteca de conteúdos)
-- ========================================
CREATE TABLE IF NOT EXISTS contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id BIGINT REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    abbreviation VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contents_tenant ON contents(tenant_id);

-- ========================================
-- 8. ACTIVITY TITLES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS activity_titles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id BIGINT REFERENCES tenants(id) ON DELETE CASCADE,
    content_id UUID REFERENCES contents(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_titles_tenant ON activity_titles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_titles_content ON activity_titles(content_id);

-- ========================================
-- 9. TRAINING ACTIVITIES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS training_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID REFERENCES training_activity_blocks(id) ON DELETE CASCADE,
    title_id UUID REFERENCES activity_titles(id) ON DELETE SET NULL,
    tenant_id BIGINT REFERENCES tenants(id) ON DELETE CASCADE,
    description TEXT,
    groups JSONB NOT NULL, -- ["G1", "G3"]
    is_rest BOOLEAN DEFAULT false,
    duration_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_block ON training_activities(block_id);
CREATE INDEX IF NOT EXISTS idx_activities_tenant ON training_activities(tenant_id);

-- ========================================
-- 10. TRAINING ACTIVITY CONTENTS (Many-to-Many)
-- ========================================
CREATE TABLE IF NOT EXISTS training_activity_contents (
    activity_id UUID REFERENCES training_activities(id) ON DELETE CASCADE,
    content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
    PRIMARY KEY (activity_id, content_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_contents_activity ON training_activity_contents(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_contents_content ON training_activity_contents(content_id);

-- ========================================
-- 11. TRAINING ACTIVITY STAGES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS training_activity_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID REFERENCES training_activities(id) ON DELETE CASCADE,
    stage_name VARCHAR(255) NOT NULL,
    "order" INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_stages_activity_order ON training_activity_stages(activity_id, "order");

-- ========================================
-- 12. STAGES TABLE (Biblioteca de estágios)
-- ========================================
CREATE TABLE IF NOT EXISTS stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id BIGINT REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    content_name VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stages_tenant ON stages(tenant_id);

-- ========================================
-- 13. TRAINING ACTIVITY FILES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS training_activity_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID REFERENCES training_activities(id) ON DELETE CASCADE,
    session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
    tenant_id BIGINT REFERENCES tenants(id) ON DELETE CASCADE,
    created_by BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_activity_files_tenant_session ON training_activity_files(tenant_id, session_id);
CREATE INDEX IF NOT EXISTS idx_activity_files_activity ON training_activity_files(activity_id);

-- ========================================
-- TRIGGERS PARA AUTO-UPDATE updated_at
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger em todas as tabelas
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

-- ========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_microcycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_activity_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_activity_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_activity_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_activity_files ENABLE ROW LEVEL SECURITY;

-- TENANTS: Users can only see their own tenant
CREATE POLICY "Users can view their own tenant" ON tenants
    FOR SELECT USING (
        id IN (
            SELECT tenant_id FROM public.users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
        )
    );

-- USERS: Users can view users from their tenant
CREATE POLICY "Users can view users from their tenant" ON public.users
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
        )
    );

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (
        email = current_setting('request.jwt.claims', true)::json->>'email'
    );

-- ATHLETES: Scoped by tenant
CREATE POLICY "Users can manage athletes from their tenant" ON athletes
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
        )
    );

-- MICROCYCLES: Scoped by tenant
CREATE POLICY "Users can manage microcycles from their tenant" ON training_microcycles
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
        )
    );

-- SESSIONS: Scoped by tenant
CREATE POLICY "Users can manage sessions from their tenant" ON training_sessions
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
        )
    );

-- BLOCKS: Scoped by session's tenant
CREATE POLICY "Users can manage blocks from their tenant" ON training_activity_blocks
    FOR ALL USING (
        session_id IN (
            SELECT id FROM training_sessions WHERE tenant_id IN (
                SELECT tenant_id FROM public.users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
            )
        )
    );

-- CONTENTS: Scoped by tenant
CREATE POLICY "Users can manage contents from their tenant" ON contents
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
        )
    );

-- ACTIVITY TITLES: Scoped by tenant
CREATE POLICY "Users can manage activity titles from their tenant" ON activity_titles
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
        )
    );

-- ACTIVITIES: Scoped by tenant
CREATE POLICY "Users can manage activities from their tenant" ON training_activities
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
        )
    );

-- ACTIVITY CONTENTS: Scoped by activity's tenant
CREATE POLICY "Users can manage activity contents from their tenant" ON training_activity_contents
    FOR ALL USING (
        activity_id IN (
            SELECT id FROM training_activities WHERE tenant_id IN (
                SELECT tenant_id FROM public.users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
            )
        )
    );

-- ACTIVITY STAGES: Scoped by activity's tenant
CREATE POLICY "Users can manage activity stages from their tenant" ON training_activity_stages
    FOR ALL USING (
        activity_id IN (
            SELECT id FROM training_activities WHERE tenant_id IN (
                SELECT tenant_id FROM public.users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
            )
        )
    );

-- STAGES: Scoped by tenant
CREATE POLICY "Users can manage stages from their tenant" ON stages
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
        )
    );

-- ACTIVITY FILES: Scoped by tenant
CREATE POLICY "Users can manage activity files from their tenant" ON training_activity_files
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
        )
    );

-- ========================================
-- CRIAR TENANT PADRÃO E USUÁRIO
-- ========================================

-- Inserir tenant padrão
INSERT INTO tenants (id, name, subdomain, status)
VALUES (1, 'Futsport', 'futsport', 'active')
ON CONFLICT (id) DO NOTHING;

-- Inserir usuário Prof. Lauro com role 'coach'
-- IMPORTANTE: Após criar usuário no Supabase Auth, você precisará atualizar
-- o campo 'id' desta tabela com o UUID gerado pelo Auth
INSERT INTO public.users (tenant_id, name, email, password, email_verified_at, role)
VALUES (
    1,
    'Prof. Lauro Martins',
    'prof.lauromartins@gmail.com',
    '$2y$12$YourHashedPasswordHere', -- Placeholder - será substituído pelo Supabase Auth
    NOW(),
    'coach'  -- Role: treinador (pode criar/editar treinos)
)
ON CONFLICT (email) DO NOTHING;

-- ========================================
-- FIM DA MIGRAÇÃO
-- ========================================
