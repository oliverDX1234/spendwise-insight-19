-- Revert to the secure policy
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;

-- Restore the original secure policy
CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND (auth.uid()::text = (storage.foldername(name))[1])
);