-- 1. Create a new storage bucket for medication images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('medication_images', 'medication_images', true);

-- 2. Allow public access to view images (SELECT)
CREATE POLICY "Allow public view access" ON storage.objects
  FOR SELECT USING (bucket_id = 'medication_images');

-- 3. Allow authenticated users to upload images (INSERT)
CREATE POLICY "Allow authenticated users to upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'medication_images');

-- 4. Allow users to update their own images
CREATE POLICY "Allow users to update own images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'medication_images' AND owner = auth.uid());

-- 5. Allow users to delete their own images
CREATE POLICY "Allow users to delete own images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'medication_images' AND owner = auth.uid());
