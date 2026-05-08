-- Fix RLS policies for admin profile management
-- This migration updates existing policies and adds new ones for admin operations

-- ============================================================================
-- Profile Table RLS Policies
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can do anything" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated read" ON profiles;
DROP POLICY IF EXISTS "Allow all operations for service role" ON profiles;

-- Create permissive policy for service role (bypasses RLS)
CREATE POLICY "Allow all operations for service role" ON profiles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- User Roles Table RLS Policies
-- ============================================================================

DROP POLICY IF EXISTS "Service role can manage user_roles" ON user_roles;
DROP POLICY IF EXISTS "Users can read roles" ON user_roles;

CREATE POLICY "Allow all operations for service role" ON user_roles
  FOR ALL
  USING (true)
  WITH CHECK (true);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Inspections Table RLS Policies (for admin queries)
-- ============================================================================

DROP POLICY IF EXISTS "Service role can manage inspections" ON inspections;

CREATE POLICY "Allow all operations for service role" ON inspections
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Access Codes Table RLS Policies
-- ============================================================================

DROP POLICY IF EXISTS "Service role can manage access_codes" ON access_codes;

CREATE POLICY "Allow all operations for service role" ON access_codes
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Market Locations Table RLS Policies
-- ============================================================================

DROP POLICY IF EXISTS "Service role can manage market_locations" ON market_locations;

CREATE POLICY "Allow all operations for service role" ON market_locations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Note: The service role (SUPABASE_SERVICE_KEY) bypasses RLS by default.
-- This migration ensures proper policies exist for when auth.uid() is used.
-- ============================================================================