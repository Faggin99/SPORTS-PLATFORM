-- 026_tenant_id_nullable.sql
-- Torna tenant_id nullable em todas as 17 tabelas pra desacoplar o backend.
-- A coluna continua existindo (não removida) pra rollback de emergência, mas o
-- backend novo passa a popular só workspace_id em INSERTs.

BEGIN;

ALTER TABLE clubs                    ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE athletes                 ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE categories               ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE contents                 ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE stages                   ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE activity_titles          ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE training_microcycles     ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE training_sessions        ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE training_activities      ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE training_activity_files  ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE match_players            ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE match_events             ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE tactical_plays           ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE monthly_themes           ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE athlete_injuries         ALTER COLUMN tenant_id DROP NOT NULL;
-- user_content_state e user_stage_state: tenant_id é parte da PK composta — mantém NOT NULL.

COMMIT;
