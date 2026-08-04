-- Estado por-tenant para Conteúdos e Submomentos (ativo/inativo).
-- Globais ficam imutáveis no banco; cada tenant pode desativá-los OU substituí-los
-- por uma versão própria (clone) via fluxo de edição. Customs também podem ser
-- inativados sem perder o histórico de uso.

BEGIN;

CREATE TABLE IF NOT EXISTS user_content_state (
  tenant_id   UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  content_id  UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, content_id)
);
CREATE INDEX IF NOT EXISTS idx_ucs_tenant ON user_content_state(tenant_id);

CREATE TABLE IF NOT EXISTS user_stage_state (
  tenant_id   UUID NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  stage_id    UUID NOT NULL REFERENCES stages(id)  ON DELETE CASCADE,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, stage_id)
);
CREATE INDEX IF NOT EXISTS idx_uss_tenant ON user_stage_state(tenant_id);

COMMIT;
