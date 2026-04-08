-- EXPORTAR TODOS OS DADOS
-- Execute cada bloco separadamente no SQL Editor do Supabase
-- Copie cada resultado JSON e salve no arquivo indicado

-- =============================================
-- 1. CLUBS -> salvar em data/clubs.json
-- =============================================
SELECT json_agg(row_to_json(t)) FROM (
  SELECT * FROM clubs ORDER BY created_at
) t;

-- =============================================
-- 2. ATHLETES -> salvar em data/athletes.json
-- =============================================
SELECT json_agg(row_to_json(t)) FROM (
  SELECT * FROM athletes ORDER BY created_at
) t;

-- =============================================
-- 3. CONTENTS -> salvar em data/contents.json
-- =============================================
SELECT json_agg(row_to_json(t)) FROM (
  SELECT * FROM contents ORDER BY created_at
) t;

-- =============================================
-- 4. STAGES -> salvar em data/stages.json
-- =============================================
SELECT json_agg(row_to_json(t)) FROM (
  SELECT * FROM stages ORDER BY created_at
) t;

-- =============================================
-- 5. ACTIVITY_TITLES -> salvar em data/activity_titles.json
-- =============================================
SELECT json_agg(row_to_json(t)) FROM (
  SELECT * FROM activity_titles ORDER BY created_at
) t;

-- =============================================
-- 6. TRAINING_MICROCYCLES -> salvar em data/microcycles.json
-- =============================================
SELECT json_agg(row_to_json(t)) FROM (
  SELECT * FROM training_microcycles ORDER BY created_at
) t;

-- =============================================
-- 7. TRAINING_SESSIONS -> salvar em data/sessions.json
-- =============================================
SELECT json_agg(row_to_json(t)) FROM (
  SELECT * FROM training_sessions ORDER BY created_at
) t;

-- =============================================
-- 8. TRAINING_ACTIVITY_BLOCKS -> salvar em data/blocks.json
-- =============================================
SELECT json_agg(row_to_json(t)) FROM (
  SELECT * FROM training_activity_blocks ORDER BY created_at
) t;

-- =============================================
-- 9. TRAINING_ACTIVITIES -> salvar em data/activities.json
-- =============================================
SELECT json_agg(row_to_json(t)) FROM (
  SELECT * FROM training_activities ORDER BY created_at
) t;

-- =============================================
-- 10. TRAINING_ACTIVITY_CONTENTS -> salvar em data/activity_contents.json
-- =============================================
SELECT json_agg(row_to_json(t)) FROM (
  SELECT * FROM training_activity_contents
) t;

-- =============================================
-- 11. TRAINING_ACTIVITY_STAGES -> salvar em data/activity_stages.json
-- =============================================
SELECT json_agg(row_to_json(t)) FROM (
  SELECT * FROM training_activity_stages ORDER BY created_at
) t;

-- =============================================
-- 12. TRAINING_ACTIVITY_FILES -> salvar em data/files.json
-- =============================================
SELECT json_agg(row_to_json(t)) FROM (
  SELECT * FROM training_activity_files ORDER BY created_at
) t;

-- =============================================
-- 13. MATCH_PLAYERS -> salvar em data/match_players.json
-- =============================================
SELECT json_agg(row_to_json(t)) FROM (
  SELECT * FROM match_players ORDER BY created_at
) t;

-- =============================================
-- 14. MATCH_EVENTS -> salvar em data/match_events.json
-- =============================================
SELECT json_agg(row_to_json(t)) FROM (
  SELECT * FROM match_events ORDER BY created_at
) t;

-- =============================================
-- 15. TACTICAL_PLAYS -> salvar em data/tactical_plays.json
-- =============================================
SELECT json_agg(row_to_json(t)) FROM (
  SELECT * FROM tactical_plays ORDER BY created_at
) t;
