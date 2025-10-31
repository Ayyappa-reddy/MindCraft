-- Clear all data except admin users
-- This script will delete all student data, subscriptions, exams, attempts, etc.
-- But preserve admin users and their authentication

-- IMPORTANT: Before running this, note that we CANNOT delete from auth.users via SQL
-- You need to manually delete student auth users from Supabase Dashboard:
-- Go to: Authentication > Users > Select students > Delete

-- Store admin user IDs first
CREATE TEMP TABLE admin_users AS
SELECT id FROM users WHERE role = 'admin';

-- Disable foreign key checks temporarily (PostgreSQL doesn't support this easily)
-- So we delete in the correct order

-- 1. Delete attempts (they reference exams and students)
DELETE FROM attempts;

-- 2. Delete questions (they reference exams)
DELETE FROM questions;

-- 3. Delete exams (they reference subscriptions)
DELETE FROM exams;

-- 4. Delete topics (they reference subscriptions)
DELETE FROM topics;

-- 5. Delete student_subscriptions (they reference students and subscriptions)
DELETE FROM student_subscriptions;

-- 6. Delete subscriptions (they reference admins but we keep admins)
DELETE FROM subscriptions;

-- 7. Delete requests (they reference students and subscriptions)
DELETE FROM requests;

-- 8. Delete all student users from public.users (this keeps auth.users intact)
DELETE FROM users WHERE role = 'student';

-- Verify admin users still exist
DO $$
DECLARE
    admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin';
    IF admin_count = 0 THEN
        RAISE EXCEPTION 'No admin users found! Manual cleanup may be needed.';
    END IF;
    RAISE NOTICE 'Database cleared successfully. % admin user(s) preserved.', admin_count;
    RAISE NOTICE 'Remember to manually delete student auth users from Authentication > Users in dashboard!';
END $$;

-- Drop temp table
DROP TABLE admin_users;

