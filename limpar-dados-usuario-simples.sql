-- ============================================================
-- LIMPAR DADOS DO USUÁRIO - VERSÃO SIMPLES
-- Para: prof.lauromartins@gmail.com
-- ============================================================

DO $$
DECLARE
  user_id UUID;
BEGIN
  -- Buscar o ID do usuário
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = 'prof.lauromartins@gmail.com';

  IF user_id IS NULL THEN
    RAISE NOTICE 'Usuário não encontrado!';
    RETURN;
  END IF;

  RAISE NOTICE 'Limpando dados do usuário: %', user_id;

  -- Deletar clubes
  DELETE FROM clubs WHERE tenant_id = user_id;
  RAISE NOTICE '✓ Clubes deletados';

  -- Deletar atletas
  DELETE FROM athletes WHERE tenant_id = user_id;
  RAISE NOTICE '✓ Atletas deletados';

  -- Deletar microciclos
  DELETE FROM training_microcycles WHERE tenant_id = user_id;
  RAISE NOTICE '✓ Microciclos deletados';

  -- Limpar foto de perfil do metadata
  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data - 'profile_photo'
  WHERE id = user_id;
  RAISE NOTICE '✓ Metadata limpo';

  RAISE NOTICE '';
  RAISE NOTICE 'CONCLUÍDO! Faça logout e login novamente.';

END $$;
