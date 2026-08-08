-- 032_club_modality.sql
-- Adiciona modalidade esportiva ao clube: football_11 | football_7 | futsal.
-- Clubes existentes assumem 'football_11' (mantém comportamento atual).

BEGIN;

ALTER TABLE clubs
  ADD COLUMN IF NOT EXISTS modality VARCHAR(20) DEFAULT 'football_11'
    CHECK (modality IN ('football_11', 'football_7', 'futsal'));

-- Backfill explícito caso a default não tenha pegado (idempotente)
UPDATE clubs SET modality = 'football_11' WHERE modality IS NULL;

COMMIT;
