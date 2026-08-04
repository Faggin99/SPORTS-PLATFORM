-- 024_workspaces_schema.sql
-- Introduz o conceito de workspace (= conta = clube + assinatura) coexistindo com tenant_id.
-- Cada user vira owner de 1 workspace inicial (1 user = 1 workspace nesta migração).
-- tenant_id em todas as tabelas continua existindo como fallback durante a transição.

BEGIN;

-- 1. Tabela workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);

-- 2. Workspace members (substitui o conceito de club_members, mas com escopo por workspace)
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  invited_email TEXT,
  role VARCHAR(32) NOT NULL DEFAULT 'coach',  -- coach | assistant
  category_ids UUID[],                         -- null = todas as categorias; array = escopo limitado
  invited_by UUID REFERENCES users(id),
  invite_token VARCHAR(128) UNIQUE,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ws_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ws_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_ws_members_token ON workspace_members(invite_token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ws_members_unique_active
  ON workspace_members(workspace_id, user_id)
  WHERE user_id IS NOT NULL AND accepted_at IS NOT NULL;

-- 3. Subscriptions: workspace_id (nullable inicialmente; popula no Fase 2)
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace ON subscriptions(workspace_id);

-- 4. Adiciona workspace_id em todas as 17 tabelas de dados (nullable inicialmente)
ALTER TABLE clubs                    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE athletes                 ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE categories               ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE contents                 ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE stages                   ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE activity_titles          ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE training_microcycles     ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE training_sessions        ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE training_activities      ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE training_activity_files  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE match_players            ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE match_events             ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE tactical_plays           ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE monthly_themes           ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE athlete_injuries         ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE user_content_state       ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE user_stage_state         ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_clubs_workspace                ON clubs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_athletes_workspace             ON athletes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_categories_workspace           ON categories(workspace_id);
CREATE INDEX IF NOT EXISTS idx_contents_workspace             ON contents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_stages_workspace               ON stages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_titles_workspace      ON activity_titles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_microcycles_workspace          ON training_microcycles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sessions_workspace             ON training_sessions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activities_workspace           ON training_activities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_files_workspace                ON training_activity_files(workspace_id);
CREATE INDEX IF NOT EXISTS idx_match_players_workspace        ON match_players(workspace_id);
CREATE INDEX IF NOT EXISTS idx_match_events_workspace         ON match_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_plays_workspace                ON tactical_plays(workspace_id);
CREATE INDEX IF NOT EXISTS idx_themes_workspace               ON monthly_themes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_injuries_workspace             ON athlete_injuries(workspace_id);

COMMIT;
