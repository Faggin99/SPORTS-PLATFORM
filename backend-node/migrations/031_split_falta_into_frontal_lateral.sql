-- 031_split_falta_into_frontal_lateral.sql
-- Divide o submomento "Falta" em "Falta Frontal" e "Falta Lateral" nos
-- conteúdos Bola Parada Ofensiva e Bola Parada Defensiva (globais).
--
-- Estratégia:
-- 1. Renomeia "Falta" → "Falta Frontal" (mantém o id pra preservar refs caso existam)
-- 2. Insere "Falta Lateral" como novo stage com display_order 2
-- 3. Reordena os demais (Escanteio 3, Lateral Arremesso 4, Pênalti 5)
--
-- Idempotente: usa ON CONFLICT na unique (workspace_id, content_id, name).

BEGIN;

-- 1. Renomeia
UPDATE stages
   SET name = 'Falta Frontal',
       display_order = 1,
       updated_at = NOW()
 WHERE workspace_id IS NULL
   AND name = 'Falta'
   AND content_id IN (
     SELECT id FROM contents
      WHERE workspace_id IS NULL
        AND name IN ('Bola Parada Ofensiva', 'Bola Parada Defensiva')
   );

-- 2. Insere Falta Lateral (idempotente — usa NOT EXISTS pra evitar duplicar)
INSERT INTO stages (workspace_id, content_id, name, description, display_order, created_at, updated_at)
SELECT NULL, c.id, 'Falta Lateral', 'Cobrança de falta a partir da lateral do campo', 2, NOW(), NOW()
  FROM contents c
 WHERE c.workspace_id IS NULL
   AND c.name IN ('Bola Parada Ofensiva', 'Bola Parada Defensiva')
   AND NOT EXISTS (
     SELECT 1 FROM stages s
      WHERE s.workspace_id IS NULL
        AND s.content_id = c.id
        AND s.name = 'Falta Lateral'
   );

-- 3. Reordena os outros submomentos
UPDATE stages SET display_order = 3 WHERE workspace_id IS NULL AND name = 'Escanteio'
   AND content_id IN (SELECT id FROM contents WHERE workspace_id IS NULL AND name IN ('Bola Parada Ofensiva','Bola Parada Defensiva'));

UPDATE stages SET display_order = 4 WHERE workspace_id IS NULL AND name = 'Lateral'
   AND content_id IN (SELECT id FROM contents WHERE workspace_id IS NULL AND name IN ('Bola Parada Ofensiva','Bola Parada Defensiva'));

UPDATE stages SET display_order = 5 WHERE workspace_id IS NULL AND name = 'Pênalti'
   AND content_id IN (SELECT id FROM contents WHERE workspace_id IS NULL AND name IN ('Bola Parada Ofensiva','Bola Parada Defensiva'));

COMMIT;
