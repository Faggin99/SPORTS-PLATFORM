-- ============================================================
-- LIMPAR DADOS DO USUÁRIO (prof.lauromartins@gmail.com) - V2
-- Mantém: Configurações do sistema, conteúdos, etapas, subitens
-- Remove: Clubes, atletas, microciclos, sessões, atividades
-- ============================================================

DO $$
DECLARE
  user_id UUID;
  table_exists BOOLEAN;
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
  -- 1. DELETAR ATIVIDADES DE SESSÕES
  -- ========================================
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'training_session_activities'
  ) INTO table_exists;

  IF table_exists THEN
    RAISE NOTICE '1. Deletando atividades de treino...';
    DELETE FROM training_session_activities WHERE tenant_id = user_id;
    RAISE NOTICE '   ✓ Atividades deletadas';
  ELSE
    RAISE NOTICE '1. Tabela training_session_activities não existe - pulando';
  END IF;

  -- ========================================
  -- 2. DELETAR BLOCOS DE ATIVIDADES
  -- ========================================
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'training_activity_blocks'
  ) INTO table_exists;

  IF table_exists THEN
    RAISE NOTICE '2. Deletando blocos de atividades...';
    -- Se a tabela de atividades existe, usa o JOIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'training_session_activities') THEN
      DELETE FROM training_activity_blocks
      WHERE session_activity_id IN (
        SELECT id FROM training_session_activities WHERE tenant_id = user_id
      );
    ELSE
      -- Senão, tenta deletar diretamente se tiver tenant_id
      IF EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'training_activity_blocks'
        AND column_name = 'tenant_id'
      ) THEN
        DELETE FROM training_activity_blocks WHERE tenant_id = user_id;
      END IF;
    END IF;
    RAISE NOTICE '   ✓ Blocos deletados';
  ELSE
    RAISE NOTICE '2. Tabela training_activity_blocks não existe - pulando';
  END IF;

  -- ========================================
  -- 3. DELETAR SESSÕES DE TREINO
  -- ========================================
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'training_sessions'
  ) INTO table_exists;

  IF table_exists THEN
    RAISE NOTICE '3. Deletando sessões de treino...';
    DELETE FROM training_sessions WHERE tenant_id = user_id;
    RAISE NOTICE '   ✓ Sessões deletadas';
  ELSE
    RAISE NOTICE '3. Tabela training_sessions não existe - pulando';
  END IF;

  -- ========================================
  -- 4. DELETAR MICROCICLOS
  -- ========================================
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'training_microcycles'
  ) INTO table_exists;

  IF table_exists THEN
    RAISE NOTICE '4. Deletando microciclos...';
    DELETE FROM training_microcycles WHERE tenant_id = user_id;
    RAISE NOTICE '   ✓ Microciclos deletados';
  ELSE
    RAISE NOTICE '4. Tabela training_microcycles não existe - pulando';
  END IF;

  -- ========================================
  -- 5. DELETAR ATLETAS
  -- ========================================
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'athletes'
  ) INTO table_exists;

  IF table_exists THEN
    RAISE NOTICE '5. Deletando atletas...';
    DELETE FROM athletes WHERE tenant_id = user_id;
    RAISE NOTICE '   ✓ Atletas deletados';
  ELSE
    RAISE NOTICE '5. Tabela athletes não existe - pulando';
  END IF;

  -- ========================================
  -- 6. DELETAR CLUBES
  -- ========================================
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'clubs'
  ) INTO table_exists;

  IF table_exists THEN
    RAISE NOTICE '6. Deletando clubes...';

    -- Deletar logos do storage (se existir)
    BEGIN
      DELETE FROM storage.objects
      WHERE bucket_id = 'club-logos'
      AND name LIKE user_id::text || '%';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '   ⚠ Não foi possível deletar logos do storage';
    END;

    -- Deletar clubes do banco
    DELETE FROM clubs WHERE tenant_id = user_id;
    RAISE NOTICE '   ✓ Clubes deletados';
  ELSE
    RAISE NOTICE '6. Tabela clubs não existe - pulando';
  END IF;

  -- ========================================
  -- 7. LIMPAR FOTO DE PERFIL DO USUÁRIO
  -- ========================================
  RAISE NOTICE '7. Limpando foto de perfil...';

  -- Deletar foto do storage (se existir)
  BEGIN
    DELETE FROM storage.objects
    WHERE bucket_id = 'profile-photos'
    AND name LIKE user_id::text || '%';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '   ⚠ Não foi possível deletar foto do storage';
  END;

  -- Limpar metadata do auth
  BEGIN
    UPDATE auth.users
    SET raw_user_meta_data = raw_user_meta_data - 'profile_photo'
    WHERE id = user_id;
    RAISE NOTICE '   ✓ Foto de perfil deletada';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '   ⚠ Não foi possível atualizar metadata do usuário';
  END;

  -- ========================================
  -- 8. LIMPAR TABELA USERS (se existir)
  -- ========================================
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'users'
  ) INTO table_exists;

  IF table_exists THEN
    RAISE NOTICE '8. Limpando dados extras da tabela users...';

    -- Limpar campos específicos mas manter o registro
    UPDATE users
    SET
      avatar_url = NULL,
      phone = NULL,
      bio = NULL
    WHERE id = user_id;

    RAISE NOTICE '   ✓ Dados extras limpos (avatar, phone, bio)';
  ELSE
    RAISE NOTICE '8. Tabela users não existe - pulando';
  END IF;

  -- ========================================
  -- RESUMO
  -- ========================================
  RAISE NOTICE '';
  RAISE NOTICE '==========================================================';
  RAISE NOTICE 'LIMPEZA CONCLUÍDA COM SUCESSO!';
  RAISE NOTICE '==========================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'DADOS REMOVIDOS (se existiam):';
  RAISE NOTICE '  ✓ Clubes';
  RAISE NOTICE '  ✓ Atletas';
  RAISE NOTICE '  ✓ Microciclos';
  RAISE NOTICE '  ✓ Sessões de treino';
  RAISE NOTICE '  ✓ Atividades de treino';
  RAISE NOTICE '  ✓ Blocos de atividades';
  RAISE NOTICE '  ✓ Foto de perfil';
  RAISE NOTICE '  ✓ Logos de clubes';
  RAISE NOTICE '';
  RAISE NOTICE 'DADOS MANTIDOS (Sistema):';
  RAISE NOTICE '  ✓ Conteúdos de treino (contents)';
  RAISE NOTICE '  ✓ Etapas de microciclo (microcycle_stages)';
  RAISE NOTICE '  ✓ Subitens padrão (activity_subitems)';
  RAISE NOTICE '  ✓ Títulos de atividades (activity_titles)';
  RAISE NOTICE '  ✓ Usuário: prof.lauromartins@gmail.com';
  RAISE NOTICE '';
  RAISE NOTICE 'PRÓXIMOS PASSOS:';
  RAISE NOTICE '  1. Faça logout no app';
  RAISE NOTICE '  2. Limpe o localStorage: localStorage.clear()';
  RAISE NOTICE '  3. Faça login novamente';
  RAISE NOTICE '  4. O modal de onboarding deve aparecer';
  RAISE NOTICE '  5. Crie seu primeiro clube';
  RAISE NOTICE '';
  RAISE NOTICE '==========================================================';

END $$;
