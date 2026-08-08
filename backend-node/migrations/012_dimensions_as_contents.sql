-- Reforma do modelo de Conteúdos:
-- Conteúdos passam a ser as 4 grandes Dimensões (Tático, Técnico, Físico, Mental).
-- Os antigos contents (OO/OD/etc, capacidades técnicas/físicas, recreativo) viram Subconteúdos.
-- Atividade-template tem 1 conteúdo (FK em activity_titles.content_id, já existente).
-- Instância no treino aceita 1+ subconteúdos (training_activity_stages) e 1 content (snapshot).

BEGIN;

-- 1) Adiciona dimensão como atributo do conteúdo
ALTER TABLE contents
  ADD COLUMN IF NOT EXISTS dimension VARCHAR(20);

-- 2) Limpa o estado global anterior (em staging não há dados de produção;
--    activity_titles está vazio, training_activities está vazio).
DELETE FROM training_activity_stages;
DELETE FROM training_activity_contents;
DELETE FROM stages WHERE tenant_id IS NULL;
DELETE FROM contents WHERE tenant_id IS NULL;

-- 3) Seed dos 4 conteúdos globais (= dimensões)
INSERT INTO contents (id, tenant_id, name, abbreviation, dimension)
VALUES
  (gen_random_uuid(), NULL, 'Tático',  'TAT', 'tatico'),
  (gen_random_uuid(), NULL, 'Técnico', 'TEC', 'tecnico'),
  (gen_random_uuid(), NULL, 'Físico',  'FIS', 'fisico'),
  (gen_random_uuid(), NULL, 'Mental',  'MEN', 'mental');

-- 4) Seed dos subconteúdos por conteúdo
WITH src(content_name, sub_name, ord) AS (VALUES
  -- Tático: momentos do jogo
  ('Tático', 'Organização Ofensiva',   1),
  ('Tático', 'Organização Defensiva',  2),
  ('Tático', 'Transição Ofensiva',     3),
  ('Tático', 'Transição Defensiva',    4),
  ('Tático', 'Bola Parada Ofensiva',   5),
  ('Tático', 'Bola Parada Defensiva',  6),

  -- Técnico: gestos técnicos
  ('Técnico', 'Passe',       1),
  ('Técnico', 'Recepção',    2),
  ('Técnico', 'Drible',      3),
  ('Técnico', 'Condução',    4),
  ('Técnico', 'Cabeceio',    5),
  ('Técnico', 'Finalização', 6),

  -- Físico: capacidades
  ('Físico', 'Aeróbio',          1),
  ('Físico', 'Anaer. Láctico',   2),
  ('Físico', 'Anaer. Aláctico',  3),
  ('Físico', 'Força',            4),
  ('Físico', 'Velocidade',       5),
  ('Físico', 'Coordenação',      6),

  -- Mental: aspectos psicossociais (Recreativo encaixa aqui por enquanto)
  ('Mental', 'Recreativo', 1)
)
INSERT INTO stages (tenant_id, content_id, name, display_order)
SELECT NULL, c.id, s.sub_name, s.ord
FROM src s
JOIN contents c ON c.name = s.content_name AND c.tenant_id IS NULL;

-- 5) Snapshot do conteúdo na atividade-instância: garante 1 content por activity
--    (training_activity_contents passa a ter UNIQUE em activity_id).
--    Como já está vazio em staging, é seguro adicionar a constraint agora.
ALTER TABLE training_activity_contents
  ADD CONSTRAINT training_activity_contents_unique_activity UNIQUE (activity_id);

-- 6) Marca dimension como NOT NULL nos globais e adiciona índice
ALTER TABLE contents
  ALTER COLUMN dimension SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contents_dimension ON contents (dimension);

COMMIT;
