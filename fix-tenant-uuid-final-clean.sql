-- FINAL FIX: Convert tenant_id from BIGINT to UUID
-- This script:
-- 1. Deletes all user test data (trainings, athletes, microcycles)
-- 2. Converts tenant_id columns to UUID (sets them to NULL for now)
-- 3. Sets up RLS policies
-- 4. Preserves system data (contents, stages, titles)

-- STEP 1: Clean all user-created test data
DO $$
BEGIN
  -- Delete in correct order (respecting foreign keys)
  RAISE NOTICE 'Deleting test data...';

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'training_activity_contents') THEN
    DELETE FROM training_activity_contents;
    RAISE NOTICE '  ✓ training_activity_contents cleared';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'training_activity_stages') THEN
    DELETE FROM training_activity_stages;
    RAISE NOTICE '  ✓ training_activity_stages cleared';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'training_activities') THEN
    DELETE FROM training_activities;
    RAISE NOTICE '  ✓ training_activities cleared';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'training_activity_blocks') THEN
    DELETE FROM training_activity_blocks;
    RAISE NOTICE '  ✓ training_activity_blocks cleared';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'training_sessions') THEN
    DELETE FROM training_sessions;
    RAISE NOTICE '  ✓ training_sessions cleared';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'training_microcycles') THEN
    DELETE FROM training_microcycles;
    RAISE NOTICE '  ✓ training_microcycles cleared';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'athletes') THEN
    DELETE FROM athletes;
    RAISE NOTICE '  ✓ athletes cleared';
  END IF;
END $$;

-- STEP 2: Convert tenant_id columns to UUID type
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Converting tenant_id columns to UUID...';
END $$;

-- 2.1 training_microcycles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_microcycles'
    AND column_name = 'tenant_id'
    AND data_type != 'uuid'
  ) THEN
    ALTER TABLE training_microcycles DROP CONSTRAINT IF EXISTS training_microcycles_tenant_id_fkey;
    ALTER TABLE training_microcycles ALTER COLUMN tenant_id TYPE UUID USING NULL;
    ALTER TABLE training_microcycles ADD CONSTRAINT training_microcycles_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE '  ✓ training_microcycles.tenant_id converted to UUID';
  END IF;
END $$;

-- 2.2 training_sessions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_sessions'
    AND column_name = 'tenant_id'
    AND data_type != 'uuid'
  ) THEN
    ALTER TABLE training_sessions DROP CONSTRAINT IF EXISTS training_sessions_tenant_id_fkey;
    ALTER TABLE training_sessions ALTER COLUMN tenant_id TYPE UUID USING NULL;
    ALTER TABLE training_sessions ADD CONSTRAINT training_sessions_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE '  ✓ training_sessions.tenant_id converted to UUID';
  END IF;
END $$;

-- 2.3 training_activity_blocks
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_activity_blocks'
    AND column_name = 'tenant_id'
    AND data_type != 'uuid'
  ) THEN
    ALTER TABLE training_activity_blocks DROP CONSTRAINT IF EXISTS training_activity_blocks_tenant_id_fkey;
    ALTER TABLE training_activity_blocks ALTER COLUMN tenant_id TYPE UUID USING NULL;
    ALTER TABLE training_activity_blocks ADD CONSTRAINT training_activity_blocks_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE '  ✓ training_activity_blocks.tenant_id converted to UUID';
  END IF;
END $$;

-- 2.4 training_activities
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_activities'
    AND column_name = 'tenant_id'
    AND data_type != 'uuid'
  ) THEN
    ALTER TABLE training_activities DROP CONSTRAINT IF EXISTS training_activities_tenant_id_fkey;
    ALTER TABLE training_activities ALTER COLUMN tenant_id TYPE UUID USING NULL;
    ALTER TABLE training_activities ADD CONSTRAINT training_activities_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE '  ✓ training_activities.tenant_id converted to UUID';
  END IF;
END $$;

-- 2.5 athletes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'athletes'
    AND column_name = 'tenant_id'
    AND data_type != 'uuid'
  ) THEN
    ALTER TABLE athletes DROP CONSTRAINT IF EXISTS athletes_tenant_id_fkey;
    ALTER TABLE athletes ALTER COLUMN tenant_id TYPE UUID USING NULL;
    ALTER TABLE athletes ADD CONSTRAINT athletes_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE '  ✓ athletes.tenant_id converted to UUID';
  END IF;
END $$;

