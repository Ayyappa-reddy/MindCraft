-- Add per-student attempt limits tracking

CREATE TABLE IF NOT EXISTS student_attempt_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    extra_attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, exam_id)
);

-- Create indexes
CREATE INDEX idx_student_attempt_limits_student ON student_attempt_limits(student_id);
CREATE INDEX idx_student_attempt_limits_exam ON student_attempt_limits(exam_id);

-- Enable RLS
ALTER TABLE student_attempt_limits ENABLE ROW LEVEL SECURITY;

-- Students can view their own limits
CREATE POLICY "Students can view their own attempt limits"
    ON student_attempt_limits FOR SELECT
    USING (student_id = auth.uid());

-- Admins can manage attempt limits
CREATE POLICY "Admins can manage attempt limits"
    ON student_attempt_limits FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

