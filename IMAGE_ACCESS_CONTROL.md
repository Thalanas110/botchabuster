# Image Access Control - Security Documentation

## Current Setup (Implemented)

### Database RLS Policies (Inspections Table)
✅ **Users:** Can only view/edit/delete their OWN inspections
✅ **Admins:** Can view/delete ALL inspections
⚠️ **Public (anon):** Can view ALL inspections (for landing page stats - see note below)

### Storage Bucket Policies (Inspection Images)
✅ **Users:** Can upload/view/delete images in their own folder (`{user_id}/*`)
✅ **Admins:** Can view/delete ALL images
✅ **Public:** Can view images IF they have the URL (needed for displaying in UI)

## How It Works

### Image Storage Structure
```
inspection-images/
  ├── {user-id-1}/
  │   ├── 1234567890.jpg
  │   └── 1234567899.jpg
  └── {user-id-2}/
      └── 1234567891.jpg
```

### Access Control Flow

1. **Inspector/User Upload:**
   - User captures image → Frontend sends to backend API
   - Backend validates file (type, size, authentication)
   - Backend uploads to Storage in user's folder: `{user_id}/{timestamp}.jpg`
   - RLS ensures users can only write to their own folder

2. **Viewing Images:**
   - **Regular Users:** Can only see inspections WHERE `user_id = auth.uid()`
   - **Admins:** Can see ALL inspections in admin dashboard
   - Storage URLs are public but organized by user_id (not easily guessable)

3. **Backend API Security:**
   - `/api/upload/inspection-image` requires authentication
   - Validates user_id matches authenticated user
   - File type/size validation (10MB max, images only)

## Security Notes

### ⚠️ Public Inspection Access
There's currently a policy allowing public (unauthenticated) access to view ALL inspections:
```sql
CREATE POLICY "Public can view inspections for read access"
  ON public.inspections FOR SELECT TO anon USING (true);
```

**Reason:** This is likely for landing page statistics (showing public metrics)

**Recommendation:** If you don't need public stats, remove this policy for better security.

## Future Update: Inspector History Page

### Requirements
When implementing the inspector history page:
- Inspectors should only see THEIR OWN inspection history
- Images should only load for their own inspections
- Already handled by existing RLS policies! ✅

### Implementation Notes
```typescript
// This will automatically filter by user_id due to RLS:
const { data } = await supabase
  .from('inspections')
  .select('*')
  .order('created_at', { ascending: false });

// RLS ensures this only returns WHERE auth.uid() = user_id
// Admins automatically see all via "Admins can view all inspections" policy
```

## Testing Access Control

1. **Test as Regular User:**
   - Should only see own inspections
   - Should only be able to upload to own folder
   - Cannot see other users' data

2. **Test as Admin:**
   - Should see ALL inspections
   - Can delete any inspection
   - Can view all images

3. **Test Storage URLs:**
   - Public URLs work (needed for displaying images)
   - But paths include user_id (not easily guessable)

## Apply Storage Policies

Run the migration:
```bash
cd frontend
npx supabase migration up
```

Or manually apply in Supabase Dashboard > Storage > inspection-images > Policies
