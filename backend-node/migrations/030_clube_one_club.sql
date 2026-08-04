-- 030_clube_one_club.sql
-- No modelo workspace, 1 workspace = 1 clube. Pra ter outro contexto, o
-- usuário cria nova workspace (Slack-style). Por isso max_clubs = 1 também no Clube.

BEGIN;

UPDATE plans
   SET features = features || '{"max_clubs": 1}'::jsonb
 WHERE id IN ('clube', 'clube_annual');

COMMIT;
