-- ADD author_id column if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'quizzes' AND column_name = 'author_id'
  ) THEN
    ALTER TABLE "public"."quizzes" ADD COLUMN "author_id" uuid NOT NULL;
  END IF;
END $$;

-- Set column NOT NULL (won't fail if already set)
ALTER TABLE "public"."quizzes" ALTER COLUMN "domains" SET NOT NULL;

-- ADD quiz_sessions_domain_id_fkey if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'quiz_sessions_domain_id_fkey' AND table_schema = 'public' AND table_name = 'quiz_sessions'
  ) THEN
    ALTER TABLE "public"."quiz_sessions" ADD CONSTRAINT "quiz_sessions_domain_id_fkey" FOREIGN KEY (domain_id) REFERENCES domains(id) NOT VALID;
  END IF;
END $$;

ALTER TABLE "public"."quiz_sessions" VALIDATE CONSTRAINT "quiz_sessions_domain_id_fkey";

-- ADD quizzes_user_id_fkey on author_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'quizzes_user_id_fkey' AND table_schema = 'public' AND table_name = 'quizzes'
  ) THEN
    ALTER TABLE "public"."quizzes" ADD CONSTRAINT "quizzes_user_id_fkey" FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

ALTER TABLE "public"."quizzes" VALIDATE CONSTRAINT "quizzes_user_id_fkey";

-- CREATE policies only if they do not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'quizzes_modify_own' AND schemaname = 'public' AND tablename = 'quizzes'
  ) THEN
    EXECUTE '
      CREATE POLICY "quizzes_modify_own"
      ON "public"."quizzes"
      AS PERMISSIVE
      FOR ALL
      TO public
      USING ((auth.uid() = author_id))
      WITH CHECK ((auth.uid() = author_id))
    ';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'quizzes_select_own' AND schemaname = 'public' AND tablename = 'quizzes'
  ) THEN
    EXECUTE '
      CREATE POLICY "quizzes_select_own"
      ON "public"."quizzes"
      AS PERMISSIVE
      FOR SELECT
      TO public
      USING ((auth.uid() = author_id))
    ';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Give users access to own folder 128fyud_0' AND schemaname = 'storage' AND tablename = 'objects'
  ) THEN
    EXECUTE '
      CREATE POLICY "Give users access to own folder 128fyud_0"
      ON "storage"."objects"
      AS PERMISSIVE
      FOR SELECT
      TO public
      USING (((bucket_id = ''resources''::text) AND (( SELECT (auth.uid())::text AS uid) = (storage.foldername(name))[1])))
    ';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Give users access to own folder 128fyud_1' AND schemaname = 'storage' AND tablename = 'objects'
  ) THEN
    EXECUTE '
      CREATE POLICY "Give users access to own folder 128fyud_1"
      ON "storage"."objects"
      AS PERMISSIVE
      FOR UPDATE
      TO public
      USING (((bucket_id = ''resources''::text) AND (( SELECT (auth.uid())::text AS uid) = (storage.foldername(name))[1])))
    ';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Give users access to own folder 128fyud_2' AND schemaname = 'storage' AND tablename = 'objects'
  ) THEN
    EXECUTE '
      CREATE POLICY "Give users access to own folder 128fyud_2"
      ON "storage"."objects"
      AS PERMISSIVE
      FOR INSERT
      TO public
      WITH CHECK (((bucket_id = ''resources''::text) AND (( SELECT (auth.uid())::text AS uid) = (storage.foldername(name))[1])))
    ';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Give users access to own folder 128fyud_3' AND schemaname = 'storage' AND tablename = 'objects'
  ) THEN
    EXECUTE '
      CREATE POLICY "Give users access to own folder 128fyud_3"
      ON "storage"."objects"
      AS PERMISSIVE
      FOR DELETE
      TO public
      USING (((bucket_id = ''resources''::text) AND (( SELECT (auth.uid())::text AS uid) = (storage.foldername(name))[1])))
    ';
  END IF;
END $$;
