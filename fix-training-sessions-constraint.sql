-- ============================================================
-- FIX: training_sessions unique constraint para suportar múltiplos clubes
-- ============================================================
-- O problema: a constraint atual (tenant_id, date) impede criar sessões
-- para datas iguais em clubes diferentes do mesmo tenant.

-- 1. Primeiro, verificar qual constraint existe
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'training_sessions'::regclass
AND contype = 'u';

-- 2. Remover a constraint antiga (tenant_id, date)
ALTER TABLE training_sessions
DROP CONSTRAINT IF EXISTS training_sessions_tenant_id_date_key;

-- 3. Adicionar coluna club_id se não existir
ALTER TABLE training_sessions
ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id);

-- 4. Atualizar sessões existentes com o club_id do microcycle
UPDATE training_sessions ts
SET club_id = tm.club_id
FROM training_microcycles tm
WHERE ts.microcycle_id = tm.id
AND ts.club_id IS NULL;

-- 5. Criar nova constraint que inclui microcycle_id (cada microcycle é de um clube específico)
-- Isso garante unicidade por data DENTRO de cada microciclo
ALTER TABLE training_sessions
ADD CONSTRAINT training_sessions_microcycle_date_unique UNIQUE (microcycle_id, date);

-- 6. Verificar resultado
SELECT
  'training_sessions constraints:' as info,
  conname,
  pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'training_sessions'::regclass;

-- 7. Verificar se há sessões sem club_id
SELECT COUNT(*) as sessions_without_club
FROM training_sessions
WHERE club_id IS NULL;
