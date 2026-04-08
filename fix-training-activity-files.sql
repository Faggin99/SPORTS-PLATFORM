-- ============================================================
-- CORRIGIR TABELA training_activity_files
-- ============================================================

-- 1. Verificar se a tabela existe e quais colunas tem
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'training_activity_files'
ORDER BY ordinal_position;

-- 2. Se a tabela não existir ou estiver incorreta, recriar
DROP TABLE IF EXISTS training_activity_files;

CREATE TABLE training_activity_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  mime_type VARCHAR(100),
  file_size BIGINT,
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilitar RLS
ALTER TABLE training_activity_files ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas
DROP POLICY IF EXISTS "Users can view their own files" ON training_activity_files;
CREATE POLICY "Users can view their own files" ON training_activity_files
  FOR SELECT USING (tenant_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own files" ON training_activity_files;
CREATE POLICY "Users can insert their own files" ON training_activity_files
  FOR INSERT WITH CHECK (tenant_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own files" ON training_activity_files;
CREATE POLICY "Users can delete their own files" ON training_activity_files
  FOR DELETE USING (tenant_id = auth.uid());

-- 5. Verificar resultado
SELECT
  'Tabela criada/atualizada com sucesso!' as status,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'training_activity_files'
ORDER BY ordinal_position;
