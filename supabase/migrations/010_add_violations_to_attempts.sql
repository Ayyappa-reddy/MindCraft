-- Add violations column to attempts table for anti-cheat tracking
ALTER TABLE attempts
ADD COLUMN IF NOT EXISTS violations JSONB DEFAULT '[]'::jsonb;

-- Add index for faster querying of attempts with violations
CREATE INDEX IF NOT EXISTS idx_attempts_violations ON attempts USING GIN (violations);

-- Add comment explaining the violations column structure
COMMENT ON COLUMN attempts.violations IS 'Array of violation events: [{type: fullscreen_exit|tab_switch|copy_paste, timestamp: string, count: number}]';

