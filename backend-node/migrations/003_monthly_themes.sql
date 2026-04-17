CREATE TABLE IF NOT EXISTS monthly_themes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL,
  primary_content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  secondary_content_id UUID REFERENCES contents(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, club_id, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_themes_lookup ON monthly_themes(tenant_id, club_id, month);
