# Setting Up Storage Bucket for Inspection Images

## Quick Setup Guide

Storage policies in Supabase must be created through the Dashboard (not via migrations).

### Step 1: Create the Bucket

1. Go to your Supabase Dashboard: https://cwjkepajlhothqldygfr.supabase.co
2. Click **Storage** in the left sidebar
3. Click **New bucket**
4. Enter:
   - **Name:** `inspection-images`
   - **Public bucket:** ✅ Check this box
5. Click **Create bucket**

### Step 2: Add Storage Policies

1. Click on the `inspection-images` bucket
2. Go to **Policies** tab
3. Click **New policy**
4. For each policy below, click **Create policy** and use the **Custom policy** option:

#### Policy 1: Users Upload Their Own Images
- **Policy name:** Users can upload their own inspection images
- **Allowed operation:** INSERT
- **Target roles:** authenticated
- **WITH CHECK expression:**
```sql
(bucket_id = 'inspection-images' AND (storage.foldername(name))[1] = (auth.uid())::text)
```

#### Policy 2: Users View Their Own Images
- **Policy name:** Users can view their own inspection images
- **Allowed operation:** SELECT
- **Target roles:** authenticated
- **USING expression:**
```sql
(bucket_id = 'inspection-images' AND (storage.foldername(name))[1] = (auth.uid())::text)
```

#### Policy 3: Admins View All Images
- **Policy name:** Admins can view all inspection images
- **Allowed operation:** SELECT
- **Target roles:** authenticated
- **USING expression:**
```sql
(bucket_id = 'inspection-images' AND public.has_role(auth.uid(), 'admin'))
```

#### Policy 4: Users Delete Their Own Images
- **Policy name:** Users can delete their own inspection images
- **Allowed operation:** DELETE
- **Target roles:** authenticated
- **USING expression:**
```sql
(bucket_id = 'inspection-images' AND (storage.foldername(name))[1] = (auth.uid())::text)
```

#### Policy 5: Admins Delete Any Image
- **Policy name:** Admins can delete any inspection image
- **Allowed operation:** DELETE
- **Target roles:** authenticated
- **USING expression:**
```sql
(bucket_id = 'inspection-images' AND public.has_role(auth.uid(), 'admin'))
```

#### Policy 6: Public Can View Images
- **Policy name:** Public can view inspection images
- **Allowed operation:** SELECT
- **Target roles:** public
- **USING expression:**
```sql
bucket_id = 'inspection-images'
```

### Step 3: Verify Setup

After adding all policies, you should have:
- ✅ 1 bucket named `inspection-images` (public)
- ✅ 6 storage policies

Now the image upload will work with proper security! 🎉

## Testing

1. Capture an image in the app
2. Save the inspection
3. Check that:
   - Image appears in admin dashboard
   - File is stored under `inspection-images/{user_id}/` in Storage
   - Only the owner and admins can access the image
