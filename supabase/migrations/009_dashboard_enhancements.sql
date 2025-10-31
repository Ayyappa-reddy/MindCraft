-- Add scheduled_start and scheduled_end columns to exams table
ALTER TABLE exams
ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMP WITH TIME ZONE;

-- Add last_login column to users table (optional, for future use)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'manual', -- 'manual' or 'auto'
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create motivational_quotes table
CREATE TABLE IF NOT EXISTS motivational_quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote TEXT NOT NULL,
    author TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert 10 default motivational quotes
INSERT INTO motivational_quotes (quote, author) VALUES
('Success is not final, failure is not fatal: it is the courage to continue that counts.', 'Winston Churchill'),
('The only way to do great work is to love what you do.', 'Steve Jobs'),
('Innovation distinguishes between a leader and a follower.', 'Steve Jobs'),
('The future belongs to those who believe in the beauty of their dreams.', 'Eleanor Roosevelt'),
('Don''t watch the clock; do what it does. Keep going.', 'Sam Levenson'),
('The expert in anything was once a beginner.', 'Helen Hayes'),
('Your limitation—it''s only your imagination. Push yourself, because no one else is going to do it for you.', NULL),
('Great things never come from comfort zones.', NULL),
('Dream it. Wish it. Do it.', NULL),
('The harder you work for something, the greater you''ll feel when you achieve it.', NULL);

-- Enable RLS for announcements
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Enable RLS for motivational_quotes
ALTER TABLE motivational_quotes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for announcements

-- Students and admins can view all announcements
CREATE POLICY "Anyone can view announcements"
    ON announcements FOR SELECT
    USING (true);

-- Only admins can insert announcements
CREATE POLICY "Admins can insert announcements"
    ON announcements FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can update announcements
CREATE POLICY "Admins can update announcements"
    ON announcements FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can delete announcements
CREATE POLICY "Admins can delete announcements"
    ON announcements FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for motivational_quotes

-- Anyone can view quotes
CREATE POLICY "Anyone can view quotes"
    ON motivational_quotes FOR SELECT
    USING (true);

-- Only admins can insert quotes
CREATE POLICY "Admins can insert quotes"
    ON motivational_quotes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can update quotes
CREATE POLICY "Admins can update quotes"
    ON motivational_quotes FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can delete quotes
CREATE POLICY "Admins can delete quotes"
    ON motivational_quotes FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_exams_scheduled_start ON exams(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_exams_scheduled_end ON exams(scheduled_end);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_motivational_quotes_created_at ON motivational_quotes(created_at DESC);

