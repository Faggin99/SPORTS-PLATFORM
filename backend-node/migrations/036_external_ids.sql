-- Migration 036: Preparar integração com APIs externas de dados de futebol
-- (API-Football / TheSportsDB). NÃO ATIVA a integração — apenas adiciona campos
-- de rastreamento para que os jogos importados saibam quem é a origem.
--
-- Ativação: setar API_FOOTBALL_KEY no .env e reiniciar a API. Os endpoints
-- /api/external/* passam de 503 para operacionais sem mais nada.

BEGIN;

-- Campos na tabela de campeonatos: liga + temporada do provedor externo.
ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS external_provider VARCHAR(32),
  ADD COLUMN IF NOT EXISTS external_league_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS external_season VARCHAR(16),
  ADD COLUMN IF NOT EXISTS external_team_id VARCHAR(64);

-- Campos nos jogos individuais:
-- external_event_id: ID do fixture na API externa (pra dedup nos syncs)
-- external_synced_at: última vez que o cron atualizou esse jogo
-- external_payload: JSON bruto do provedor, pra reprocessar sem outra call
-- external_locked_at: marcado quando coach edita manualmente — cron passa a ignorar
ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS external_event_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS external_provider VARCHAR(32),
  ADD COLUMN IF NOT EXISTS external_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS external_payload JSONB,
  ADD COLUMN IF NOT EXISTS external_locked_at TIMESTAMPTZ;

-- Dedup: dentro de um workspace, um fixture do mesmo provedor só pode existir uma vez.
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_external_unique
  ON training_sessions (workspace_id, external_provider, external_event_id)
  WHERE external_event_id IS NOT NULL;

-- Lookup do cron por provider+league pra varrer jogos a sincronizar.
CREATE INDEX IF NOT EXISTS idx_competitions_external
  ON competitions (external_provider, external_league_id)
  WHERE external_provider IS NOT NULL;

COMMIT;
