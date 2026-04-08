-- EXPORTAR USUARIOS
-- Execute no SQL Editor do Supabase e copie o resultado
-- Salve como: export-supabase/data/users.json

SELECT json_agg(row_to_json(t)) FROM (
  SELECT
    id,
    email,
    encrypted_password,
    raw_user_meta_data->>'name' as name,
    raw_user_meta_data->>'phone' as phone,
    raw_user_meta_data->>'bio' as bio,
    raw_user_meta_data->>'profile_photo' as profile_photo,
    raw_user_meta_data->>'avatar_url' as avatar_url,
    email_confirmed_at,
    created_at,
    updated_at
  FROM auth.users
  ORDER BY created_at
) t;
