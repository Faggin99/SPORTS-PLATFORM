-- Migration 039: cores do clube (multi-tenant theming)
-- Permite que cada clube defina sua paleta. As cores cascateiam por:
--   - UI: colors.primary do tema é sobrescrita pela cor do clube ativo
--   - PDFs: applyClubPrimaryColor() injeta a cor antes de cada gerador
--   - Logo: já existia em clubs.logo_path
--
-- Default NULL = usa a paleta padrão TactiPlan (azul).
-- Formato HEX #RRGGBB ou #RRGGBBAA, validado no backend.

BEGIN;

ALTER TABLE clubs
  ADD COLUMN IF NOT EXISTS primary_color   VARCHAR(9),
  ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(9);

COMMENT ON COLUMN clubs.primary_color IS
  'Cor primária do clube (#RRGGBB). NULL = paleta padrão do TactiPlan.';
COMMENT ON COLUMN clubs.secondary_color IS
  'Cor secundária do clube (#RRGGBB). NULL = derivada da primária.';

COMMIT;
