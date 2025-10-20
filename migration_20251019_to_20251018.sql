-- Migration script to transform database from local_schema_20251019.sql to local_schema_20251018.sql
-- Generated on 2025-10-19

BEGIN;

-- 1. Modify domains table
ALTER TABLE public.domains DROP COLUMN IF EXISTS thumbnail_url;
ALTER TABLE public.domains DROP COLUMN IF EXISTS question_count;
ALTER TABLE public.domains ADD COLUMN IF NOT EXISTS domain_type TEXT DEFAULT 'folder' NOT NULL;

-- 2. Modify question_attempts table
ALTER TABLE public.question_attempts DROP COLUMN IF EXISTS correct_answer_id;
ALTER TABLE public.question_attempts DROP COLUMN IF EXISTS combo_multiplier;

-- 3. Modify quiz_attempt_questions table - add new columns
ALTER TABLE public.quiz_attempt_questions
  ADD COLUMN IF NOT EXISTS response_time_ms BIGINT,
  ADD COLUMN IF NOT EXISTS confidence_level DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS selected_answer_index INTEGER,
  ADD COLUMN IF NOT EXISTS scrambled_order JSONB;

-- Add column comments for quiz_attempt_questions
COMMENT ON COLUMN public.quiz_attempt_questions.selected_answer_index IS 'Index of the answer in the ORIGINAL options array that the user selected (0-indexed)';
COMMENT ON COLUMN public.quiz_attempt_questions.scrambled_order IS 'Array mapping display positions to original option indices. Example: [2,0,3,1] means display[0]=original[2]';

-- 4. Modify quiz_attempts table - remove score tracking columns
ALTER TABLE public.quiz_attempts DROP COLUMN IF EXISTS score;
ALTER TABLE public.quiz_attempts DROP COLUMN IF EXISTS num_questions;
ALTER TABLE public.quiz_attempts DROP COLUMN IF EXISTS num_correct;
ALTER TABLE public.quiz_attempts DROP COLUMN IF EXISTS num_skipped;

-- 5. Modify quiz_sessions table - change domain_id to quiz_id
-- First, drop the existing foreign key constraint
ALTER TABLE public.quiz_sessions DROP CONSTRAINT IF EXISTS quiz_sessions_domain_id_fkey;

-- Rename the column
ALTER TABLE public.quiz_sessions RENAME COLUMN domain_id TO quiz_id;

-- Add the new foreign key constraint pointing to quizzes
ALTER TABLE public.quiz_sessions
  ADD CONSTRAINT quiz_sessions_quiz_id_fkey
  FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id);

-- 6. Add duplicate foreign key constraint for question_attempts (as in 20251018 schema)
ALTER TABLE public.question_attempts
  ADD CONSTRAINT question_attempts_session_id_fkey1
  FOREIGN KEY (session_id) REFERENCES public.quiz_sessions(id);

-- 7. Add missing RLS policies for quiz_attempt_questions
DROP POLICY IF EXISTS quiz_attempt_questions_modify_own ON public.quiz_attempt_questions;
CREATE POLICY quiz_attempt_questions_modify_own ON public.quiz_attempt_questions
  USING (EXISTS (
    SELECT 1 FROM public.quiz_attempts qa
    WHERE qa.id = quiz_attempt_questions.quiz_attempt_id
      AND qa.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.quiz_attempts qa
    WHERE qa.id = quiz_attempt_questions.quiz_attempt_id
      AND qa.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS quiz_attempt_questions_select_own ON public.quiz_attempt_questions;
CREATE POLICY quiz_attempt_questions_select_own ON public.quiz_attempt_questions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.quiz_attempts qa
    WHERE qa.id = quiz_attempt_questions.quiz_attempt_id
      AND qa.user_id = auth.uid()
  ));

-- 8. Add missing RLS policies for quiz_attempts
DROP POLICY IF EXISTS quiz_attempts_modify_own ON public.quiz_attempts;
CREATE POLICY quiz_attempts_modify_own ON public.quiz_attempts
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS quiz_attempts_select_own ON public.quiz_attempts;
CREATE POLICY quiz_attempts_select_own ON public.quiz_attempts
  FOR SELECT
  USING (auth.uid() = user_id);

COMMIT;
