-- ============================================================
-- LIMPAR DADOS DO USUÁRIO - VERSÃO FINAL (SUPER SEGURA)
-- Para: prof.lauromartins@gmail.com
-- ============================================================

DO $$
DECLARE
  user_id UUID;
  table_exists BOOLEAN;
  row_count INTEGER;
BEGIN
  -- Buscar o ID do usuário
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = 'prof.lauromartins@gmail.com';

  IF user_id IS NULL THEN
    RAISE NOTICE 'Usuário prof.lauromartins@gmail.com não encontrado!';
    RETURN;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '==========================================================';
  RAISE NOTICE 'LIMPANDO DADOS DO USUÁRIO: prof.lauromartins@gmail.com';
  RAISE NOTICE 'User ID: %', user_id;
  RAISE NOTICE '==========================================================';
  RAISE NOTICE '';

  -- ========================================
  -- 1. DELETAR CLUBES
  -- ========================================
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'clubs'
  ) INTO table_exists;

  IF table_exists THEN
    RAISE NOTICE '1. Deletando clubes...';

    GET DIAGNOSTICS row_count = ROW_COUNT;
    DELETE FROM clubs WHERE tenant_id = user_id;
    GET DIAGNOSTICS row_count = ROW_COUNT;

    RAISE NOTICE '   ✓ % clubes deletados', row_count;

    -- Tentar deletar logos do storage
    BEGIN
      DELETE FROM storage.objects
      WHERE bucket_id = 'club-logos'
      AND name LIKE user_id::text || '%';
      RAISE NOTICE '   ✓ Logos deletados do storage';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '   ⚠ Storage: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE '1. Tabela clubs não existe - pulando';
  END IF;

  -- ========================================
  -- 2. DELETAR ATLETAS
  -- ========================================
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'athletes'
  ) INTO table_exists;

  IF table_exists THEN
    RAISE NOTICE '2. Deletando atletas...';
    DELETE FROM athletes WHERE tenant_id = user_id;
    GET DIAGNOSTICS row_count = ROW_COUNT;
    RAISE NOTICE '   ✓ % atletas deletados', row_count;
  ELSE
    RAISE NOTICE '2. Tabela athletes não existe - pulando';
  END IF;

  -- ========================================
  -- 3. DELETAR MICROCICLOS
  -- ========================================
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'training_microcycles'
  ) INTO table_exists;

  IF table_exists THEN
    RAISE NOTICE '3. Deletando microciclos...';
    DELETE FROM training_microcycles WHERE tenant_id = user_id;
    GET DIAGNOSTICS row_count = ROW_COUNT;
    RAISE NOTICE '   ✓ % microciclos deletados', row_count;
  ELSE
    RAISE NOTICE '3. Tabela training_microcycles não existe - pulando';
  END IF;

  -- ========================================
  -- 4. DELETAR SESSÕES (se existir)
  -- ========================================
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'training_sessions'
  ) INTO table_exists;

  IF table_exists THEN
    RAISE NOTICE '4. Deletando sessões...';
    DELETE FROM training_sessions WHERE tenant_id = user_id;
    GET DIAGNOSTICS row_count = ROW_COUNT;
    RAISE NOTICE '   ✓ % sessões deletadas', row_count;
  ELSE
    RAISE NOTICE '4. Tabela training_sessions não existe - pulando';
  END IF;

  -- ========================================
  -- 5. LIMPAR FOTO DE PERFIL
  -- ========================================
  RAISE NOTICE '5. Limpando foto de perfil...';

  -- Tentar deletar do storage
  BEGIN
    DELETE FROM storage.objects
    WHERE bucket_id = 'profile-photos'
    AND name LIKE user_id::text || '%';
    GET DIAGNOSTICS row_count = ROW_COUNT;
    IF row_count > 0 THEN
      RAISE NOTICE '   ✓ % fotos deletadas do storage', row_count;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '   ⚠ Storage: %', SQLERRM;
  END;

  -- Limpar metadata do auth
  BEGIN
    UPDATE auth.users
    SET raw_user_meta_data = raw_user_meta_data - 'profile_photo'
    WHERE id = user_id;
    RAISE NOTICE '   ✓ Metadata limpo';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '   ⚠ Metadata: %', SQLERRM;
  END;

  -- ========================================
  -- 6. LIMPAR TABELA USERS (se existir)
  -- ========================================
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) INTO table_exists;

  IF table_exists THEN
    RAISE NOTICE '6. Limpando tabela users...';

    -- Tentar limpar avatar_url
    BEGIN
      UPDATE users SET avatar_url = NULL WHERE id = user_id;
      RAISE NOTICE '   ✓ avatar_url limpo';
    EXCEPTION WHEN undefined_column THEN
      RAISE NOTICE '   ⚠ Coluna avatar_url não existe';
    END;

    -- Tentar limpar phone
    BEGIN
      UPDATE users SET phone = NULL WHERE id = user_id;
      RAISE NOTICE '   ✓ phone limpo';
    EXCEPTION WHEN undefined_column THEN
      RAISE NOTICE '   ⚠ Coluna phone não existe';
    END;

    -- Tentar limpar bio
    BEGIN
      UPDATE users SET bio = NULL WHERE id = user_id;
      RAISE NOTICE '   ✓ bio limpo';
    EXCEPTION WHEN undefined_column THEN
      RAISE NOTICE '   ⚠ Coluna bio não existe';
    END;
  ELSE
    RAISE NOTICE '6. Tabela users não existe - pulando';
  END IF;

  -- ========================================
  -- RESUMO
  -- ========================================
  RAISE NOTICE '';
  RAISE NOTICE '==========================================================';
  RAISE NOTICE 'LIMPEZA CONCLUÍDA COM SUCESSO!';
  RAISE NOTICE '==========================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'O que foi feito:';
  RAISE NOTICE '  ✓ Dados do usuário deletados';
  RAISE NOTICE '  ✓ Configurações do sistema mantidas';
  RAISE NOTICE '';
  RAISE NOTICE 'Próximos passos:';
  RAISE NOTICE '  1. Faça logout no app';
  RAISE NOTICE '  2. Console (F12): localStorage.clear()';
  RAISE NOTICE '  3. Faça login novamente';
  RAISE NOTICE '  4. Modal de onboarding deve aparecer';
  RAISE NOTICE '';
  RAISE NOTICE '==========================================================';

END $$;
