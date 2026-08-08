-- Plano vitalício gratuito (early adopters / parcerias)
INSERT INTO plans (id, name, description, price_cents, features) VALUES
  ('lifetime', 'Vitalício', 'Acesso vitalício gratuito', 0, '{"max_clubs":-1,"max_athletes":-1,"multi_user":true,"lifetime":true}')
ON CONFLICT (id) DO NOTHING;

-- Garante assinatura vitalícia para usuários iniciais (early adopters) que já existam.
-- Novos cadastros são tratados pelo backend (lista em config).
INSERT INTO subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
SELECT id, 'lifetime', 'active', now(), now() + interval '100 years'
FROM users
WHERE email IN ('prof.lauromartins@gmail.com')
  AND NOT EXISTS (
    SELECT 1 FROM subscriptions s
    WHERE s.user_id = users.id AND s.plan_id = 'lifetime'
  );

-- Promove Arthur a admin se já estiver cadastrado
UPDATE users SET role = 'admin'
WHERE email = 'arthurfaggin@gmail.com' AND role <> 'admin';
