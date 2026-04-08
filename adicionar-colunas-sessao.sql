-- ========================================
-- ADICIONAR COLUNAS PARA TIPO DE SESSÃO
-- ========================================
-- Permite marcar sessões como Treino, Jogo ou Descanso

-- Adicionar coluna session_type
ALTER TABLE training_sessions
ADD COLUMN IF NOT EXISTS session_type VARCHAR(20) DEFAULT 'training'
CHECK (session_type IN ('training', 'match', 'rest'));

-- Adicionar coluna opponent_name (para jogos)
ALTER TABLE training_sessions
ADD COLUMN IF NOT EXISTS opponent_name VARCHAR(255);

-- Adicionar comentário
COMMENT ON COLUMN training_sessions.session_type IS 'Tipo de sessão: training (treino), match (jogo), rest (descanso)';
COMMENT ON COLUMN training_sessions.opponent_name IS 'Nome do adversário (apenas para jogos)';

-- Verificar
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'training_sessions'
  AND column_name IN ('session_type', 'opponent_name')
ORDER BY ordinal_position;

SELECT '✅ Colunas adicionadas com sucesso!' as status;
