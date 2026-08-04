-- 027_workspace_unique_indexes.sql
-- Adiciona índices únicos em (workspace_id, ...) onde havia em (tenant_id, ...).
-- O backend novo passa a usar ON CONFLICT via workspace_id.

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS training_sessions_workspace_date_club_unique
  ON training_sessions (workspace_id, date, club_id);

CREATE INDEX IF NOT EXISTS idx_microcycles_workspace_week_club
  ON training_microcycles (workspace_id, week_identifier, club_id);

CREATE UNIQUE INDEX IF NOT EXISTS monthly_themes_workspace_club_month_unique
  ON monthly_themes (workspace_id, club_id, month);

COMMIT;
