

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."achievement_category" AS ENUM (
    'streak',
    'accuracy',
    'speed',
    'social',
    'learning',
    'special'
);


ALTER TYPE "public"."achievement_category" OWNER TO "postgres";


CREATE TYPE "public"."celebration_type" AS ENUM (
    'correct_answer',
    'combo_multiplier',
    'speed_bonus',
    'accuracy_milestone',
    'session_complete',
    'personal_best'
);


ALTER TYPE "public"."celebration_type" OWNER TO "postgres";


CREATE TYPE "public"."session_state" AS ENUM (
    'active',
    'paused',
    'completed',
    'abandoned'
);


ALTER TYPE "public"."session_state" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."domain_codes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "author_id" "uuid" NOT NULL,
    "domain_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."domain_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."domains" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "author_id" "uuid" NOT NULL,
    "parent_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "domain_type" "text" DEFAULT 'folder'::"text" NOT NULL
);


ALTER TABLE "public"."domains" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "domain_id" "uuid" NOT NULL,
    "type" "text",
    "body" "text" NOT NULL,
    "explanation" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "difficulty" "text",
    "author_id" "uuid" NOT NULL,
    "resource_id" "uuid",
    "options" "jsonb"
);


ALTER TABLE "public"."questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_attempt_questions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "quiz_attempt_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "is_correct" boolean DEFAULT false NOT NULL,
    "is_skipped" boolean DEFAULT false NOT NULL,
    "is_marked_for_review" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_attempted" boolean,
    "response_time_ms" bigint,
    "confidence_level" double precision,
    "selected_answer_index" integer,
    "scrambled_order" "jsonb"
);


ALTER TABLE "public"."quiz_attempt_questions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."quiz_attempt_questions"."selected_answer_index" IS 'Index of the answer in the ORIGINAL options array that the user selected (0-indexed)';



COMMENT ON COLUMN "public"."quiz_attempt_questions"."scrambled_order" IS 'Array mapping display positions to original option indices. Example: [2,0,3,1] means display[0]=original[2]';



CREATE TABLE IF NOT EXISTS "public"."quiz_attempts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."quiz_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quizzes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "domains" json NOT NULL,
    "is_published" boolean DEFAULT false NOT NULL,
    "num_questions" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "author_id" "uuid" NOT NULL
);


ALTER TABLE "public"."quizzes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resource_session_domains" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "resource_session_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "page_range_start" smallint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "page_range_end" smallint NOT NULL
);


ALTER TABLE "public"."resource_session_domains" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resource_session_questions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "resource_session_domain_id" "uuid" NOT NULL,
    "type" "text" DEFAULT 'multiple_options'::"text",
    "body" "text" NOT NULL,
    "explanation" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resource_session_id" "uuid",
    "options" "jsonb"
);


ALTER TABLE "public"."resource_session_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resource_sessions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "file_path" "text",
    "url" "text",
    "mime_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text",
    "topic_page_range" "jsonb",
    "unparsable" "text"
);


ALTER TABLE "public"."resource_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resources" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "domain_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "file_path" "text",
    "url" "text",
    "mime_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text",
    "author_id" "uuid" NOT NULL,
    "topic_page_range" "jsonb",
    "unparsable" "text"
);


ALTER TABLE "public"."resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trophy_unlocks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "quiz_attempt_id" "uuid" NOT NULL,
    "trophy_type" "text" NOT NULL,
    "trophy_name" "text" NOT NULL,
    "trophy_description" "text" NOT NULL,
    "trophy_icon" "text" NOT NULL,
    "trophy_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "unlocked_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."trophy_unlocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_credits" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "credits" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_credits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_domain_codes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "domain_id" "uuid" NOT NULL,
    "domain_code_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_domain_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "display_name" "text",
    "last_active_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "user_id" "uuid" NOT NULL,
    "currencies" "jsonb",
    "is_creator_enabled" boolean DEFAULT false NOT NULL,
    "terms_accepted" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."domains"
    ADD CONSTRAINT "domains_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_attempt_questions"
    ADD CONSTRAINT "quiz_attempt_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."domain_codes"
    ADD CONSTRAINT "quiz_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resource_session_domains"
    ADD CONSTRAINT "resource_session_domains_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resource_sessions"
    ADD CONSTRAINT "resource_session_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resource_session_questions"
    ADD CONSTRAINT "resource_session_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resources"
    ADD CONSTRAINT "resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trophy_unlocks"
    ADD CONSTRAINT "trophy_unlocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_key" UNIQUE ("user_id");



