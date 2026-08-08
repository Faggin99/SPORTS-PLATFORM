-- Reformula Etapas: subdivisão cadastrável por Conteúdo (momento de jogo)
-- Estrutura baseada em "Uma Ideia de Jogo" (Correia/Ribas/Silva).
-- Globais (tenant_id NULL) servem de base; treinador pode criar próprias com tenant_id.

BEGIN;

-- 1) Limpa stages legadas (Aquecimento/Parte Principal/Volta à Calma) —
--    eram fases de sessão, conceito diferente. Nenhuma atividade referencia.
DELETE FROM stages WHERE tenant_id IS NULL;

-- 2) Schema: adiciona content_id FK + display_order, remove content_name antigo
ALTER TABLE stages
  ADD COLUMN IF NOT EXISTS content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0;

ALTER TABLE stages DROP COLUMN IF EXISTS content_name;

-- 3) UNIQUE novo: mesma etapa "Falta" pode existir em BPO e BPD
DROP INDEX IF EXISTS idx_stages_unique_name_tenant;
CREATE UNIQUE INDEX idx_stages_unique_content_name_tenant
  ON stages (content_id, name, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX IF NOT EXISTS idx_stages_content ON stages (content_id);

-- 4) training_activity_stages: adiciona FK para stage (mantém stage_name por compat,
--    será removido em migration futura quando frontend novo estiver consolidado)
ALTER TABLE training_activity_stages
  ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES stages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_activity_stages_stage ON training_activity_stages (stage_id);

-- 5) Seed das etapas globais por momento de jogo
WITH src(content_name, stage_name, ord) AS (VALUES
  ('Organização Ofensiva', '1ª Fase de Construção', 1),
  ('Organização Ofensiva', '2ª Fase de Construção', 2),
  ('Organização Ofensiva', 'Criação',               3),
  ('Organização Ofensiva', 'Finalização',           4),

  ('Organização Defensiva', 'Bloco Alto',  1),
  ('Organização Defensiva', 'Bloco Médio', 2),
  ('Organização Defensiva', 'Bloco Baixo', 3),

  ('Transição Ofensiva', 'Gestão',        1),
  ('Transição Ofensiva', 'Segurança',     2),
  ('Transição Ofensiva', 'Espaço',        3),
  ('Transição Ofensiva', 'Profundidade',  4),

  ('Transição Defensiva', 'Contenção',   1),
  ('Transição Defensiva', 'Pressão',     2),
  ('Transição Defensiva', 'Organização', 3),
  ('Transição Defensiva', 'SOS',         4),

  ('Bola Parada Ofensiva', 'Falta',     1),
  ('Bola Parada Ofensiva', 'Escanteio', 2),
  ('Bola Parada Ofensiva', 'Lateral',   3),
  ('Bola Parada Ofensiva', 'Pênalti',   4),

  ('Bola Parada Defensiva', 'Falta',     1),
  ('Bola Parada Defensiva', 'Escanteio', 2),
  ('Bola Parada Defensiva', 'Lateral',   3),
  ('Bola Parada Defensiva', 'Pênalti',   4),

  ('Físico', 'Aeróbio',           1),
  ('Físico', 'Anaer. Láctico',    2),
  ('Físico', 'Anaer. Aláctico',   3),
  ('Físico', 'Força',             4),
  ('Físico', 'Velocidade',        5),
  ('Físico', 'Coordenação',       6),

  ('Técnico', 'Passe',       1),
  ('Técnico', 'Recepção',    2),
  ('Técnico', 'Drible',      3),
  ('Técnico', 'Condução',    4),
  ('Técnico', 'Cabeceio',    5),
  ('Técnico', 'Finalização', 6),

  ('Tático', 'Individual', 1),
  ('Tático', 'Setorial',   2),
  ('Tático', 'Inter',      3),
  ('Tático', 'Coletivo',   4)
)
INSERT INTO stages (tenant_id, content_id, name, display_order)
SELECT NULL, c.id, s.stage_name, s.ord
FROM src s
JOIN contents c ON c.name = s.content_name AND c.tenant_id IS NULL
ON CONFLICT DO NOTHING;

COMMIT;
