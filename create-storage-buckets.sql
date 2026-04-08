-- Create storage buckets and policies for profile photos and club logos

-- 1. Create profile-photos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create club-logos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('club-logos', 'club-logos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Policies for profile-photos bucket
-- Allow public to view photos
DROP POLICY IF EXISTS "Public can view profile photos" ON storage.objects;
CREATE POLICY "Public can view profile photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-photos');

-- Allow authenticated users to upload their own photos
DROP POLICY IF EXISTS "Users can upload their own profile photos" ON storage.objects;
CREATE POLICY "Users can upload their own profile photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own photos
DROP POLICY IF EXISTS "Users can update their own profile photos" ON storage.objects;
CREATE POLICY "Users can update their own profile photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own photos
DROP POLICY IF EXISTS "Users can delete their own profile photos" ON storage.objects;
CREATE POLICY "Users can delete their own profile photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Policies for club-logos bucket
-- Allow public to view logos
DROP POLICY IF EXISTS "Public can view club logos" ON storage.objects;
CREATE POLICY "Public can view club logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'club-logos');

-- Allow authenticated users to upload club logos
DROP POLICY IF EXISTS "Users can upload club logos" ON storage.objects;
CREATE POLICY "Users can upload club logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'club-logos');

-- Allow users to update club logos
DROP POLICY IF EXISTS "Users can update club logos" ON storage.objects;
CREATE POLICY "Users can update club logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'club-logos');

-- Allow users to delete club logos
DROP POLICY IF EXISTS "Users can delete club logos" ON storage.objects;
CREATE POLICY "Users can delete club logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'club-logos');

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==========================================================';
  RAISE NOTICE 'STORAGE BUCKETS CREATED SUCCESSFULLY!';
  RAISE NOTICE '==========================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Buckets created:';
  RAISE NOTICE '  ✓ profile-photos (for user profile pictures)';
  RAISE NOTICE '  ✓ club-logos (for club/team logos)';
  RAISE NOTICE '';
  RAISE NOTICE 'Storage policies configured:';
  RAISE NOTICE '  ✓ Public read access for all photos';
  RAISE NOTICE '  ✓ Authenticated users can upload/update/delete';
  RAISE NOTICE '  ✓ Profile photos restricted to user folder';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now upload photos!';
  RAISE NOTICE '==========================================================';
END $$;
