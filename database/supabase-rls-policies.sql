-- Supabase RLS (Row Level Security) policies for DIP Partner Management System
-- This script implements comprehensive RLS policies for notifications and users tables

-- =============================================================================
-- NOTIFICATIONS TABLE RLS POLICIES
-- =============================================================================

-- 1. Enable RLS on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for rerunning this script)
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;

-- 2. Users can view their own notifications
CREATE POLICY "Users can view own notifications" 
ON notifications 
FOR SELECT 
USING (
  auth.uid()::text = user_id::text 
  OR 
  auth.uid() IN (
    SELECT id::text FROM users WHERE id = notifications.user_id
  )
);

-- 3. Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" 
ON notifications 
FOR UPDATE 
USING (
  auth.uid()::text = user_id::text
  OR 
  auth.uid() IN (
    SELECT id::text FROM users WHERE id = notifications.user_id
  )
)
WITH CHECK (
  auth.uid()::text = user_id::text
  OR 
  auth.uid() IN (
    SELECT id::text FROM users WHERE id = notifications.user_id
  )
);

-- 4. Service role and admins can insert notifications
CREATE POLICY "Service role can insert notifications" 
ON notifications 
FOR INSERT 
WITH CHECK (
  -- Service role her zaman ekleyebilir
  auth.jwt()->>'role' = 'service_role'
  OR 
  -- Admin kullanıcılar ekleyebilir
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id::text = auth.uid()::text 
    AND (users.user_type = 'master_admin' OR users.user_type = 'editor_admin')
  )
  OR
  -- Allow inserts with no authentication context (for server-side operations)
  auth.uid() IS NULL
);

-- 5. Admins can view all notifications
CREATE POLICY "Admins can view all notifications" 
ON notifications 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id::text = auth.uid()::text 
    AND (users.user_type = 'master_admin' OR users.user_type = 'editor_admin')
  )
);

-- =============================================================================
-- USERS TABLE RLS POLICIES
-- =============================================================================

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view profiles" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Service role can manage users" ON users;

-- Users can view profiles (public access for partner listings etc)
CREATE POLICY "Users can view profiles" 
ON users 
FOR SELECT 
USING (
  -- Public profiles for browsing
  true
  OR
  -- Own profile
  id::text = auth.uid()::text
);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON users 
FOR UPDATE 
USING (id::text = auth.uid()::text)
WITH CHECK (id::text = auth.uid()::text);

-- Service role can manage users (for server-side operations)
CREATE POLICY "Service role can manage users"
ON users
FOR ALL
USING (
  auth.jwt()->>'role' = 'service_role'
  OR
  -- Admin users can manage other users
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id::text = auth.uid()::text 
    AND users.user_type = 'master_admin'
  )
)
WITH CHECK (
  auth.jwt()->>'role' = 'service_role'
  OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id::text = auth.uid()::text 
    AND users.user_type = 'master_admin'
  )
);

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Check current RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('notifications', 'users')
ORDER BY tablename, policyname;

-- Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  forcerowsecurity
FROM pg_tables 
WHERE tablename IN ('notifications', 'users');

-- =============================================================================
-- ADDITIONAL POLICIES FOR OTHER TABLES (Optional Enhancement)
-- =============================================================================

-- Partners table RLS (for enhanced security)
-- ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Public can view active partners" 
-- ON partners 
-- FOR SELECT 
-- USING (is_approved = true AND is_active = true AND is_visible = true);

-- CREATE POLICY "Partners can update own profile" 
-- ON partners 
-- FOR UPDATE 
-- USING (
--   user_id IN (
--     SELECT id FROM users WHERE id::text = auth.uid()::text
--   )
-- );

COMMIT;