-- SCRIPT DE DIAGNÓSTICO
-- Execute este script primeiro para ver a estrutura atual do seu banco de dados
-- Copie e cole a saída completa para me mostrar

-- 1. Listar todas as tabelas relevantes
SELECT
  'TABELAS EXISTENTES:' as info,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'training_microcycles',
    'training_sessions',
    'training_activity_blocks',
    'training_activities',
    'athletes',
    'users',
    'activity_titles',
    'training_activity_contents',
    'training_activity_stages',
    'contents',
    'stages',
    'clubs'
  )
ORDER BY table_name;

-- 2. Verificar quais tabelas têm a coluna tenant_id e qual o tipo
SELECT
  'COLUNAS TENANT_ID:' as info,
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'tenant_id'
ORDER BY table_name;

-- 3. Contar quantos registros existem em cada tabela
SELECT 'CONTAGEM DE REGISTROS:' as info;

DO $$
DECLARE
  rec RECORD;
  row_count INTEGER;
BEGIN
  FOR rec IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name IN (
        'training_microcycles',
        'training_sessions',
        'training_activity_blocks',
        'training_activities',
        'athletes',
        'activity_titles',
        'training_activity_contents',
        'training_activity_stages',
        'contents',
        'stages'
      )
    ORDER BY table_name
  LOOP
    EXECUTE 'SELECT COUNT(*) FROM ' || rec.table_name INTO row_count;
    RAISE NOTICE '  % tem % registros', rec.table_name, row_count;
  END LOOP;
END $$;

-- 4. Verificar constraints de foreign key relacionadas a tenant_id
SELECT
  'FOREIGN KEYS EM TENANT_ID:' as info,
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'tenant_id'
ORDER BY tc.table_name;

-- 5. Verificar se RLS está habilitado
SELECT
  'RLS STATUS:' as info,
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'training_microcycles',
    'training_sessions',
    'training_activity_blocks',
    'training_activities',
    'athletes'
  )
ORDER BY tablename;

-- 6. Listar políticas RLS existentes
SELECT
  'POLÍTICAS RLS:' as info,
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Finalização
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'DIAGNÓSTICO COMPLETO!';
  RAISE NOTICE 'Copie TODA a saída acima e me envie';
  RAISE NOTICE '==============================================';
END $$;
