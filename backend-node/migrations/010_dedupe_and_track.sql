-- Deduplica seed inserido múltiplas vezes (contents + stages) e adiciona
-- UNIQUE constraint pra impedir repetição futura.
-- A tabela schema_migrations + tracking do runner cuidam de não re-executar.

-- 1. Tabela de tracking (caso ainda não exista)
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Deduplica contents (mantém o mais antigo por nome+tenant) e redireciona FKs
WITH ranked AS (
  SELECT
    id, name, tenant_id, created_at,
    ROW_NUMBER() OVER (
      PARTITION BY name, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)
      ORDER BY created_at, id
    ) AS rn
  FROM contents
),
mapping AS (
  SELECT
    r1.id AS loser_id,
    r2.id AS winner_id
  FROM ranked r1
  JOIN ranked r2
    ON r2.name = r1.name
   AND COALESCE(r2.tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)
       = COALESCE(r1.tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)
   AND r2.rn = 1
  WHERE r1.rn > 1
)
INSERT INTO training_activity_contents (activity_id, content_id)
SELECT tac.activity_id, m.winner_id
FROM training_activity_contents tac
JOIN mapping m ON m.loser_id = tac.content_id
ON CONFLICT DO NOTHING;

DELETE FROM training_activity_contents tac
WHERE EXISTS (
  WITH ranked AS (
    SELECT id, name, tenant_id,
      ROW_NUMBER() OVER (PARTITION BY name, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid) ORDER BY created_at, id) AS rn
    FROM contents
  )
  SELECT 1 FROM ranked WHERE ranked.id = tac.content_id AND ranked.rn > 1
);

-- Remove os contents duplicados (rn > 1)
DELETE FROM contents c
WHERE c.id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (PARTITION BY name, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid) ORDER BY created_at, id) AS rn
    FROM contents
  ) t WHERE t.rn > 1
);

-- 3. Deduplica stages (não tem FK apontando — só DELETE)
DELETE FROM stages s
WHERE s.id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (PARTITION BY name, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid) ORDER BY created_at, id) AS rn
    FROM stages
  ) t WHERE t.rn > 1
);

-- 4. UNIQUE constraints — agora ON CONFLICT do seed funciona se rodar de novo
CREATE UNIQUE INDEX IF NOT EXISTS idx_contents_unique_name_tenant
  ON contents (name, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE UNIQUE INDEX IF NOT EXISTS idx_stages_unique_name_tenant
  ON stages (name, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid));
