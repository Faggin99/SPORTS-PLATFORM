-- Migration 048 (F1, 15/10/2026): fim do Free, plano de entrada com convidado, só leitura.
-- SOMENTE adições compatíveis (ADD COLUMN IF NOT EXISTS / merge de features em JSONB).
-- Não desativa o Free nem mexe em assinaturas: isso é o script scripts/virada-f1.js.

BEGIN;

-- 1) Cortesia permanente (conta com tudo liberado, sem assinatura, nunca expira).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS cortesia_permanente BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cortesia_motivo     TEXT;

-- 2) Dados da assinatura: nome da conta (time/clube/escolinha) já é workspaces.name;
--    responsável legal/financeiro com CPF ou CNPJ (só dígitos).
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS responsavel_nome      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS responsavel_documento VARCHAR(14),
  ADD COLUMN IF NOT EXISTS responsavel_tipo      VARCHAR(4),   -- 'cpf' | 'cnpj'
  ADD COLUMN IF NOT EXISTS responsavel_em        TIMESTAMPTZ;

-- 3) Equipe por plano: entrada = dono + 1 convidado; Clube = como hoje (5).
UPDATE plans SET features = COALESCE(features, '{}'::jsonb) || '{"equipe": true, "max_convidados": 1}'::jsonb,
                 updated_at = NOW()
 WHERE id IN ('pro', 'pro_annual');
UPDATE plans SET features = COALESCE(features, '{}'::jsonb) || '{"equipe": true, "max_convidados": 5}'::jsonb,
                 updated_at = NOW()
 WHERE id IN ('clube', 'clube_annual');
UPDATE plans SET features = COALESCE(features, '{}'::jsonb) || '{"equipe": true, "max_convidados": -1}'::jsonb,
                 updated_at = NOW()
 WHERE id = 'lifetime';

COMMIT;
