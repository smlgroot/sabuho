
ALTER TABLE "public"."resource_session_questions"
ADD COLUMN IF NOT EXISTS "is_sample" boolean DEFAULT true;
