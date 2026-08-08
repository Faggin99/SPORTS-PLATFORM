-- 035_athlete_personal_data.sql
-- Dados adicionais do atleta usados em apresentações tipo "Plantel" e cards individuais.

BEGIN;

ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS birthdate DATE,
  ADD COLUMN IF NOT EXISTS height_cm INTEGER,                       -- altura em cm (ex: 180)
  ADD COLUMN IF NOT EXISTS preferred_foot VARCHAR(8),                -- 'right' | 'left' | 'both'
  ADD COLUMN IF NOT EXISTS previous_club VARCHAR(120);

-- Constraint sanity-check no preferred_foot (sem rejeitar NULL)
ALTER TABLE athletes
  DROP CONSTRAINT IF EXISTS athletes_preferred_foot_check;
ALTER TABLE athletes
  ADD CONSTRAINT athletes_preferred_foot_check
    CHECK (preferred_foot IS NULL OR preferred_foot IN ('right', 'left', 'both'));

COMMIT;
