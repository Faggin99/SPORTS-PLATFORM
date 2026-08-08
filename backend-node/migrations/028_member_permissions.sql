-- 028_member_permissions.sql
-- Adiciona coluna `permissions` JSONB em workspace_members.
-- Quando NULL, o backend usa os defaults do role do membro.
-- Quando preenchido, é o conjunto efetivo de permissões (override do role).

BEGIN;

ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS permissions JSONB;

-- O role agora aceita: owner | manager | head_coach | assistant_coach | specialist | viewer.
-- Membros antigos com role='coach' viram 'head_coach', 'assistant' vira 'viewer' como fallback seguro.
UPDATE workspace_members SET role = 'head_coach' WHERE role = 'coach';
UPDATE workspace_members SET role = 'viewer' WHERE role = 'assistant';

COMMIT;
