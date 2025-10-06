-- Drop the existing restrictive INSERT policy for avatars
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;

-- Create a new policy that allows uploads during registration
-- This allows both authenticated users and users during signup to upload their avatar
CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND (
    -- Allow authenticated users to upload to their own folder
    (auth.uid()::text = (storage.foldername(name))[1])
    OR
    -- Allow unauthenticated users during signup to upload
    -- (they can only upload, not read/update/delete without auth)
    (auth.uid() IS NULL AND bucket_id = 'avatars')
  )
);