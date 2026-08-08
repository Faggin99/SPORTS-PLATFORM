-- Anúncios/novidades globais — postados pelo admin, exibidos na home dos usuários.
-- Sem tenant_id (são globais). target_role permite segmentar no futuro.

BEGIN;

CREATE TABLE IF NOT EXISTS announcements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         VARCHAR(255) NOT NULL,
  body          TEXT NOT NULL,
  severity      VARCHAR(20) NOT NULL DEFAULT 'info', -- 'info' | 'warning' | 'important' | 'success'
  active_from   TIMESTAMPTZ NOT NULL DEFAULT now(),
  active_until  TIMESTAMPTZ,                          -- NULL = sem expiração
  target_role   VARCHAR(50) NOT NULL DEFAULT 'all',  -- 'all' | 'admin' | (futuros: 'pro' etc)
  link_url      TEXT,                                -- opcional: anúncio clicável
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_active
  ON announcements(active_from, active_until);

-- Dismisses por usuário (pra não mostrar de novo após o user fechar)
CREATE TABLE IF NOT EXISTS announcement_dismissals (
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  dismissed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, announcement_id)
);

COMMIT;
