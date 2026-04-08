-- ========================================
-- INSERIR DADOS INICIAIS PARA TESTES
-- ========================================
-- Conteúdos, Stages e Activity Titles básicos

-- 1. CONTEÚDOS (Contents)
INSERT INTO contents (id, tenant_id, name, abbreviation, description) VALUES
('11111111-1111-1111-1111-111111111111'::uuid, 1, 'Organização Ofensiva', 'Org Of', 'Princípios ofensivos organizados'),
('22222222-2222-2222-2222-222222222222'::uuid, 1, 'Organização Defensiva', 'Org Def', 'Princípios defensivos organizados'),
('33333333-3333-3333-3333-333333333333'::uuid, 1, 'Transição Ofensiva', 'Trans Of', 'Transição defesa-ataque'),
('44444444-4444-4444-4444-444444444444'::uuid, 1, 'Transição Defensiva', 'Trans Def', 'Transição ataque-defesa'),
('55555555-5555-5555-5555-555555555555'::uuid, 1, 'Bola Parada Ofensiva', 'BP Of', 'Situações de bola parada ofensivas'),
('66666666-6666-6666-6666-666666666666'::uuid, 1, 'Bola Parada Defensiva', 'BP Def', 'Situações de bola parada defensivas'),
('77777777-7777-7777-7777-777777777777'::uuid, 1, 'Físico', 'Físico', 'Preparação física'),
('88888888-8888-8888-8888-888888888888'::uuid, 1, 'Todos', 'Todos', 'Todos os conteúdos')
ON CONFLICT (id) DO NOTHING;

-- 2. STAGES (Etapas)
INSERT INTO stages (id, tenant_id, name, content_name, description) VALUES
('a1111111-1111-1111-1111-111111111111'::uuid, 1, 'Penetração', 'Organização Ofensiva', 'Penetrar na defesa adversária'),
('a2222222-2222-2222-2222-222222222222'::uuid, 1, 'Cobertura Ofensiva', 'Organização Ofensiva', 'Apoio ao portador da bola'),
('a3333333-3333-3333-3333-333333333333'::uuid, 1, 'Mobilidade', 'Organização Ofensiva', 'Movimentação sem bola'),
('a4444444-4444-4444-4444-444444444444'::uuid, 1, 'Espaço', 'Organização Ofensiva', 'Criação e ocupação de espaços'),
('a5555555-5555-5555-5555-555555555555'::uuid, 1, 'Contenção', 'Organização Defensiva', 'Frear o adversário'),
('a6666666-6666-6666-6666-666666666666'::uuid, 1, 'Cobertura Defensiva', 'Organização Defensiva', 'Apoio ao defensor'),
('a7777777-7777-7777-7777-777777777777'::uuid, 1, 'Equilíbrio', 'Organização Defensiva', 'Equilíbrio defensivo'),
('a8888888-8888-8888-8888-888888888888'::uuid, 1, 'Concentração', 'Organização Defensiva', 'Compactação defensiva')
ON CONFLICT (id) DO NOTHING;

-- 3. ACTIVITY TITLES (Temas de Atividade) - Exemplos
INSERT INTO activity_titles (id, tenant_id, content_id, title, description) VALUES
('b1111111-1111-1111-1111-111111111111'::uuid, 1, '11111111-1111-1111-1111-111111111111'::uuid, 'Posse 4x4+2', 'Jogo de posse com 2 coringas'),
('b2222222-2222-2222-2222-222222222222'::uuid, 1, '11111111-1111-1111-1111-111111111111'::uuid, 'Jogo Posicional 7x7', 'Jogo posicional em campo reduzido'),
('b3333333-3333-3333-3333-333333333333'::uuid, 1, '22222222-2222-2222-2222-222222222222'::uuid, 'Pressing Alto', 'Exercício de pressão alta'),
('b4444444-4444-4444-4444-444444444444'::uuid, 1, '33333333-3333-3333-3333-333333333333'::uuid, 'Contra-ataque 3x2', 'Situação de contra-ataque'),
('b5555555-5555-5555-5555-555555555555'::uuid, 1, '77777777-7777-7777-7777-777777777777'::uuid, 'Circuito Físico', 'Circuito de preparação física'),
('b6666666-6666-6666-6666-666666666666'::uuid, 1, '55555555-5555-5555-5555-555555555555'::uuid, 'Escanteio Ofensivo', 'Treinamento de escanteios'),
('b7777777-7777-7777-7777-777777777777'::uuid, 1, '11111111-1111-1111-1111-111111111111'::uuid, 'Jogo de Manutenção', 'Manter a posse de bola'),
('b8888888-8888-8888-8888-888888888888'::uuid, 1, '44444444-4444-4444-4444-444444444444'::uuid, 'Recuperação Rápida', 'Transição defesa imediata')
ON CONFLICT (id) DO NOTHING;

-- Verificar dados inseridos
SELECT 'Conteúdos cadastrados:' as info, COUNT(*) as total FROM contents WHERE tenant_id = 1;
SELECT 'Etapas cadastradas:' as info, COUNT(*) as total FROM stages WHERE tenant_id = 1;
SELECT 'Temas cadastrados:' as info, COUNT(*) as total FROM activity_titles WHERE tenant_id = 1;

SELECT 'Conteúdos:' as tipo, name FROM contents WHERE tenant_id = 1 ORDER BY name;
SELECT 'Etapas:' as tipo, name FROM stages WHERE tenant_id = 1 ORDER BY name;
SELECT 'Temas:' as tipo, title FROM activity_titles WHERE tenant_id = 1 ORDER BY title;