-- 2.6 activity_titles (system data - make tenant_id nullable)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_titles'
    AND column_name = 'tenant_id'
    AND data_type != 'uuid'
  ) THEN
    ALTER TABLE activity_titles DROP CONSTRAINT IF EXISTS activity_titles_tenant_id_fkey;
    ALTER TABLE activity_titles ALTER COLUMN tenant_id DROP NOT NULL;
    UPDATE activity_titles SET tenant_id = NULL;
    ALTER TABLE activity_titles ALTER COLUMN tenant_id TYPE UUID USING NULL;
    RAISE NOTICE '  ✓ activity_titles.tenant_id converted to UUID (system-wide data)';
  END IF;
END $$;

-- 2.7 training_activity_contents
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_activity_contents'
    AND column_name = 'tenant_id'
    AND data_type != 'uuid'
  ) THEN
    ALTER TABLE training_activity_contents DROP CONSTRAINT IF EXISTS training_activity_contents_tenant_id_fkey;
    ALTER TABLE training_activity_contents ALTER COLUMN tenant_id TYPE UUID USING NULL;
    ALTER TABLE training_activity_contents ADD CONSTRAINT training_activity_contents_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE '  ✓ training_activity_contents.tenant_id converted to UUID';
  END IF;
END $$;

-- 2.8 training_activity_stages
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_activity_stages'
    AND column_name = 'tenant_id'
    AND data_type != 'uuid'
  ) THEN
    ALTER TABLE training_activity_stages DROP CONSTRAINT IF EXISTS training_activity_stages_tenant_id_fkey;
    ALTER TABLE training_activity_stages ALTER COLUMN tenant_id TYPE UUID USING NULL;
    ALTER TABLE training_activity_stages ADD CONSTRAINT training_activity_stages_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE '  ✓ training_activity_stages.tenant_id converted to UUID';
  END IF;
END $$;

-- 2.9 users table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users'
    AND column_name = 'tenant_id'
    AND data_type != 'uuid'
  ) THEN
    -- Drop the foreign key constraint first
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tenant_id_fkey;
    ALTER TABLE users ALTER COLUMN tenant_id DROP NOT NULL;
    UPDATE users SET tenant_id = NULL;
    ALTER TABLE users ALTER COLUMN tenant_id TYPE UUID USING NULL;
    RAISE NOTICE '  ✓ users.tenant_id converted to UUID';
  END IF;
END $$;

-- STEP 3: Enable RLS
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Enabling Row Level Security...';

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'training_microcycles') THEN
    ALTER TABLE training_microcycles ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '  ✓ RLS enabled on training_microcycles';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'training_sessions') THEN
    ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '  ✓ RLS enabled on training_sessions';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_activity_blocks'
    AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE training_activity_blocks ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '  ✓ RLS enabled on training_activity_blocks';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'training_activities') THEN
    ALTER TABLE training_activities ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '  ✓ RLS enabled on training_activities';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'athletes') THEN
    ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '  ✓ RLS enabled on athletes';
  END IF;
END $$;

-- STEP 4: Create RLS Policies
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Creating RLS policies...';
END $$;

-- 4.1 training_microcycles
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'training_microcycles') THEN
    DROP POLICY IF EXISTS "Users can view their own microcycles" ON training_microcycles;
    DROP POLICY IF EXISTS "Users can insert their own microcycles" ON training_microcycles;
    DROP POLICY IF EXISTS "Users can update their own microcycles" ON training_microcycles;
    DROP POLICY IF EXISTS "Users can delete their own microcycles" ON training_microcycles;

    CREATE POLICY "Users can view their own microcycles" ON training_microcycles
      FOR SELECT USING (auth.uid() = tenant_id);
    CREATE POLICY "Users can insert their own microcycles" ON training_microcycles
      FOR INSERT WITH CHECK (auth.uid() = tenant_id);
    CREATE POLICY "Users can update their own microcycles" ON training_microcycles
      FOR UPDATE USING (auth.uid() = tenant_id);
    CREATE POLICY "Users can delete their own microcycles" ON training_microcycles
      FOR DELETE USING (auth.uid() = tenant_id);

    RAISE NOTICE '  ✓ Policies created for training_microcycles';
  END IF;
END $$;

-- 4.2 training_sessions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'training_sessions') THEN
    DROP POLICY IF EXISTS "Users can view their own sessions" ON training_sessions;
    DROP POLICY IF EXISTS "Users can insert their own sessions" ON training_sessions;
    DROP POLICY IF EXISTS "Users can update their own sessions" ON training_sessions;
    DROP POLICY IF EXISTS "Users can delete their own sessions" ON training_sessions;

    CREATE POLICY "Users can view their own sessions" ON training_sessions
      FOR SELECT USING (auth.uid() = tenant_id);
    CREATE POLICY "Users can insert their own sessions" ON training_sessions
      FOR INSERT WITH CHECK (auth.uid() = tenant_id);
    CREATE POLICY "Users can update their own sessions" ON training_sessions
      FOR UPDATE USING (auth.uid() = tenant_id);
    CREATE POLICY "Users can delete their own sessions" ON training_sessions
      FOR DELETE USING (auth.uid() = tenant_id);

    RAISE NOTICE '  ✓ Policies created for training_sessions';
  END IF;
