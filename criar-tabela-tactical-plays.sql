-- Tabela para armazenar jogadas/táticas do quadro tático
CREATE TABLE IF NOT EXISTS tactical_plays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES auth.users(id),
  club_id UUID REFERENCES clubs(id),
  name TEXT NOT NULL,
  description TEXT,
  field_type TEXT NOT NULL CHECK (field_type IN ('football_11', 'futsal')),
  team_a_color TEXT NOT NULL DEFAULT '#3b82f6',
  team_b_color TEXT NOT NULL DEFAULT '#ef4444',
  keyframes JSONB NOT NULL DEFAULT '[]',
  animation_speed NUMERIC DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar Row Level Security
ALTER TABLE tactical_plays ENABLE ROW LEVEL SECURITY;

-- Política: usuários podem gerenciar suas próprias jogadas
CREATE POLICY "Users can manage own plays" ON tactical_plays
  FOR ALL
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tactical_plays_tenant ON tactical_plays(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tactical_plays_club ON tactical_plays(club_id);
CREATE INDEX IF NOT EXISTS idx_tactical_plays_updated ON tactical_plays(updated_at DESC);
