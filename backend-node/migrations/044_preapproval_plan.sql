-- Migration 044: fluxo de assinatura baseado em preapproval_plan do Mercado Pago.
-- A conta MP recusa preapproval direto (500); o fluxo com plano funciona e tem
-- init_point (checkout por redirect). Guardamos o id do plano criado no checkout
-- pra vincular a assinatura resultante (preapproval) ao nosso usuário no webhook.
BEGIN;
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS mp_preapproval_plan_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_subscriptions_mp_plan ON subscriptions (mp_preapproval_plan_id);
COMMIT;
