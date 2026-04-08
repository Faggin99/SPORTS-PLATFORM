-- ========================================
-- AJUSTAR TABELAS PARA DADOS PADRÃO
-- ========================================
-- Contents e Stages não devem ter tenant_id (são dados padrão do sistema)
-- Activity_titles continuam com tenant_id (são cadastrados pelos usuários)

-- 1. REMOVER tenant_id de CONTENTS (fazer backup primeiro)
-- Criar nova tabela sem tenant_id
CREATE TABLE IF NOT EXISTS contents_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    abbreviation VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Copiar dados únicos (sem duplicatas por tenant)
INSERT INTO contents_new (id, name, abbreviation, description, created_at, updated_at)
SELECT DISTINCT ON (name) id, name, abbreviation, description, created_at, updated_at
FROM contents
ORDER BY name, created_at
ON CONFLICT (id) DO NOTHING;

-- Dropar tabela antiga e renomear
DROP TABLE IF EXISTS contents CASCADE;
ALTER TABLE contents_new RENAME TO contents;

-- Recriar trigger
CREATE TRIGGER update_contents_updated_at
BEFORE UPDATE ON contents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. REMOVER tenant_id de STAGES (fazer backup primeiro)
-- Criar nova tabela sem tenant_id
CREATE TABLE IF NOT EXISTS stages_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    content_name VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Copiar dados únicos (sem duplicatas por tenant)
INSERT INTO stages_new (id, name, content_name, description, created_at, updated_at)
SELECT DISTINCT ON (name) id, name, content_name, description, created_at, updated_at
FROM stages
ORDER BY name, created_at
ON CONFLICT (id) DO NOTHING;

-- Dropar tabela antiga e renomear
DROP TABLE IF EXISTS stages CASCADE;
ALTER TABLE stages_new RENAME TO stages;

-- Recriar trigger
CREATE TRIGGER update_stages_updated_at
BEFORE UPDATE ON stages
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. RECRIAR foreign keys em activity_titles
-- A tabela activity_titles mantém tenant_id e content_id
ALTER TABLE activity_titles
DROP CONSTRAINT IF EXISTS activity_titles_content_id_fkey;

ALTER TABLE activity_titles
ADD CONSTRAINT activity_titles_content_id_fkey
FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE SET NULL;

-- 4. RECRIAR tabela training_activity_contents
DROP TABLE IF EXISTS training_activity_contents CASCADE;

CREATE TABLE training_activity_contents (
    activity_id UUID REFERENCES training_activities(id) ON DELETE CASCADE,
    content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
    PRIMARY KEY (activity_id, content_id)
);

-- Verificar
SELECT 'Tabela contents (sem tenant_id):' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'contents'
ORDER BY ordinal_position;

SELECT 'Tabela stages (sem tenant_id):' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'stages'
ORDER BY ordinal_position;

SELECT 'Tabela activity_titles (COM tenant_id):' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'activity_titles'
ORDER BY ordinal_position;
