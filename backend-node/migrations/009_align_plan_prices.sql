-- Alinha preços e planos com o modelo de negócio atual (versionado em migration).
-- Idempotente — pode rodar em qualquer ambiente.

UPDATE plans SET
  name = 'Pro Mensal',
  description = 'Sem fidelidade — cancele quando quiser',
  price_cents = 3990,
  interval = 'monthly',
  features = '{"max_clubs":-1,"max_athletes":-1,"quadro_tatico":true,"stats_completas":true,"pdf_export":true}'::jsonb,
  updated_at = now()
WHERE id = 'pro';

INSERT INTO plans (id, name, description, price_cents, currency, interval, features, is_active)
VALUES (
  'pro_annual',
  'Pro Anual',
  'R$ 19,90/mês cobrado anualmente — economize 50%',
  23880,
  'BRL',
  'yearly',
  '{"max_clubs":-1,"max_athletes":-1,"quadro_tatico":true,"stats_completas":true,"pdf_export":true}'::jsonb,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_cents = EXCLUDED.price_cents,
  interval = EXCLUDED.interval,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Desativa planos que não vendemos hoje (Free é "trial 14d", Team virou "Clube sob consulta")
UPDATE plans SET is_active = false WHERE id IN ('free', 'team');
