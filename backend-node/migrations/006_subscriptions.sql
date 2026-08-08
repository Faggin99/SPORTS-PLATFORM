-- Planos da plataforma
CREATE TABLE IF NOT EXISTS plans (
  id VARCHAR(64) PRIMARY KEY,           -- ex: 'free', 'pro', 'team'
  name VARCHAR(120) NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency VARCHAR(8) NOT NULL DEFAULT 'BRL',
  interval VARCHAR(16) NOT NULL DEFAULT 'monthly',  -- monthly | yearly
  features JSONB DEFAULT '{}'::jsonb,    -- {max_clubs, max_athletes, ...}
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Assinatura do usuário
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id VARCHAR(64) NOT NULL REFERENCES plans(id),
  status VARCHAR(32) NOT NULL DEFAULT 'trialing',
    -- trialing | active | past_due | canceled | paused | expired
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  -- Mercado Pago
  mp_preapproval_id VARCHAR(128),
  mp_payer_id VARCHAR(128),
  mp_status VARCHAR(64),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_mp ON subscriptions(mp_preapproval_id);

-- Histórico de cobranças (webhook events do MP)
CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type VARCHAR(64) NOT NULL,             -- payment.created | payment.approved | preapproval.updated...
  mp_resource_id VARCHAR(128),
  amount_cents INTEGER,
  currency VARCHAR(8),
  status VARCHAR(64),
  raw JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_sub ON billing_events(subscription_id);

-- Seed: 3 planos placeholder (você ajusta depois pelo SQL ou via UI no futuro)
INSERT INTO plans (id, name, description, price_cents, features) VALUES
  ('free',  'Free',  'Para experimentar a plataforma', 0,     '{"max_clubs":1, "max_athletes":5}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO plans (id, name, description, price_cents, features) VALUES
  ('pro',   'Pro',   'Recursos completos para 1 treinador', 4900, '{"max_clubs":3, "max_athletes":80}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO plans (id, name, description, price_cents, features) VALUES
  ('team',  'Team',  'Múltiplos treinadores e clubes', 9900, '{"max_clubs":-1, "max_athletes":-1, "multi_user":true}')
ON CONFLICT (id) DO NOTHING;
