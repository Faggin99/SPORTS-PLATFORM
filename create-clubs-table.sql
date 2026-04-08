-- Create clubs table
CREATE TABLE IF NOT EXISTS clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  logo_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- Enable RLS
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clubs
CREATE POLICY "Users can view their own clubs"
  ON clubs FOR SELECT
  USING (auth.uid() = tenant_id);

CREATE POLICY "Users can insert their own clubs"
  ON clubs FOR INSERT
  WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Users can update their own clubs"
  ON clubs FOR UPDATE
  USING (auth.uid() = tenant_id);

CREATE POLICY "Users can delete their own clubs"
  ON clubs FOR DELETE
  USING (auth.uid() = tenant_id);

-- Add club_id to existing tables that need club association
ALTER TABLE training_microcycles
ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;

ALTER TABLE athletes
ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clubs_tenant_id ON clubs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_microcycles_club_id ON training_microcycles(club_id);
CREATE INDEX IF NOT EXISTS idx_athletes_club_id ON athletes(club_id);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clubs_updated_at
  BEFORE UPDATE ON clubs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
