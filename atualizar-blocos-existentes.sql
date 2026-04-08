-- ========================================
-- ATUALIZAR BLOCOS EXISTENTES PARA NOMES CORRETOS
-- ========================================
-- Renomear blocos que já foram criados com nomes antigos

-- Atualizar blocos na ordem correta
UPDATE training_activity_blocks SET name = 'Aquecimento' WHERE "order" = 1;
UPDATE training_activity_blocks SET name = 'Preparatório' WHERE "order" = 2;
UPDATE training_activity_blocks SET name = 'Atividade 1' WHERE "order" = 3;
UPDATE training_activity_blocks SET name = 'Atividade 2' WHERE "order" = 4;
UPDATE training_activity_blocks SET name = 'Atividade 3' WHERE "order" = 5;
UPDATE training_activity_blocks SET name = 'Complementos' WHERE "order" = 6;

-- Verificar
SELECT
    "order" as ordem,
    name as nome_bloco,
    COUNT(*) as quantidade
FROM training_activity_blocks
GROUP BY "order", name
ORDER BY "order";

SELECT '✅ Blocos atualizados com sucesso!' as status;
