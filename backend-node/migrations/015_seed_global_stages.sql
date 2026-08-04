-- Seed de submomentos globais (tenant_id IS NULL) para os 6 conteúdos táticos.
-- Estrutura definida com o usuário em 2026-05-21 (ver memory tactiplan-submomentos).
-- Idempotente via WHERE NOT EXISTS (UNIQUE da tabela usa expressão COALESCE, não casa
-- com ON CONFLICT direto).

BEGIN;

INSERT INTO stages (id, tenant_id, content_id, name, display_order)
SELECT gen_random_uuid(), NULL, c.id, v.name, v.ord
FROM contents c
CROSS JOIN (VALUES
  ('Organização Ofensiva',  '1ª Fase de Construção',     1),
  ('Organização Ofensiva',  '2ª Fase de Construção',     2),
  ('Organização Ofensiva',  'Criação',                   3),
  ('Organização Ofensiva',  'Finalização',               4),
  ('Organização Defensiva', 'Bloco Alto',                1),
  ('Organização Defensiva', 'Bloco Médio',               2),
  ('Organização Defensiva', 'Bloco Baixo',               3),
  ('Transição Ofensiva',    'Transição de gestão',       1),
  ('Transição Ofensiva',    'Transição em segurança',    2),
  ('Transição Ofensiva',    'Transição de espaço',       3),
  ('Transição Ofensiva',    'Transição de profundidade', 4),
  ('Transição Defensiva',   'Transição de contenção',    1),
  ('Transição Defensiva',   'Transição de pressão',      2),
  ('Transição Defensiva',   'Transição de organização',  3),
  ('Transição Defensiva',   'Transição em SOS',          4),
  ('Bola Parada Ofensiva',  'Falta',                     1),
  ('Bola Parada Ofensiva',  'Escanteio',                 2),
  ('Bola Parada Ofensiva',  'Lateral',                   3),
  ('Bola Parada Ofensiva',  'Pênalti',                   4),
  ('Bola Parada Defensiva', 'Falta',                     1),
  ('Bola Parada Defensiva', 'Escanteio',                 2),
  ('Bola Parada Defensiva', 'Lateral',                   3),
  ('Bola Parada Defensiva', 'Pênalti',                   4)
) AS v(content_name, name, ord)
WHERE c.tenant_id IS NULL
  AND c.name = v.content_name
  AND NOT EXISTS (
    SELECT 1 FROM stages s
    WHERE s.tenant_id IS NULL
      AND s.content_id = c.id
      AND s.name = v.name
  );

-- Re-aponta atividades que apontam pra submomentos CUSTOMIZADOS duplicados
-- (mesmo nome do global) pra usarem o global, e remove os customizados.
WITH dupes AS (
  SELECT custom.id AS custom_id, glob.id AS global_id
  FROM stages custom
  JOIN stages glob
    ON glob.tenant_id IS NULL
   AND glob.content_id = custom.content_id
   AND glob.name = custom.name
  WHERE custom.tenant_id IS NOT NULL
)
UPDATE training_activity_stages tas
SET stage_id = dupes.global_id
FROM dupes
WHERE tas.stage_id = dupes.custom_id;

DELETE FROM stages custom
USING stages glob
WHERE custom.tenant_id IS NOT NULL
  AND glob.tenant_id IS NULL
  AND glob.content_id = custom.content_id
  AND glob.name = custom.name;

COMMIT;
