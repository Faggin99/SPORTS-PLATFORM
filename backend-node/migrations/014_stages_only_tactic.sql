-- Subconteúdos (stages) só fazem sentido em Conteúdos da dimensão tática.
-- Trigger garante invariante no DB: stages.content_id sempre aponta pra contents.dimension='tatico'.

BEGIN;

-- Limpa eventuais stages órfãs (em contents não-táticos) — defensive.
DELETE FROM stages
WHERE content_id IN (SELECT id FROM contents WHERE dimension <> 'tatico');

CREATE OR REPLACE FUNCTION enforce_stage_tatic_dimension()
RETURNS TRIGGER AS $$
DECLARE
  dim VARCHAR(20);
BEGIN
  SELECT dimension INTO dim FROM contents WHERE id = NEW.content_id;
  IF dim IS NULL THEN
    RAISE EXCEPTION 'Conteúdo % não encontrado', NEW.content_id;
  END IF;
  IF dim <> 'tatico' THEN
    RAISE EXCEPTION 'Subconteúdos só existem em conteúdos táticos (recebido dimension=%)', dim
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stages_tatic_only ON stages;
CREATE TRIGGER trg_stages_tatic_only
  BEFORE INSERT OR UPDATE OF content_id ON stages
  FOR EACH ROW EXECUTE FUNCTION enforce_stage_tatic_dimension();

COMMIT;
