-- ========================================
-- ADICIONAR TABELAS PARA DADOS DE JOGOS
-- ========================================
-- Tabelas para armazenar jogadores convocados e eventos do jogo

-- 1. Adicionar coluna de duração do jogo na sessão
ALTER TABLE training_sessions
ADD COLUMN IF NOT EXISTS match_duration INTEGER DEFAULT 90;

COMMENT ON COLUMN training_sessions.match_duration IS 'Duração do jogo em minutos (apenas para jogos)';

-- 2. Tabela de jogadores convocados para o jogo
CREATE TABLE IF NOT EXISTS match_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
    athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'starter' CHECK (status IN ('starter', 'substitute')),
    minutes_played INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, athlete_id)
);

CREATE INDEX IF NOT EXISTS idx_match_players_session ON match_players(session_id);
CREATE INDEX IF NOT EXISTS idx_match_players_athlete ON match_players(athlete_id);
CREATE INDEX IF NOT EXISTS idx_match_players_tenant ON match_players(tenant_id);

-- 3. Tabela de eventos do jogo
CREATE TABLE IF NOT EXISTS match_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    event_type VARCHAR(30) NOT NULL CHECK (event_type IN ('goal_scored', 'goal_conceded', 'red_card')),
    team VARCHAR(20) NOT NULL CHECK (team IN ('own', 'opponent')),
    goal_type VARCHAR(30) CHECK (goal_type IN ('offensive_org', 'offensive_transition', 'free_kick', 'corner', 'penalty')),
    minute INTEGER NOT NULL,
    player_id UUID REFERENCES athletes(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_events_session ON match_events(session_id);
CREATE INDEX IF NOT EXISTS idx_match_events_tenant ON match_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_match_events_type ON match_events(event_type);

-- 4. Triggers para auto-update
DROP TRIGGER IF EXISTS update_match_players_updated_at ON match_players;
DROP TRIGGER IF EXISTS update_match_events_updated_at ON match_events;

CREATE TRIGGER update_match_players_updated_at BEFORE UPDATE ON match_players FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_match_events_updated_at BEFORE UPDATE ON match_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Row Level Security
ALTER TABLE match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;

-- Remover policies existentes se houver
DROP POLICY IF EXISTS "Users can manage match players from their tenant" ON match_players;
DROP POLICY IF EXISTS "Users can manage match events from their tenant" ON match_events;
DROP POLICY IF EXISTS "Allow all for match_players" ON match_players;
DROP POLICY IF EXISTS "Allow all for match_events" ON match_events;

-- Policies simplificadas (permite tudo para usuários autenticados)
CREATE POLICY "Allow all for match_players" ON match_players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for match_events" ON match_events FOR ALL USING (true) WITH CHECK (true);

-- Verificar criação
SELECT 'match_players' as tabela, count(*) as colunas FROM information_schema.columns WHERE table_name = 'match_players'
UNION ALL
SELECT 'match_events' as tabela, count(*) as colunas FROM information_schema.columns WHERE table_name = 'match_events';

SELECT '✅ Tabelas de jogos criadas com sucesso!' as status;
