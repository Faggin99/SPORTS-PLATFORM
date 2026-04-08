-- ============================================================
-- CRIAR BUCKET PARA ARQUIVOS DE SESSÃO
-- ============================================================

-- 1. Criar bucket para arquivos de sessão
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'session-files',
  'session-files',
  true,
  52428800, -- 50MB max
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Criar políticas de acesso

-- Política para SELECT (visualizar) - bucket é público, então todos podem ver
DROP POLICY IF EXISTS "Users can view their own session files" ON storage.objects;
CREATE POLICY "Users can view their own session files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'session-files'
);

-- Política para INSERT (upload)
DROP POLICY IF EXISTS "Users can upload session files" ON storage.objects;
CREATE POLICY "Users can upload session files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'session-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para DELETE
DROP POLICY IF EXISTS "Users can delete their own session files" ON storage.objects;
CREATE POLICY "Users can delete their own session files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'session-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. Verificar se a tabela training_activity_files existe com as colunas certas
-- Se não existir, criar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'training_activity_files'
  ) THEN
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

    -- RLS
    ALTER TABLE training_activity_files ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view their own files" ON training_activity_files
      FOR SELECT USING (tenant_id = auth.uid());

    CREATE POLICY "Users can insert their own files" ON training_activity_files
      FOR INSERT WITH CHECK (tenant_id = auth.uid());

    CREATE POLICY "Users can delete their own files" ON training_activity_files
      FOR DELETE USING (tenant_id = auth.uid());

    RAISE NOTICE 'Tabela training_activity_files criada com sucesso!';
  ELSE
    RAISE NOTICE 'Tabela training_activity_files já existe.';
  END IF;
END $$;

-- 4. Verificar resultado
SELECT
  'Bucket criado' as status,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'session-files';
