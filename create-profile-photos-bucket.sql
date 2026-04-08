-- Create profile-photos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS for profile-photos bucket
-- Note: Storage policies will be added after bucket creation via Supabase Dashboard
-- The policies need to check if the folder name matches the user ID

CREATE POLICY "Profile photos are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-photos');
