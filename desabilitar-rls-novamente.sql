-- Desabilitar RLS em todas as tabelas (temporariamente para desenvolvimento)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE athletes DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_microcycles DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_activity_blocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE contents DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_titles DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_activity_contents DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_activity_stages DISABLE ROW LEVEL SECURITY;
ALTER TABLE stages DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_activity_files DISABLE ROW LEVEL SECURITY;

-- Verificar
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
