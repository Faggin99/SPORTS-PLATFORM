-- 034_competitions.sql
-- Cadastro de campeonatos por workspace + vínculo opcional do jogo com campeonato/rodada.
-- Adiciona também 3 campos pra URLs de vídeo do jogo (full / highlights / gols).

BEGIN;

CREATE TABLE IF NOT EXISTS competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  season VARCHAR(32),                   -- "2026", "2025/26", "Sub-15 2026" — texto livre
  format VARCHAR(64),                   -- "Pontos corridos", "Mata-mata", "Grupos+playoffs", etc — texto livre
  start_date DATE,
  end_date DATE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitions_workspace ON competitions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_competitions_club      ON competitions(club_id);

-- Vínculo opcional do jogo com campeonato + rodada
ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS competition_id UUID REFERENCES competitions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS match_round VARCHAR(32),               -- "1ª RD", "Quartas", "Final", "8/10"
  ADD COLUMN IF NOT EXISTS match_location VARCHAR(16),            -- "home" | "away" — preenchido manualmente
  ADD COLUMN IF NOT EXISTS video_full_url TEXT,                   -- jogo completo (YouTube/Vimeo)
  ADD COLUMN IF NOT EXISTS video_highlights_url TEXT,             -- melhores momentos / compacto
  ADD COLUMN IF NOT EXISTS video_goals_url TEXT;                  -- só os gols

CREATE INDEX IF NOT EXISTS idx_sessions_competition ON training_sessions(competition_id);

COMMIT;
