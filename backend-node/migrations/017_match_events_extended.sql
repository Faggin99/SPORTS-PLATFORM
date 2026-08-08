-- Extensão de match_events pra suportar assistências e substituições.
-- Semântica de `secondary_player_id` depende do `event_type`:
--   goal_scored   → player_id = quem fez o gol;     secondary_player_id = assistente
--   substitution  → player_id = quem entrou;         secondary_player_id = quem saiu
--   demais        → não usa secondary_player_id

BEGIN;

ALTER TABLE match_events
  ADD COLUMN IF NOT EXISTS secondary_player_id UUID REFERENCES athletes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_match_events_secondary_player
  ON match_events(secondary_player_id)
  WHERE secondary_player_id IS NOT NULL;

COMMIT;
