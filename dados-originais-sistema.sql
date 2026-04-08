-- ========================================
-- DADOS ORIGINAIS DO SISTEMA (LOCALHOST)
-- ========================================
-- Conteúdos e Etapas são dados PADRÃO do sistema
-- Não pertencem a nenhum tenant específico

-- ========================================
-- 1. LIMPAR DADOS ANTIGOS
-- ========================================
TRUNCATE TABLE training_activity_contents CASCADE;
TRUNCATE TABLE training_activity_stages CASCADE;
TRUNCATE TABLE activity_titles CASCADE;
TRUNCATE TABLE stages CASCADE;
TRUNCATE TABLE contents CASCADE;

-- ========================================
-- 2. CONTEÚDOS (8 conteúdos padrão)
-- ========================================
INSERT INTO contents (id, name, abbreviation, description) VALUES
('11111111-1111-1111-1111-111111111111'::uuid, 'Bola Parada Ofensiva', 'BPO', 'Situações de bola parada ofensiva'),
('22222222-2222-2222-2222-222222222222'::uuid, 'Bola Parada Defensiva', 'BPD', 'Situações de bola parada defensiva'),
('33333333-3333-3333-3333-333333333333'::uuid, 'Transição Ofensiva', 'TO', 'Transição do estado defensivo para ofensivo'),
('44444444-4444-4444-4444-444444444444'::uuid, 'Transição Defensiva', 'TD', 'Transição do estado ofensivo para defensivo'),
('55555555-5555-5555-5555-555555555555'::uuid, 'Organização Ofensiva', 'OO', 'Organização do jogo ofensivo'),
('66666666-6666-6666-6666-666666666666'::uuid, 'Organização Defensiva', 'OD', 'Organização do jogo defensivo'),
('77777777-7777-7777-7777-777777777777'::uuid, 'Físico', 'FIS', 'Preparação física e condicionamento'),
('88888888-8888-8888-8888-888888888888'::uuid, 'Todos', 'TOD', 'Conteúdo que engloba todos os aspectos do jogo')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    abbreviation = EXCLUDED.abbreviation,
    description = EXCLUDED.description;

-- ========================================
-- 3. ETAPAS (22 etapas organizadas por conteúdo)
-- ========================================

-- Organização Ofensiva (4 etapas)
INSERT INTO stages (id, name, content_name, description) VALUES
('a1111111-1111-1111-1111-111111111111'::uuid, '1ª fase de construção', 'Organização Ofensiva', 'Primeira fase de construção'),
('a2222222-2222-2222-2222-222222222222'::uuid, '2ª fase de construção', 'Organização Ofensiva', 'Segunda fase de construção'),
('a3333333-3333-3333-3333-333333333333'::uuid, 'Criação', 'Organização Ofensiva', 'Fase de criação'),
('a4444444-4444-4444-4444-444444444444'::uuid, 'Finalização', 'Organização Ofensiva', 'Fase de finalização'),

-- Organização Defensiva (3 etapas)
('a5555555-5555-5555-5555-555555555555'::uuid, 'Bloco alto', 'Organização Defensiva', 'Defesa em bloco alto'),
('a6666666-6666-6666-6666-666666666666'::uuid, 'Bloco médio', 'Organização Defensiva', 'Defesa em bloco médio'),
('a7777777-7777-7777-7777-777777777777'::uuid, 'Bloco baixo', 'Organização Defensiva', 'Defesa em bloco baixo'),

-- Transição Ofensiva (3 etapas)
('a8888888-8888-8888-8888-888888888888'::uuid, 'Segurança', 'Transição Ofensiva', 'Segurança na transição ofensiva'),
('a9999999-9999-9999-9999-999999999999'::uuid, 'Gestão', 'Transição Ofensiva', 'Gestão da transição ofensiva'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Vertical', 'Transição Ofensiva', 'Verticalização na transição ofensiva'),

-- Transição Defensiva (2 etapas)
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'Pós perca', 'Transição Defensiva', 'Ação imediata após perda da bola'),
('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'Temporização', 'Transição Defensiva', 'Temporização na transição defensiva'),

-- Bola Parada Ofensiva (5 etapas)
('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, 'Falta lateral', 'Bola Parada Ofensiva', 'Falta lateral ofensiva'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid, 'Falta frontal', 'Bola Parada Ofensiva', 'Falta frontal ofensiva'),
('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, 'Arremesso lateral', 'Bola Parada Ofensiva', 'Arremesso lateral ofensivo'),
('10101010-1010-1010-1010-101010101010'::uuid, 'Pênalti', 'Bola Parada Ofensiva', 'Pênalti ofensivo'),
('20202020-2020-2020-2020-202020202020'::uuid, 'Escanteio', 'Bola Parada Ofensiva', 'Escanteio ofensivo'),

-- Bola Parada Defensiva (5 etapas)
('30303030-3030-3030-3030-303030303030'::uuid, 'Falta lateral', 'Bola Parada Defensiva', 'Falta lateral defensiva'),
('40404040-4040-4040-4040-404040404040'::uuid, 'Falta frontal', 'Bola Parada Defensiva', 'Falta frontal defensiva'),
('50505050-5050-5050-5050-505050505050'::uuid, 'Arremesso lateral', 'Bola Parada Defensiva', 'Arremesso lateral defensivo'),
('60606060-6060-6060-6060-606060606060'::uuid, 'Pênalti', 'Bola Parada Defensiva', 'Pênalti defensivo'),
('70707070-7070-7070-7070-707070707070'::uuid, 'Escanteio', 'Bola Parada Defensiva', 'Escanteio defensivo')

ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    content_name = EXCLUDED.content_name,
    description = EXCLUDED.description;

-- ========================================
-- 4. VERIFICAR DADOS
-- ========================================
SELECT '✅ CONTEÚDOS:' as tipo, COUNT(*) as total FROM contents;
SELECT name, abbreviation FROM contents ORDER BY name;

SELECT '' as separador;

SELECT '✅ ETAPAS:' as tipo, COUNT(*) as total FROM stages;
SELECT content_name, COUNT(*) as qtd_etapas FROM stages GROUP BY content_name ORDER BY content_name;

SELECT '' as separador;

-- Mostrar todas as etapas agrupadas por conteúdo
SELECT
    content_name as "Conteúdo",
    STRING_AGG(name, ', ' ORDER BY name) as "Etapas"
FROM stages
GROUP BY content_name
ORDER BY content_name;
