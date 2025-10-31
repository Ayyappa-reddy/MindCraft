-- Fix RLS policies for questions table
-- The problem: Students can only view questions after they have an attempt, creating a chicken-and-egg problem
-- Solution: Allow students to view questions from exams in their approved subscriptions

-- Drop existing policy
DROP POLICY IF EXISTS "Students can view questions from attempted exams" ON questions;

-- Allow students to view questions from exams in their approved subscriptions
CREATE POLICY "Students can view questions from approved exams"
    ON questions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM exams e
            INNER JOIN student_subscriptions ss ON ss.subscription_id = e.subscription_id
            WHERE e.id = questions.exam_id
            AND ss.student_id = auth.uid()
            AND ss.status = 'approved'
        )
    );

-- Also allow students to view questions for results/review (from attempted exams)
CREATE POLICY "Students can view questions from attempted exams"
    ON questions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM attempts
            WHERE exam_id = questions.exam_id
            AND student_id = auth.uid()
        )
    );

