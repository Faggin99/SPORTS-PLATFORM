-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  encrypted_password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(50),
  bio TEXT,
  profile_photo TEXT,
  avatar_url TEXT,
  role VARCHAR(50) DEFAULT 'trainer',
  email_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- CLUBS
CREATE TABLE IF NOT EXISTS clubs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  logo_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clubs_tenant ON clubs(tenant_id);

-- ATHLETES
CREATE TABLE IF NOT EXISTS athletes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  position VARCHAR(100),
  jersey_number INTEGER,
  status VARCHAR(50) DEFAULT 'active',
  observation TEXT,
  "group" VARCHAR(50),
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_athletes_tenant ON athletes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_athletes_club ON athletes(club_id);
CREATE INDEX IF NOT EXISTS idx_athletes_tenant_group ON athletes(tenant_id, "group");

-- CONTENTS
CREATE TABLE IF NOT EXISTS contents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  abbreviation VARCHAR(20),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contents_tenant ON contents(tenant_id);

-- STAGES
CREATE TABLE IF NOT EXISTS stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  content_name VARCHAR(255),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stages_tenant ON stages(tenant_id);

-- ACTIVITY TITLES
CREATE TABLE IF NOT EXISTS activity_titles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_id UUID REFERENCES contents(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_titles_tenant ON activity_titles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_titles_content ON activity_titles(content_id);

-- TRAINING MICROCYCLES
CREATE TABLE IF NOT EXISTS training_microcycles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
  week_identifier VARCHAR(20) NOT NULL,
  name VARCHAR(255),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_microcycles_tenant_week ON training_microcycles(tenant_id, week_identifier);
CREATE INDEX IF NOT EXISTS idx_microcycles_tenant_start ON training_microcycles(tenant_id, start_date);

-- TRAINING SESSIONS
CREATE TABLE IF NOT EXISTS training_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  microcycle_id UUID NOT NULL REFERENCES training_microcycles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  day_name VARCHAR(50),
  day_of_week INTEGER,
  session_type VARCHAR(50) DEFAULT 'training',
  opponent_name VARCHAR(255),
  match_duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, date, club_id)
);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant_date ON training_sessions(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_sessions_microcycle ON training_sessions(microcycle_id);

-- TRAINING ACTIVITY BLOCKS
CREATE TABLE IF NOT EXISTS training_activity_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  name VARCHAR(255),
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_blocks_session ON training_activity_blocks(session_id, "order");

-- TRAINING ACTIVITIES
CREATE TABLE IF NOT EXISTS training_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  block_id UUID NOT NULL REFERENCES training_activity_blocks(id) ON DELETE CASCADE,
  title_id UUID REFERENCES activity_titles(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT,
  groups JSONB DEFAULT '[]',
  is_rest BOOLEAN DEFAULT false,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activities_block ON training_activities(block_id);
CREATE INDEX IF NOT EXISTS idx_activities_tenant ON training_activities(tenant_id);

-- TRAINING ACTIVITY CONTENTS (M2M)
CREATE TABLE IF NOT EXISTS training_activity_contents (
  activity_id UUID NOT NULL REFERENCES training_activities(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  PRIMARY KEY (activity_id, content_id)
);

-- TRAINING ACTIVITY STAGES
CREATE TABLE IF NOT EXISTS training_activity_stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES training_activities(id) ON DELETE CASCADE,
  stage_name VARCHAR(255),
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_stages_activity ON training_activity_stages(activity_id, "order");

-- TRAINING ACTIVITY FILES
CREATE TABLE IF NOT EXISTS training_activity_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES training_activities(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  file_name VARCHAR(255),
  file_path TEXT,
  mime_type VARCHAR(100),
  file_size BIGINT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_files_session ON training_activity_files(session_id);
CREATE INDEX IF NOT EXISTS idx_files_tenant ON training_activity_files(tenant_id);

-- MATCH PLAYERS
CREATE TABLE IF NOT EXISTS match_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'starter',
  minutes_played INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, athlete_id)
);

-- MATCH EVENTS
CREATE TABLE IF NOT EXISTS match_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50),
  team VARCHAR(50),
  goal_type VARCHAR(50),
  minute INTEGER,
  player_id UUID REFERENCES athletes(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_match_events_session ON match_events(session_id);

-- TACTICAL PLAYS
CREATE TABLE IF NOT EXISTS tactical_plays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  field_type TEXT NOT NULL CHECK (field_type IN ('football_11', 'futsal')),
  field_view TEXT NOT NULL DEFAULT 'full',
  team_a_color TEXT NOT NULL DEFAULT '#3b82f6',
  team_b_color TEXT NOT NULL DEFAULT '#ef4444',
  keyframes JSONB NOT NULL DEFAULT '[]',
  animation_speed NUMERIC DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tactical_plays_tenant ON tactical_plays(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tactical_plays_club ON tactical_plays(club_id);
CREATE INDEX IF NOT EXISTS idx_tactical_plays_updated ON tactical_plays(updated_at DESC);
