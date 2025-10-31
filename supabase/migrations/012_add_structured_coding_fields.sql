-- Migration 012: Add structured fields for coding questions

-- Add optional structured fields to questions table for better coding problem presentation
ALTER TABLE questions
ADD COLUMN title TEXT,
ADD COLUMN input_format TEXT,
ADD COLUMN output_format TEXT,
ADD COLUMN examples JSONB,
ADD COLUMN constraints TEXT;

-- Update comments to document the new structure
COMMENT ON COLUMN questions.title IS 'Optional: Question title (e.g., "Sum of Two Numbers")';
COMMENT ON COLUMN questions.input_format IS 'Optional: Description of input format';
COMMENT ON COLUMN questions.output_format IS 'Optional: Description of output format';
COMMENT ON COLUMN questions.examples IS 'Optional: Array of examples [{"input": "...", "output": "...", "explanation": "..."}]';
COMMENT ON COLUMN questions.constraints IS 'Optional: Problem constraints';
COMMENT ON COLUMN questions.question_text IS 'Main question description. Used as fallback if title is not provided.';

