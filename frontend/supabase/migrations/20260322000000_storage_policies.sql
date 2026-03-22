-- Storage policies must be created via Supabase Dashboard
-- This file documents the required setup

-- ============================================================================
-- MANUAL SETUP REQUIRED - Follow these steps in Supabase Dashboard
-- ============================================================================

-- Step 1: Create Storage Bucket
-- Go to: Storage > Create a new bucket
-- Name: inspection-images
-- Public: Yes (checked)
-- Click: Create bucket

-- Step 2: Add Storage Policies
-- Go to: Storage > inspection-images > Policies > New policy

-- POLICY 1: Users can upload their own images
-- Operation: INSERT
-- Name: Users can upload their own inspection images
-- Target roles: authenticated
-- WITH CHECK expression:
(bucket_id = 'inspection-images'::text AND ((storage.foldername(name))[1] = (auth.uid())::text))

-- POLICY 2: Users can view their own images
-- Operation: SELECT
-- Name: Users can view their own inspection images
-- Target roles: authenticated
-- USING expression:
(bucket_id = 'inspection-images'::text AND ((storage.foldername(name))[1] = (auth.uid())::text))

-- POLICY 3: Admins can view all images
-- Operation: SELECT
-- Name: Admins can view all inspection images
-- Target roles: authenticated
-- USING expression:
(bucket_id = 'inspection-images'::text AND public.has_role(auth.uid(), 'admin'::text))

-- POLICY 4: Users can delete their own images
-- Operation: DELETE
-- Name: Users can delete their own inspection images
-- Target roles: authenticated
-- USING expression:
(bucket_id = 'inspection-images'::text AND ((storage.foldername(name))[1] = (auth.uid())::text))

-- POLICY 5: Admins can delete any image
-- Operation: DELETE
-- Name: Admins can delete any inspection image
-- Target roles: authenticated
-- USING expression:
(bucket_id = 'inspection-images'::text AND public.has_role(auth.uid(), 'admin'::text))

-- POLICY 6: Public can view images (needed for displaying in UI)
-- Operation: SELECT
-- Name: Public can view inspection images
-- Target roles: public
-- USING expression:
(bucket_id = 'inspection-images'::text)

-- ============================================================================
-- After creating policies, images will have proper access control:
-- - Users can only upload/view/delete their own images (folder: {user_id}/*)
-- - Admins can view/delete ALL images
-- - Public URLs work for displaying images in the UI
-- ============================================================================