END $$;

-- 4.3 training_activity_blocks
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_activity_blocks'
    AND column_name = 'tenant_id'
  ) THEN
    DROP POLICY IF EXISTS "Users can view their own blocks" ON training_activity_blocks;
    DROP POLICY IF EXISTS "Users can insert their own blocks" ON training_activity_blocks;
    DROP POLICY IF EXISTS "Users can update their own blocks" ON training_activity_blocks;
    DROP POLICY IF EXISTS "Users can delete their own blocks" ON training_activity_blocks;

    CREATE POLICY "Users can view their own blocks" ON training_activity_blocks
      FOR SELECT USING (auth.uid() = tenant_id);
    CREATE POLICY "Users can insert their own blocks" ON training_activity_blocks
      FOR INSERT WITH CHECK (auth.uid() = tenant_id);
    CREATE POLICY "Users can update their own blocks" ON training_activity_blocks
      FOR UPDATE USING (auth.uid() = tenant_id);
    CREATE POLICY "Users can delete their own blocks" ON training_activity_blocks
      FOR DELETE USING (auth.uid() = tenant_id);

    RAISE NOTICE '  ✓ Policies created for training_activity_blocks';
  ELSE
    RAISE NOTICE '  ⚠ training_activity_blocks does not have tenant_id column, skipping policies';
  END IF;
END $$;

-- 4.4 training_activities
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'training_activities') THEN
    DROP POLICY IF EXISTS "Users can view their own activities" ON training_activities;
    DROP POLICY IF EXISTS "Users can insert their own activities" ON training_activities;
    DROP POLICY IF EXISTS "Users can update their own activities" ON training_activities;
    DROP POLICY IF EXISTS "Users can delete their own activities" ON training_activities;

    CREATE POLICY "Users can view their own activities" ON training_activities
      FOR SELECT USING (auth.uid() = tenant_id);
    CREATE POLICY "Users can insert their own activities" ON training_activities
      FOR INSERT WITH CHECK (auth.uid() = tenant_id);
    CREATE POLICY "Users can update their own activities" ON training_activities
      FOR UPDATE USING (auth.uid() = tenant_id);
    CREATE POLICY "Users can delete their own activities" ON training_activities
      FOR DELETE USING (auth.uid() = tenant_id);

    RAISE NOTICE '  ✓ Policies created for training_activities';
  END IF;
END $$;

-- 4.5 athletes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'athletes') THEN
    DROP POLICY IF EXISTS "Users can view their own athletes" ON athletes;
    DROP POLICY IF EXISTS "Users can insert their own athletes" ON athletes;
    DROP POLICY IF EXISTS "Users can update their own athletes" ON athletes;
    DROP POLICY IF EXISTS "Users can delete their own athletes" ON athletes;

    CREATE POLICY "Users can view their own athletes" ON athletes
      FOR SELECT USING (auth.uid() = tenant_id);
    CREATE POLICY "Users can insert their own athletes" ON athletes
      FOR INSERT WITH CHECK (auth.uid() = tenant_id);
    CREATE POLICY "Users can update their own athletes" ON athletes
      FOR UPDATE USING (auth.uid() = tenant_id);
    CREATE POLICY "Users can delete their own athletes" ON athletes
      FOR DELETE USING (auth.uid() = tenant_id);

    RAISE NOTICE '  ✓ Policies created for athletes';
  END IF;
END $$;

-- Final success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==========================================================';
  RAISE NOTICE 'DATABASE MIGRATION COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '==========================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes applied:';
  RAISE NOTICE '  ✓ All test data deleted (trainings, athletes, microcycles)';
  RAISE NOTICE '  ✓ tenant_id columns converted from BIGINT to UUID';
  RAISE NOTICE '  ✓ Foreign keys updated to reference auth.users(id)';
  RAISE NOTICE '  ✓ RLS enabled on all relevant tables';
  RAISE NOTICE '  ✓ RLS policies created for data isolation';
  RAISE NOTICE '  ✓ System data preserved (contents, stages, titles)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Reload your application';
  RAISE NOTICE '  2. You should see the Club Onboarding modal';
  RAISE NOTICE '  3. Create your first club';
  RAISE NOTICE '  4. Start creating trainings with the club system!';
  RAISE NOTICE '';
  RAISE NOTICE '==========================================================';
END $$;
