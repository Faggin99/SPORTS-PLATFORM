-- Histórico de lesões por atleta.
-- Lesão ativa = resolved_at IS NULL. O status `injured` em athletes vira derivado disso.

BEGIN;

CREATE TABLE IF NOT EXISTS athlete_injuries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  athlete_id      UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  started_at      DATE NOT NULL DEFAULT CURRENT_DATE,
  injury_type     VARCHAR(120) NOT NULL,
  body_part       VARCHAR(60),
  severity        VARCHAR(20)  DEFAULT 'medium', -- 'light' | 'medium' | 'severe'
  expected_return DATE,
  resolved_at     DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_athlete_injuries_athlete
  ON athlete_injuries(athlete_id);
CREATE INDEX IF NOT EXISTS idx_athlete_injuries_tenant_active
  ON athlete_injuries(tenant_id)
  WHERE resolved_at IS NULL;

COMMIT;
