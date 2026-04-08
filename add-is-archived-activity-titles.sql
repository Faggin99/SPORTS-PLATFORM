-- ============================================================
-- ADICIONAR COLUNA is_archived À TABELA activity_titles
-- ============================================================
-- Esta coluna permite "soft delete" de títulos de atividades,
-- preservando o histórico de treinos que usaram esses títulos.

-- 1. Adicionar coluna is_archived (default false)
ALTER TABLE activity_titles
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- 2. Criar índice para performance nas consultas filtrando por is_archived
CREATE INDEX IF NOT EXISTS idx_activity_titles_archived
ON activity_titles(tenant_id, is_archived);

-- 3. Verificar resultado
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'activity_titles'
AND column_name = 'is_archived';
