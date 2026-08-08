-- Migration 041: LGPD + billing lifecycle
--
-- 1) LGPD "direito ao esquecimento": users.deleted_at (soft-delete)
--    Não apagamos a linha (referências em muitas tabelas) — anonimizamos
--    PII (name, email) e marcamos deleted_at. Backend rejeita login com
--    deleted_at IS NOT NULL.
--
-- 2) Registro do aceite explícito dos Termos: users.terms_accepted_at
--    Já existia migration 005_user_terms — vou confirmar antes de duplicar.
--    Se já tiver, esse ALTER é no-op via IF NOT EXISTS.
--
-- 3) Cancelamento com preservação de período pago:
--    subscriptions.cancel_at_period_end (bool). Quando true, o
--    middleware trata como active até current_period_end < now(), e
--    cron muda pra 'canceled' na data.
--
-- 4) Log de operações billing (auditoria) — evita histórico perdido.

BEGIN;

-- LGPD
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deleted_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_accepted_at  TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users (deleted_at) WHERE deleted_at IS NULL;

-- Backfill: quem já usava o app tem aceite implícito de termos v1 na data do 1º login.
UPDATE users SET terms_accepted_at = created_at WHERE terms_accepted_at IS NULL;

-- Billing lifecycle
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS canceled_at          TIMESTAMPTZ;

-- Audit log de eventos billing (assinatura criada, mudou plano, cancelada, pagamento OK/falhou)
CREATE TABLE IF NOT EXISTS billing_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id   UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  event_type     VARCHAR(64) NOT NULL,      -- 'subscription.created', 'payment.approved', 'payment.rejected', 'subscription.canceled'
  payload        JSONB,                     -- payload bruto do MP quando aplicável
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_billing_events_user ON billing_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_events_sub  ON billing_events (subscription_id, created_at DESC) WHERE subscription_id IS NOT NULL;

-- Anti-duplicação de assinaturas: no máximo 1 assinatura ativa por user
CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_active_per_user
  ON subscriptions (user_id)
  WHERE status IN ('trialing', 'active', 'past_due');

COMMIT;
