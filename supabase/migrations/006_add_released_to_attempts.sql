-- Add released column to attempts table to support manual result release

ALTER TABLE attempts
ADD COLUMN IF NOT EXISTS released BOOLEAN NOT NULL DEFAULT false;

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_attempts_released ON attempts(released);

-- Update existing attempts: set released = true for exams with auto release mode
UPDATE attempts
SET released = true
WHERE exam_id IN (
  SELECT id FROM exams WHERE release_mode = 'auto'
);

