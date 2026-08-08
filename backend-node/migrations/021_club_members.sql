-- Membros do clube — habilita compartilhamento entre treinadores.
-- O OWNER do clube continua sendo clubs.tenant_id (não muda).
-- Coach/assistant são users adicionais que ganham acesso ao clube via membership.
--
-- Convite por email:
--   1. Owner cria invite (token + email do convidado, opcionalmente já com user_id se for usuário existente)
--   2. Backend envia email com link contendo o token
--   3. Convidado abre o link → /accept-invite/:token → vincula user_id ao membership

BEGIN;

CREATE TABLE IF NOT EXISTS club_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id       UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,  -- NULL enquanto convite pendente
  invited_email VARCHAR(255),                                  -- email do convite (pra match no aceite)
  role          VARCHAR(20) NOT NULL DEFAULT 'coach',          -- 'coach' | 'assistant'
  invited_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  invite_token  VARCHAR(120) UNIQUE,                           -- NULL após aceite
  invited_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_club_members_club  ON club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_user  ON club_members(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_club_members_token ON club_members(invite_token) WHERE invite_token IS NOT NULL;

-- Um user não pode ter dois memberships ativos no mesmo clube
CREATE UNIQUE INDEX IF NOT EXISTS idx_club_members_unique_active
  ON club_members(club_id, user_id) WHERE user_id IS NOT NULL;

COMMIT;
