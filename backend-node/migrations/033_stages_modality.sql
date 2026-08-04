-- 033_stages_modality.sql
-- Adiciona coluna `excluded_modalities` em stages — array de modalidades onde NÃO aparece.
-- NULL ou vazio = aparece em todas. ['futsal'] = não aparece em futsal.
--
-- Reorganiza os submomentos de "Bola Parada Ofensiva/Defensiva":
--   Falta Frontal, Falta Lateral → exclui em futsal (futebol-only)
--   Escanteio, Lateral, Pênalti  → universais (não mexer)
--   + Tiro Livre (futsal-only)
--   + Falta Acumulada (futsal-only)
--   + Shootout (fut7-only)
--
-- Idempotente: NOT EXISTS nos INSERTs.

BEGIN;

ALTER TABLE stages ADD COLUMN IF NOT EXISTS excluded_modalities VARCHAR(20)[];

-- 1. Falta Frontal e Falta Lateral: futebol-only (excluir em futsal)
UPDATE stages
   SET excluded_modalities = ARRAY['futsal']::VARCHAR(20)[]
 WHERE workspace_id IS NULL
   AND name IN ('Falta Frontal', 'Falta Lateral')
   AND content_id IN (
     SELECT id FROM contents
      WHERE workspace_id IS NULL
        AND name IN ('Bola Parada Ofensiva', 'Bola Parada Defensiva')
   );

-- 2. Tiro Livre — futsal-only (excluir em F11 e F7)
INSERT INTO stages (workspace_id, content_id, name, description, display_order, excluded_modalities, created_at, updated_at)
SELECT NULL, c.id, 'Tiro Livre',
       'Tiro livre direto (10m) após falta acumulada — exclusivo do futsal',
       6, ARRAY['football_11', 'football_7']::VARCHAR(20)[], NOW(), NOW()
  FROM contents c
 WHERE c.workspace_id IS NULL
   AND c.name IN ('Bola Parada Ofensiva', 'Bola Parada Defensiva')
   AND NOT EXISTS (
     SELECT 1 FROM stages s
      WHERE s.workspace_id IS NULL AND s.content_id = c.id AND s.name = 'Tiro Livre'
   );

-- 3. Falta Acumulada — futsal-only (excluir em F11 e F7)
INSERT INTO stages (workspace_id, content_id, name, description, display_order, excluded_modalities, created_at, updated_at)
SELECT NULL, c.id, 'Falta Acumulada',
       'A partir da 6ª falta da equipe — tiro livre direto sem barreira (futsal)',
       7, ARRAY['football_11', 'football_7']::VARCHAR(20)[], NOW(), NOW()
  FROM contents c
 WHERE c.workspace_id IS NULL
   AND c.name IN ('Bola Parada Ofensiva', 'Bola Parada Defensiva')
   AND NOT EXISTS (
     SELECT 1 FROM stages s
      WHERE s.workspace_id IS NULL AND s.content_id = c.id AND s.name = 'Falta Acumulada'
   );

-- 4. Shootout — fut7-only (excluir em F11 e futsal)
INSERT INTO stages (workspace_id, content_id, name, description, display_order, excluded_modalities, created_at, updated_at)
SELECT NULL, c.id, 'Shootout',
       'Tiro livre direto sem barreira — característico do Futebol 7',
       8, ARRAY['football_11', 'futsal']::VARCHAR(20)[], NOW(), NOW()
  FROM contents c
 WHERE c.workspace_id IS NULL
   AND c.name IN ('Bola Parada Ofensiva', 'Bola Parada Defensiva')
   AND NOT EXISTS (
     SELECT 1 FROM stages s
      WHERE s.workspace_id IS NULL AND s.content_id = c.id AND s.name = 'Shootout'
   );

COMMIT;
