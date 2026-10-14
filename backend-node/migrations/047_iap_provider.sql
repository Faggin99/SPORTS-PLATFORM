-- IAP (Apple/Google via RevenueCat): de onde veio a assinatura.
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS provider VARCHAR(16) NOT NULL DEFAULT 'mercadopago';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS provider_subscription_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_ref ON subscriptions (provider, provider_subscription_id);
