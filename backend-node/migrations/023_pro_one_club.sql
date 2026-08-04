-- 023_pro_one_club.sql
-- Pro passa a ter 1 clube; Clube continua ilimitado.
-- Mantém o resto das features intactas.

BEGIN;

UPDATE plans
   SET features = features || '{"max_clubs": 1}'::jsonb
 WHERE id IN ('pro', 'pro_annual');

COMMIT;
