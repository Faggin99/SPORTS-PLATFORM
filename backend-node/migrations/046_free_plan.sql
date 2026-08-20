-- Plano Free permanente (Apple 3.1.3(f): app utilizável sem pagar).
-- Inclui: planejamento de treinos, jogos, estatísticas, 1 clube, 1 categoria,
-- até 30 atletas. Exclui: quadro tático, exportações (PDF/Excel/vídeo), equipe.
INSERT INTO plans (id, name, description, price_cents, currency, interval, features, is_active)
VALUES (
  'free', 'Free',
  'Planeje treinos, registre jogos e acompanhe estatísticas — grátis, pra sempre.',
  0, 'BRL', 'monthly',
  '{"free": true, "max_clubs": 1, "max_categories": 1, "max_athletes": 30, "quadro_tatico": false, "pdf_export": false, "stats_completas": true, "multi_user": false}'::jsonb,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_cents = 0,
  features = EXCLUDED.features,
  is_active = true,
  updated_at = NOW();