CREATE INDEX "idx_trophy_unlocks_quiz_attempt_id" ON "public"."trophy_unlocks" USING "btree" ("quiz_attempt_id");



CREATE INDEX "idx_trophy_unlocks_trophy_type" ON "public"."trophy_unlocks" USING "btree" ("trophy_type");



CREATE INDEX "idx_trophy_unlocks_user_id" ON "public"."trophy_unlocks" USING "btree" ("user_id");



ALTER TABLE ONLY "public"."domain_codes"
    ADD CONSTRAINT "domain_codes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."domain_codes"
    ADD CONSTRAINT "domain_codes_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."domains"
    ADD CONSTRAINT "domains_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."domains"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."domains"
    ADD CONSTRAINT "domains_user_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id");



ALTER TABLE ONLY "public"."quiz_attempt_questions"
    ADD CONSTRAINT "quiz_attempt_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_attempt_questions"
    ADD CONSTRAINT "quiz_attempt_questions_quiz_attempt_id_fkey" FOREIGN KEY ("quiz_attempt_id") REFERENCES "public"."quiz_attempts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."domain_codes"
    ADD CONSTRAINT "quizz_codes_quizz_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "public"."quizzes"("id");



ALTER TABLE ONLY "public"."domain_codes"
    ADD CONSTRAINT "quizzes_user_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_user_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resource_session_domains"
    ADD CONSTRAINT "resource_session_domains_resource_session_id_fkey" FOREIGN KEY ("resource_session_id") REFERENCES "public"."resource_sessions"("id");



ALTER TABLE ONLY "public"."resource_session_questions"
    ADD CONSTRAINT "resource_session_questions_resource_session_domain_id_fkey" FOREIGN KEY ("resource_session_domain_id") REFERENCES "public"."resource_session_domains"("id");



ALTER TABLE ONLY "public"."resource_session_questions"
    ADD CONSTRAINT "resource_session_questions_resource_session_id_fkey" FOREIGN KEY ("resource_session_id") REFERENCES "public"."resource_sessions"("id");



ALTER TABLE ONLY "public"."resources"
    ADD CONSTRAINT "resources_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resources"
    ADD CONSTRAINT "resources_user_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trophy_unlocks"
    ADD CONSTRAINT "trophy_unlocks_quiz_attempt_id_fkey" FOREIGN KEY ("quiz_attempt_id") REFERENCES "public"."quiz_attempts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trophy_unlocks"
    ADD CONSTRAINT "trophy_unlocks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_credits"
    ADD CONSTRAINT "user_credits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_domain_codes"
    ADD CONSTRAINT "user_domain_codes_domain_code_id_fkey" FOREIGN KEY ("domain_code_id") REFERENCES "public"."domain_codes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_domain_codes"
    ADD CONSTRAINT "user_domain_codes_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_domain_codes"
    ADD CONSTRAINT "user_domain_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



CREATE POLICY "Allow select for authenticated users" ON "public"."domains" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow select for authenticated users" ON "public"."questions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable insert for authenticated users" ON "public"."user_domain_codes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable insert for users based on user_id" ON "public"."domain_codes" FOR INSERT WITH CHECK (("auth"."uid"() = "author_id"));



CREATE POLICY "Enable read access for all users" ON "public"."domain_codes" FOR SELECT USING (true);



CREATE POLICY "Enable read access for own codes" ON "public"."user_domain_codes" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own trophies" ON "public"."trophy_unlocks" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own trophies" ON "public"."trophy_unlocks" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."domain_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."domains" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "domains_modify_own" ON "public"."domains" USING (("auth"."uid"() = "author_id")) WITH CHECK (("auth"."uid"() = "author_id"));



