-- Migration: Refactor codes from quiz-based to domain-based
-- This migration renames quiz_codes to domain_codes and links codes to domains instead of quizzes

BEGIN;

-- Step 1: Drop existing foreign key constraints on quiz_codes
ALTER TABLE "public"."quiz_codes" DROP CONSTRAINT IF EXISTS "quiz_codes_quiz_id_fkey";
ALTER TABLE "public"."quiz_codes" DROP CONSTRAINT IF EXISTS "quiz_codes_author_id_fkey";

-- Step 2: Drop existing foreign key constraints on user_quiz_codes
ALTER TABLE "public"."user_quiz_codes" DROP CONSTRAINT IF EXISTS "user_quiz_codes_quiz_code_id_fkey";
ALTER TABLE "public"."user_quiz_codes" DROP CONSTRAINT IF EXISTS "user_quiz_codes_quiz_id_fkey";
ALTER TABLE "public"."user_quiz_codes" DROP CONSTRAINT IF EXISTS "user_quiz_codes_user_id_fkey";

-- Step 3: Rename quiz_codes table to domain_codes
ALTER TABLE "public"."quiz_codes" RENAME TO "domain_codes";

-- Step 4: Rename quiz_id column to domain_id in domain_codes table
ALTER TABLE "public"."domain_codes" RENAME COLUMN "quiz_id" TO "domain_id";

-- Step 5: Rename user_quiz_codes table to user_domain_codes
ALTER TABLE "public"."user_quiz_codes" RENAME TO "user_domain_codes";

-- Step 6: Rename columns in user_domain_codes table
ALTER TABLE "public"."user_domain_codes" RENAME COLUMN "quiz_code_id" TO "domain_code_id";
ALTER TABLE "public"."user_domain_codes" RENAME COLUMN "quiz_id" TO "domain_id";

-- Step 7: Add new foreign key constraints for domain_codes
ALTER TABLE "public"."domain_codes"
  ADD CONSTRAINT "domain_codes_domain_id_fkey"
  FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE CASCADE;

ALTER TABLE "public"."domain_codes"
  ADD CONSTRAINT "domain_codes_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- Step 8: Add new foreign key constraints for user_domain_codes
ALTER TABLE "public"."user_domain_codes"
  ADD CONSTRAINT "user_domain_codes_domain_code_id_fkey"
  FOREIGN KEY ("domain_code_id") REFERENCES "public"."domain_codes"("id") ON DELETE CASCADE;

ALTER TABLE "public"."user_domain_codes"
  ADD CONSTRAINT "user_domain_codes_domain_id_fkey"
  FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE CASCADE;

ALTER TABLE "public"."user_domain_codes"
  ADD CONSTRAINT "user_domain_codes_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- Step 9: Update RLS policies for domain_codes (drop old quiz_codes policies)
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON "public"."domain_codes";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."domain_codes";

-- Step 10: Create new RLS policies for domain_codes
CREATE POLICY "Enable insert for users based on user_id"
  ON "public"."domain_codes"
  FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Enable read access for all users"
  ON "public"."domain_codes"
  FOR SELECT
  USING (true);

-- Step 11: Create RLS policies for user_domain_codes
CREATE POLICY "Enable insert for authenticated users"
  ON "public"."user_domain_codes"
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable read access for own codes"
  ON "public"."user_domain_codes"
  FOR SELECT
  USING (auth.uid() = user_id);

COMMIT;
