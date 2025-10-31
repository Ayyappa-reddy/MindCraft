-- Migration 011: Enhance coding questions with hidden test cases and code execution tracking

-- Update test_cases structure to support hidden flag
-- No schema change needed - JSONB already supports any structure
-- This migration adds documentation and ensures proper structure

COMMENT ON COLUMN questions.test_cases IS 'For coding questions: [{"input": "...", "output": "...", "hidden": true/false}]';

-- No ALTER TABLE needed - test_cases is already JSONB
-- The hidden field will be added dynamically in the application layer

-- Ensure attempts table can handle code execution metadata
COMMENT ON COLUMN attempts.answers IS 'Student answers: For MCQ {"questionId": {"answer": "...", "type": "mcq"}}, For Coding {"questionId": {"code": "...", "language": "...", "type": "coding", "testResults": [...], "score": ...}}';