CREATE POLICY "manage own data" ON "public"."user_profiles" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "questions_modify_own" ON "public"."questions" USING (("auth"."uid"() = "author_id")) WITH CHECK (("auth"."uid"() = "author_id"));



ALTER TABLE "public"."quiz_attempt_questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quiz_attempt_questions_modify_own" ON "public"."quiz_attempt_questions" USING ((EXISTS ( SELECT 1
   FROM "public"."quiz_attempts" "qa"
  WHERE (("qa"."id" = "quiz_attempt_questions"."quiz_attempt_id") AND ("qa"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."quiz_attempts" "qa"
  WHERE (("qa"."id" = "quiz_attempt_questions"."quiz_attempt_id") AND ("qa"."user_id" = "auth"."uid"())))));



CREATE POLICY "quiz_attempt_questions_select_own" ON "public"."quiz_attempt_questions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."quiz_attempts" "qa"
  WHERE (("qa"."id" = "quiz_attempt_questions"."quiz_attempt_id") AND ("qa"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."quiz_attempts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quiz_attempts_modify_own" ON "public"."quiz_attempts" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "quiz_attempts_select_own" ON "public"."quiz_attempts" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."quizzes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quizzes_modify_own" ON "public"."quizzes" USING (("auth"."uid"() = "author_id")) WITH CHECK (("auth"."uid"() = "author_id"));



CREATE POLICY "quizzes_select_own" ON "public"."quizzes" FOR SELECT USING (("auth"."uid"() = "author_id"));



ALTER TABLE "public"."resources" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "resources_modify_own" ON "public"."resources" USING (("auth"."uid"() = "author_id")) WITH CHECK (("auth"."uid"() = "author_id"));



CREATE POLICY "resources_select_own" ON "public"."resources" FOR SELECT USING (("auth"."uid"() = "author_id"));



ALTER TABLE "public"."trophy_unlocks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































GRANT ALL ON TABLE "public"."domain_codes" TO "anon";
GRANT ALL ON TABLE "public"."domain_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."domain_codes" TO "service_role";



GRANT ALL ON TABLE "public"."domains" TO "anon";
GRANT ALL ON TABLE "public"."domains" TO "authenticated";
GRANT ALL ON TABLE "public"."domains" TO "service_role";



GRANT ALL ON TABLE "public"."questions" TO "anon";
GRANT ALL ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_attempt_questions" TO "anon";
GRANT ALL ON TABLE "public"."quiz_attempt_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_attempt_questions" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_attempts" TO "anon";
GRANT ALL ON TABLE "public"."quiz_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."quizzes" TO "anon";
GRANT ALL ON TABLE "public"."quizzes" TO "authenticated";
GRANT ALL ON TABLE "public"."quizzes" TO "service_role";



GRANT ALL ON TABLE "public"."resource_session_domains" TO "anon";
GRANT ALL ON TABLE "public"."resource_session_domains" TO "authenticated";
GRANT ALL ON TABLE "public"."resource_session_domains" TO "service_role";



GRANT ALL ON TABLE "public"."resource_session_questions" TO "anon";
GRANT ALL ON TABLE "public"."resource_session_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."resource_session_questions" TO "service_role";



GRANT ALL ON TABLE "public"."resource_sessions" TO "anon";
GRANT ALL ON TABLE "public"."resource_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."resource_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."resources" TO "anon";
GRANT ALL ON TABLE "public"."resources" TO "authenticated";
GRANT ALL ON TABLE "public"."resources" TO "service_role";



GRANT ALL ON TABLE "public"."trophy_unlocks" TO "anon";
GRANT ALL ON TABLE "public"."trophy_unlocks" TO "authenticated";
GRANT ALL ON TABLE "public"."trophy_unlocks" TO "service_role";



GRANT ALL ON TABLE "public"."user_credits" TO "anon";
GRANT ALL ON TABLE "public"."user_credits" TO "authenticated";
GRANT ALL ON TABLE "public"."user_credits" TO "service_role";



GRANT ALL ON TABLE "public"."user_domain_codes" TO "anon";
GRANT ALL ON TABLE "public"."user_domain_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."user_domain_codes" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
