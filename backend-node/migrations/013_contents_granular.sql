-- Reformula Conteúdos pra serem granulares (não agregadores).
-- Antes: 4 contents (Tático/Técnico/Físico/Mental) + 19 stages globais
-- Depois: 19 contents granulares com dimension setado + stages vazio (custom)
-- Dimensão volta a ser um atributo do conteúdo (já existia), usado pra agrupar visualmente.

BEGIN;

-- 1) Limpa estado anterior (em staging, training_activities e activity_titles estão vazios)
DELETE FROM training_activity_stages;
DELETE FROM training_activity_contents;
DELETE FROM stages WHERE tenant_id IS NULL;
DELETE FROM contents WHERE tenant_id IS NULL;

-- 2) Seed dos 19 conteúdos granulares (cada um com sua dimensão)
INSERT INTO contents (id, tenant_id, name, abbreviation, dimension) VALUES
  -- Táticos: momentos do jogo
  (gen_random_uuid(), NULL, 'Organização Ofensiva',   'OO',  'tatico'),
  (gen_random_uuid(), NULL, 'Organização Defensiva',  'OD',  'tatico'),
  (gen_random_uuid(), NULL, 'Transição Ofensiva',     'TO',  'tatico'),
  (gen_random_uuid(), NULL, 'Transição Defensiva',    'TD',  'tatico'),
  (gen_random_uuid(), NULL, 'Bola Parada Ofensiva',   'BPO', 'tatico'),
  (gen_random_uuid(), NULL, 'Bola Parada Defensiva',  'BPD', 'tatico'),

  -- Físicos: capacidades
  (gen_random_uuid(), NULL, 'Aeróbio',          'AER',  'fisico'),
  (gen_random_uuid(), NULL, 'Anaer. Láctico',   'ANL',  'fisico'),
  (gen_random_uuid(), NULL, 'Anaer. Aláctico',  'ANA',  'fisico'),
  (gen_random_uuid(), NULL, 'Força',            'FOR',  'fisico'),
  (gen_random_uuid(), NULL, 'Velocidade',       'VEL',  'fisico'),
  (gen_random_uuid(), NULL, 'Coordenação',      'COO',  'fisico'),

  -- Técnicos: gestos
  (gen_random_uuid(), NULL, 'Passe',       'PAS', 'tecnico'),
  (gen_random_uuid(), NULL, 'Recepção',    'REC', 'tecnico'),
  (gen_random_uuid(), NULL, 'Drible',      'DRI', 'tecnico'),
  (gen_random_uuid(), NULL, 'Condução',    'CON', 'tecnico'),
  (gen_random_uuid(), NULL, 'Cabeceio',    'CAB', 'tecnico'),
  (gen_random_uuid(), NULL, 'Finalização', 'FIN', 'tecnico'),

  -- Mental
  (gen_random_uuid(), NULL, 'Recreativo', 'REC2', 'mental');

-- 3) Subconteúdos ficam vazios globalmente (treinador adiciona detalhamentos próprios se quiser).
-- A coluna content_id em stages continua referenciando contents — agora aponta pros granulares.

COMMIT;
