-- Create club-logos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('club-logos', 'club-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS for club-logos bucket
-- Note: Storage policies will be added after bucket creation via Supabase Dashboard
-- The policies need to check if the folder name matches a club ID owned by the user

CREATE POLICY "Club logos are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'club-logos');
