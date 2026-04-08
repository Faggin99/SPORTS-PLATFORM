-- ============================================================
-- LIMPAR DADOS DO USUÁRIO (prof.lauromartins@gmail.com)
-- Mantém: Configurações do sistema, conteúdos, etapas, subitens
-- Remove: Clubes, atletas, microciclos, sessões, atividades
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
  RAISE NOTICE '1. Deletando atividades de treino...';

  DELETE FROM training_session_activities
  WHERE tenant_id = user_id;

  RAISE NOTICE '   ✓ Atividades deletadas';

  -- ========================================
  -- 2. DELETAR BLOCOS DE ATIVIDADES
  -- ========================================
  RAISE NOTICE '2. Deletando blocos de atividades...';

  DELETE FROM training_activity_blocks
  WHERE session_activity_id IN (
    SELECT id FROM training_session_activities WHERE tenant_id = user_id
  );

  RAISE NOTICE '   ✓ Blocos deletados';

  -- ========================================
  -- 3. DELETAR SESSÕES DE TREINO
  -- ========================================
  RAISE NOTICE '3. Deletando sessões de treino...';

  DELETE FROM training_sessions
  WHERE tenant_id = user_id;

  RAISE NOTICE '   ✓ Sessões deletadas';

  -- ========================================
  -- 4. DELETAR MICROCICLOS
  -- ========================================
  RAISE NOTICE '4. Deletando microciclos...';

  DELETE FROM training_microcycles
  WHERE tenant_id = user_id;

  RAISE NOTICE '   ✓ Microciclos deletados';

  -- ========================================
  -- 5. DELETAR ATLETAS
  -- ========================================
  RAISE NOTICE '5. Deletando atletas...';

  DELETE FROM athletes
  WHERE tenant_id = user_id;

  RAISE NOTICE '   ✓ Atletas deletados';

  -- ========================================
  -- 6. DELETAR CLUBES
  -- ========================================
  RAISE NOTICE '6. Deletando clubes...';

  -- Primeiro deletar logos do storage
  DELETE FROM storage.objects
  WHERE bucket_id = 'club-logos'
  AND name LIKE '%' || user_id::text || '%';

  -- Depois deletar clubes do banco
  DELETE FROM clubs
  WHERE tenant_id = user_id;

  RAISE NOTICE '   ✓ Clubes e logos deletados';

  -- ========================================
  -- 7. LIMPAR FOTO DE PERFIL DO USUÁRIO
  -- ========================================
  RAISE NOTICE '7. Limpando foto de perfil...';

  -- Deletar foto do storage
  DELETE FROM storage.objects
  WHERE bucket_id = 'profile-photos'
  AND name LIKE user_id::text || '%';

  -- Limpar metadata do auth
  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data - 'profile_photo'
  WHERE id = user_id;

  RAISE NOTICE '   ✓ Foto de perfil deletada';

  -- ========================================
  -- 8. LIMPAR SELEÇÃO DE CLUBE DO LOCALSTORAGE
  -- ========================================
  RAISE NOTICE '8. Informações sobre localStorage:';
  RAISE NOTICE '   ⚠ No navegador, execute: localStorage.removeItem("selectedClubId")';
  RAISE NOTICE '   ⚠ Ou simplesmente faça logout e login novamente';

  -- ========================================
  -- RESUMO
  -- ========================================
  RAISE NOTICE '';
  RAISE NOTICE '==========================================================';
  RAISE NOTICE 'LIMPEZA CONCLUÍDA COM SUCESSO!';
  RAISE NOTICE '==========================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'DADOS REMOVIDOS:';
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
  RAISE NOTICE '  2. Faça login novamente';
  RAISE NOTICE '  3. O modal de onboarding deve aparecer';
  RAISE NOTICE '  4. Crie seu primeiro clube';
  RAISE NOTICE '';
  RAISE NOTICE '==========================================================';

END $$;
