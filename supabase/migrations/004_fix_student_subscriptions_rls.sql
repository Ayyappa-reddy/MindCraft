-- Fix RLS policies for student_subscriptions to avoid circular reference
-- Since we now allow all authenticated users to read roles (in migration 003),
-- we can directly check admin status without circular dependencies

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Students can view their own subscriptions" ON student_subscriptions;
DROP POLICY IF EXISTS "Admins can view all student subscriptions" ON student_subscriptions;
DROP POLICY IF EXISTS "Students can request subscriptions" ON student_subscriptions;
DROP POLICY IF EXISTS "Admins can manage student subscriptions" ON student_subscriptions;
DROP POLICY IF EXISTS "Admins can update student subscriptions" ON student_subscriptions;
DROP POLICY IF EXISTS "Admins can delete student subscriptions" ON student_subscriptions;

-- Recreate policies with direct role checks

-- Students can view their own subscriptions
CREATE POLICY "Students can view their own subscriptions"
    ON student_subscriptions FOR SELECT
    USING (student_id = auth.uid());

-- Admins can view all student subscriptions
CREATE POLICY "Admins can view all student subscriptions"
    ON student_subscriptions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Students can request subscriptions
CREATE POLICY "Students can request subscriptions"
    ON student_subscriptions FOR INSERT
    WITH CHECK (student_id = auth.uid());

-- Admins can update student subscriptions
CREATE POLICY "Admins can update student subscriptions"
    ON student_subscriptions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can delete student subscriptions
CREATE POLICY "Admins can delete student subscriptions"
    ON student_subscriptions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
