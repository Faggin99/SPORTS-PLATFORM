-- Migration 042: alinha o schema de billing_events entre migrations 006 e 041
--
-- Contexto: migration 006 criou a tabela com colunas (type, mp_resource_id,
-- amount_cents, currency, status, raw). Migration 041 tentou CREATE TABLE
-- com colunas (event_type, payload, workspace_id) — como já existia, o
-- IF NOT EXISTS virou no-op. O código de billing.js usa o schema real (006).
-- Já admin.js:130 tenta SELECT event_type/mp_status/payload que não existem
-- (falha silenciosa dentro de try/catch).
--
-- Solução: adicionar as colunas ausentes como ALIASES/complementos:
--   - workspace_id: referência opcional (útil pra scoping multi-tenant)
--   - event_type: alias/mapeamento pra 'type'. Vou popular via trigger-like
--     ou apenas usar a mesma coluna. Simplifico: mantém apenas 'type'.
--
-- Escolha: em vez de duplicar colunas, alinho o admin.js pra usar o schema
-- real (na próxima migration de código, não aqui). O SQL apenas adiciona
-- workspace_id que é a única realmente ausente e útil.

BEGIN;

ALTER TABLE billing_events
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_billing_events_workspace
  ON billing_events (workspace_id, created_at DESC)
  WHERE workspace_id IS NOT NULL;

COMMIT;
