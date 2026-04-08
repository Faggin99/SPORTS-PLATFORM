-- ============================================================
-- COMPARAR USUÁRIOS NO AUTH
-- ============================================================

-- 1. Ver dados completos dos dois usuários
SELECT
  id,
  email,
  encrypted_password IS NOT NULL as has_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  raw_app_meta_data,
  raw_user_meta_data,
  is_sso_user,
  aud,
  role,
  created_at,
  updated_at,
  last_sign_in_at,
  deleted_at
FROM auth.users
WHERE email IN ('prof.lauromartins@gmail.com', 'arthurfaggin@gmail.com')
ORDER BY email;

-- 2. Ver identities (necessário para login)
SELECT
  u.email,
  i.id as identity_id,
  i.user_id,
  i.provider,
  i.identity_data,
  i.last_sign_in_at,
  i.created_at
FROM auth.users u
LEFT JOIN auth.identities i ON u.id = i.user_id
WHERE u.email IN ('prof.lauromartins@gmail.com', 'arthurfaggin@gmail.com')
ORDER BY u.email;

-- 3. Verificar se tem refresh tokens
SELECT
  u.email,
  rt.id as token_id,
  LEFT(rt.token, 20) || '...' as token_preview,
  rt.revoked,
  rt.created_at,
  rt.updated_at
FROM auth.users u
LEFT JOIN auth.refresh_tokens rt ON u.id::text = rt.user_id::text
WHERE u.email IN ('prof.lauromartins@gmail.com', 'arthurfaggin@gmail.com')
ORDER BY u.email, rt.created_at DESC
LIMIT 10;

-- 4. Ver dados em tabelas relacionadas (clubs, etc)
SELECT
  'clubs' as table_name,
  u.email,
  COUNT(c.id) as total_records
FROM auth.users u
LEFT JOIN clubs c ON u.id = c.tenant_id
WHERE u.email IN ('prof.lauromartins@gmail.com', 'arthurfaggin@gmail.com')
GROUP BY u.email
ORDER BY u.email;
