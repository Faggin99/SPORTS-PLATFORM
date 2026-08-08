-- 022_plans_v2.sql
-- Modelo de planos v2: Pro (single-coach) + Clube (multi-coach).
-- Remove: free (nunca foi vendido), team (renomeado pra clube).
-- Mantém: pro, pro_annual, lifetime.
-- Cria: clube, clube_annual.

BEGIN;

-- 1. Criar clube e clube_annual (idempotente)
INSERT INTO plans (id, name, description, price_cents, features) VALUES
  ('clube', 'Clube Mensal',
   'Multi-treinador (até 5), categorias (até 5), tudo do Pro',
   8900,
   '{"max_clubs": -1, "max_athletes": -1, "multi_user": true, "max_coaches": 5, "max_categories": 5, "pdf_export": true, "quadro_tatico": true, "stats_completas": true}'::jsonb)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      price_cents = EXCLUDED.price_cents,
      features = EXCLUDED.features;

INSERT INTO plans (id, name, description, price_cents, interval, features) VALUES
  ('clube_annual', 'Clube Anual',
   'Multi-treinador (até 5), categorias (até 5), tudo do Pro — equivale a R$ 59,90/mês',
   71880,
   'yearly',
   '{"max_clubs": -1, "max_athletes": -1, "multi_user": true, "max_coaches": 5, "max_categories": 5, "pdf_export": true, "quadro_tatico": true, "stats_completas": true}'::jsonb)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      price_cents = EXCLUDED.price_cents,
      interval = EXCLUDED.interval,
      features = EXCLUDED.features;

-- 2. Migrar quem estiver em 'team' (não deve ter ninguém em prod, mas é seguro)
UPDATE subscriptions SET plan_id = 'clube' WHERE plan_id = 'team';

-- 3. Cancelar quem estiver em 'free' ativo (não deve ter ninguém)
UPDATE subscriptions
   SET status = 'canceled', canceled_at = COALESCE(canceled_at, now()), updated_at = now()
 WHERE plan_id = 'free' AND status IN ('trialing','active','past_due','paused');

-- 4. Apagar referências históricas pra liberar DELETE dos plans
-- (subscriptions canceladas com plan_id='free'/'team' viram 'clube' pra manter FK válida)
UPDATE subscriptions SET plan_id = 'clube' WHERE plan_id = 'team';
UPDATE subscriptions SET plan_id = 'pro'   WHERE plan_id = 'free';

-- 5. Remover plans obsoletos
DELETE FROM plans WHERE id IN ('free', 'team');

COMMIT;
