-- 029_clube_monthly_theme.sql
-- Adiciona feature monthly_theme no plano Clube (mensal e anual).
-- Pro não tem.

BEGIN;

UPDATE plans
   SET features = features || '{"monthly_theme": true}'::jsonb
 WHERE id IN ('clube', 'clube_annual', 'lifetime');

COMMIT;
