-- Migration 043: reestrutura planos + add-ons
--
-- Modelo novo (decisão do dono, 2026-08):
--   - Pro    (R$39,90/mês): 1 clube, 1 categoria, sem comissão técnica.
--   - Clube  (R$89/mês):    1 clube, até 5 categorias, comissão técnica (multi-usuário).
--   - Add-ons recorrentes (somam à mensalidade):
--       * +1 clube      = R$20/mês  (extra_club_slots — coluna já existia)
--       * +1 categoria  = R$5/mês   (extra_category_slots — nova aqui)
--   - Anuais padronizados em "2 meses grátis" (paga 10 meses).
--
-- Antes o Clube vendia "3 clubes"; agora clube extra é add-on. As categorias
-- (profundidade dentro de UM clube) passam a ser o valor central do Clube.

BEGIN;

-- 1) Clube passa a ser 1 clube (o extra vira add-on). Categorias/comissão seguem.
UPDATE plans
   SET features = jsonb_set(features, '{max_clubs}', '1'::jsonb)
 WHERE id IN ('clube', 'clube_annual');

-- 2) Padroniza o desconto anual: 2 meses grátis = paga 10 meses.
--    Pro anual   = 39,90 * 10 = R$399,00
--    Clube anual = 89,00 * 10 = R$890,00
UPDATE plans SET price_cents = 39900 WHERE id = 'pro_annual';
UPDATE plans SET price_cents = 89000 WHERE id = 'clube_annual';

-- 3) Slot de categoria extra (add-on). extra_club_slots já existe de antes.
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS extra_category_slots INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN subscriptions.extra_category_slots IS
  'Add-on: categorias extras (além das 5 do Clube). Soma ao features.max_categories. R$5/mês cada.';

COMMIT;
