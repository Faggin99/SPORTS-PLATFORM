-- Migration 037: Multi-clube
-- (1) Sobe o limite do plano "Clube" e "Clube Anual" de 1 → 3 clubes
--     (Pro continua com 1)
-- (2) Adiciona coluna extra_club_slots em subscriptions pra permitir vender
--     slots adicionais avulsos no futuro (UI/checkout não implementado ainda;
--     pode ser ativado manualmente via SQL/admin pra clientes específicos).

BEGIN;

UPDATE plans
   SET features = jsonb_set(COALESCE(features, '{}'::jsonb), '{max_clubs}', '3', true),
       updated_at = NOW()
 WHERE id IN ('clube', 'clube_annual');

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS extra_club_slots INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN subscriptions.extra_club_slots IS
  'Slots adicionais de clube comprados como add-on. Somado a features.max_clubs do plano.';

COMMIT;
