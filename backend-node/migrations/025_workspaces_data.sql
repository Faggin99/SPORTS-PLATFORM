-- 025_workspaces_data.sql
-- Migra dados existentes pro modelo workspace.
-- Estratégia: 1 user existente = 1 workspace (mesmo se tem múltiplos clubes, ficam todos na mesma workspace).
-- A nomeação da workspace pega o nome do primeiro clube do user, ou "Workspace de [nome]".

BEGIN;

-- 1. Cria 1 workspace por user
INSERT INTO workspaces (id, name, owner_id, created_at)
SELECT
  gen_random_uuid(),
  COALESCE(
    (SELECT c.name FROM clubs c WHERE c.tenant_id = u.id ORDER BY c.created_at ASC LIMIT 1),
    'Workspace de ' || COALESCE(u.name, u.email)
  ),
  u.id,
  COALESCE(u.created_at, NOW())
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM workspaces w WHERE w.owner_id = u.id);

-- 2. Mapa user_id → workspace_id via CTE pra popular workspace_id em todas as tabelas.
--    Como 1 user = 1 workspace agora, tenant_id de cada linha → workspace.owner_id = tenant_id.

-- Tabelas que têm tenant_id ligado a users.id
UPDATE clubs                    c SET workspace_id = w.id FROM workspaces w WHERE w.owner_id = c.tenant_id AND c.workspace_id IS NULL;
UPDATE athletes                 a SET workspace_id = w.id FROM workspaces w WHERE w.owner_id = a.tenant_id AND a.workspace_id IS NULL;
UPDATE categories               x SET workspace_id = w.id FROM workspaces w WHERE w.owner_id = x.tenant_id AND x.workspace_id IS NULL;
UPDATE contents                 x SET workspace_id = w.id FROM workspaces w WHERE w.owner_id = x.tenant_id AND x.workspace_id IS NULL;
UPDATE stages                   x SET workspace_id = w.id FROM workspaces w WHERE w.owner_id = x.tenant_id AND x.workspace_id IS NULL;
UPDATE activity_titles          x SET workspace_id = w.id FROM workspaces w WHERE w.owner_id = x.tenant_id AND x.workspace_id IS NULL;
UPDATE training_microcycles     x SET workspace_id = w.id FROM workspaces w WHERE w.owner_id = x.tenant_id AND x.workspace_id IS NULL;
UPDATE training_sessions        x SET workspace_id = w.id FROM workspaces w WHERE w.owner_id = x.tenant_id AND x.workspace_id IS NULL;
UPDATE training_activities      x SET workspace_id = w.id FROM workspaces w WHERE w.owner_id = x.tenant_id AND x.workspace_id IS NULL;
UPDATE training_activity_files  x SET workspace_id = w.id FROM workspaces w WHERE w.owner_id = x.tenant_id AND x.workspace_id IS NULL;
UPDATE match_players            x SET workspace_id = w.id FROM workspaces w WHERE w.owner_id = x.tenant_id AND x.workspace_id IS NULL;
UPDATE match_events             x SET workspace_id = w.id FROM workspaces w WHERE w.owner_id = x.tenant_id AND x.workspace_id IS NULL;
UPDATE tactical_plays           x SET workspace_id = w.id FROM workspaces w WHERE w.owner_id = x.tenant_id AND x.workspace_id IS NULL;
UPDATE monthly_themes           x SET workspace_id = w.id FROM workspaces w WHERE w.owner_id = x.tenant_id AND x.workspace_id IS NULL;
UPDATE athlete_injuries         x SET workspace_id = w.id FROM workspaces w WHERE w.owner_id = x.tenant_id AND x.workspace_id IS NULL;
UPDATE user_content_state       x SET workspace_id = w.id FROM workspaces w WHERE w.owner_id = x.tenant_id AND x.workspace_id IS NULL;
UPDATE user_stage_state         x SET workspace_id = w.id FROM workspaces w WHERE w.owner_id = x.tenant_id AND x.workspace_id IS NULL;

-- 3. Subscriptions: cada subscription liga ao workspace do owner
UPDATE subscriptions s SET workspace_id = w.id
  FROM workspaces w
 WHERE w.owner_id = s.user_id AND s.workspace_id IS NULL;

-- 4. Migra club_members existentes pra workspace_members
INSERT INTO workspace_members (id, workspace_id, user_id, invited_email, role, invited_by, invite_token, invited_at, accepted_at, created_at, updated_at)
SELECT
  cm.id,
  w.id,
  cm.user_id,
  cm.invited_email,
  cm.role,
  cm.invited_by,
  cm.invite_token,
  cm.invited_at,
  cm.accepted_at,
  cm.created_at,
  cm.updated_at
FROM club_members cm
JOIN clubs c ON c.id = cm.club_id
JOIN workspaces w ON w.id = c.workspace_id
WHERE NOT EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.id = cm.id);

COMMIT;
