-- Categorias por clube (Sub-13, Sub-15, Profissional, etc.)
-- Cada atleta e microciclo podem pertencer a uma categoria (NULL = "clube todo", compat com modelo antigo).

BEGIN;

CREATE TABLE IF NOT EXISTS categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  club_id       UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name          VARCHAR(80) NOT NULL,
  age_group     VARCHAR(40),                              -- ex.: 'Sub-15', 'Profissional', 'Iniciação'
  display_order INT NOT NULL DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_club   ON categories(club_id);
CREATE INDEX IF NOT EXISTS idx_categories_tenant ON categories(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_unique_name_club ON categories(club_id, name);

-- Relacionamentos
ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_athletes_category ON athletes(category_id);

ALTER TABLE training_microcycles
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_microcycles_category ON training_microcycles(category_id);

COMMIT;
