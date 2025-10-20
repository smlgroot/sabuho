

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


CREATE TABLE IF NOT EXISTS "public"."achievements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_profile_id" "uuid",
    "title" character varying NOT NULL,
    "description" character varying NOT NULL,
    "icon_path" character varying NOT NULL,
    "unlocked_at" timestamp with time zone NOT NULL,
    "category" "public"."achievement_category" NOT NULL,
    "points_awarded" integer NOT NULL
);


ALTER TABLE "public"."achievements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."celebration_events" (
    "id" integer NOT NULL,
    "session_id" "uuid" NOT NULL,
    "type" "public"."celebration_type" NOT NULL,
    "message" "text" NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    "metadata" "jsonb" NOT NULL
);


ALTER TABLE "public"."celebration_events" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."celebration_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."celebration_events_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."celebration_events_id_seq" OWNED BY "public"."celebration_events"."id";



CREATE TABLE IF NOT EXISTS "public"."circadian_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "peak_hours" integer[] NOT NULL,
    "low_energy_hours" integer[] NOT NULL,
    "timezone" character varying NOT NULL,
    "hourly_performance" "jsonb" NOT NULL
);


ALTER TABLE "public"."circadian_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."domains" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "author_id" "uuid" NOT NULL,
    "parent_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."domains" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."emotional_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "frustration_level" double precision NOT NULL,
    "confidence_level" double precision NOT NULL,
    "motivation_level" double precision NOT NULL,
    "topic_sentiments" "jsonb" NOT NULL,
    "last_emotional_update" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."emotional_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."privacy_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "show_in_leaderboards" boolean NOT NULL,
    "allow_friend_requests" boolean NOT NULL,
    "share_activity_feed" boolean NOT NULL,
    "enable_ghost_mode" boolean NOT NULL,
    "allow_study_room_invites" boolean NOT NULL
);


ALTER TABLE "public"."privacy_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."question_attempts" (
    "id" integer NOT NULL,
    "session_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "selected_answer_id" "uuid" NOT NULL,
    "is_correct" boolean NOT NULL,
    "response_time_ms" integer NOT NULL,
    "confidence_level" double precision NOT NULL,
    "timestamp" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."question_attempts" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."question_attempts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."question_attempts_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."question_attempts_id_seq" OWNED BY "public"."question_attempts"."id";



CREATE TABLE IF NOT EXISTS "public"."question_options" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "is_correct" boolean DEFAULT false NOT NULL,
    "order_index" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "why" "text",
    "domain_id" "uuid" NOT NULL
);


ALTER TABLE "public"."question_options" OWNER TO "postgres";


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
    "is_attempted" boolean DEFAULT false,
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


CREATE TABLE IF NOT EXISTS "public"."quiz_codes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "author_id" "uuid" NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."quiz_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_learning_level_names" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."quiz_learning_level_names" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_learning_levels" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "index" integer NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "is_unlocked" boolean DEFAULT false NOT NULL,
    "is_completed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."quiz_learning_levels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_sessions" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "metrics" "jsonb" NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "state" "public"."session_state" NOT NULL
);


ALTER TABLE "public"."quiz_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quizzes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "author_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "domains" json NOT NULL,
    "is_published" boolean DEFAULT false NOT NULL,
    "num_questions" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "published_at" timestamp with time zone
);


ALTER TABLE "public"."quizzes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resources" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "domain_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "file_path" "text",
    "url" "text",
    "mime_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text",
    "topic_page_range" "jsonb",
    "unparsable" "text"
);


ALTER TABLE "public"."resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."streaks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "current_streak" integer NOT NULL,
    "longest_streak" integer NOT NULL,
    "last_quiz_date" timestamp with time zone,
    "has_streak_insurance" boolean NOT NULL,
    "streak_insurance_count" integer NOT NULL
);


ALTER TABLE "public"."streaks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_credits" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "credits" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_credits" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."user_quiz_codes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "quiz_code_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_quiz_codes" OWNER TO "postgres";


ALTER TABLE ONLY "public"."celebration_events" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."celebration_events_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."question_attempts" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."question_attempts_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."achievements"
    ADD CONSTRAINT "achievements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."celebration_events"
    ADD CONSTRAINT "celebration_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."circadian_preferences"
    ADD CONSTRAINT "circadian_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."domains"
    ADD CONSTRAINT "domains_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."emotional_profiles"
    ADD CONSTRAINT "emotional_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."privacy_settings"
    ADD CONSTRAINT "privacy_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_attempts"
    ADD CONSTRAINT "question_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_options"
    ADD CONSTRAINT "question_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_attempt_questions"
    ADD CONSTRAINT "quiz_attempt_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_codes"
    ADD CONSTRAINT "quiz_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_learning_levels"
    ADD CONSTRAINT "quiz_learning_paths_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_sessions"
    ADD CONSTRAINT "quiz_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resources"
    ADD CONSTRAINT "resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."streaks"
    ADD CONSTRAINT "streaks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_key" UNIQUE ("user_id");



CREATE INDEX "idx_celebration_events_session" ON "public"."celebration_events" USING "btree" ("session_id");



CREATE INDEX "idx_question_attempts_session" ON "public"."question_attempts" USING "btree" ("session_id");



ALTER TABLE ONLY "public"."achievements"
    ADD CONSTRAINT "achievements_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."celebration_events"
    ADD CONSTRAINT "celebration_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."quiz_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."domains"
    ADD CONSTRAINT "domains_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."domains"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."domains"
    ADD CONSTRAINT "domains_user_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_attempts"
    ADD CONSTRAINT "question_attempts_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."quiz_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_attempts"
    ADD CONSTRAINT "question_attempts_session_id_fkey1" FOREIGN KEY ("session_id") REFERENCES "public"."quiz_sessions"("id");



ALTER TABLE ONLY "public"."question_options"
    ADD CONSTRAINT "question_options_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id");



ALTER TABLE ONLY "public"."question_options"
    ADD CONSTRAINT "question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id");



ALTER TABLE ONLY "public"."quiz_attempt_questions"
    ADD CONSTRAINT "quiz_attempt_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_learning_levels"
    ADD CONSTRAINT "quiz_learning_paths_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id");



ALTER TABLE ONLY "public"."quiz_sessions"
    ADD CONSTRAINT "quiz_sessions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id");



ALTER TABLE ONLY "public"."quiz_codes"
    ADD CONSTRAINT "quizz_codes_quizz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id");



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_user_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_codes"
    ADD CONSTRAINT "quizzes_user_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resources"
    ADD CONSTRAINT "resources_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resources"
    ADD CONSTRAINT "resources_user_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_credits"
    ADD CONSTRAINT "user_credits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_quiz_codes"
    ADD CONSTRAINT "user_quiz_codes_quiz_code_id_fkey" FOREIGN KEY ("quiz_code_id") REFERENCES "public"."quiz_codes"("id");



ALTER TABLE ONLY "public"."user_quiz_codes"
    ADD CONSTRAINT "user_quiz_codes_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id");



ALTER TABLE ONLY "public"."user_quiz_codes"
    ADD CONSTRAINT "user_quiz_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



CREATE POLICY "Allow select for authenticated users" ON "public"."domains" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow select for authenticated users" ON "public"."questions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable insert for users based on user_id" ON "public"."quiz_codes" USING (("auth"."uid"() = "author_id")) WITH CHECK (("auth"."uid"() = "author_id"));



CREATE POLICY "Enable read access for all users" ON "public"."quiz_codes" FOR SELECT USING (true);



ALTER TABLE "public"."domains" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "domains_modify_own" ON "public"."domains" USING (("auth"."uid"() = "author_id")) WITH CHECK (("auth"."uid"() = "author_id"));



CREATE POLICY "manage own data" ON "public"."user_profiles" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "qopts_modify_own" ON "public"."question_options" USING ((EXISTS ( SELECT 1
   FROM "public"."questions" "q"
  WHERE (("q"."id" = "question_options"."question_id") AND ("q"."author_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."questions" "q"
  WHERE (("q"."id" = "question_options"."question_id") AND ("q"."author_id" = "auth"."uid"())))));



CREATE POLICY "qopts_select_own" ON "public"."question_options" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."question_options" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "questions_modify_own" ON "public"."questions" USING (("auth"."uid"() = "author_id")) WITH CHECK (("auth"."uid"() = "author_id"));



ALTER TABLE "public"."quiz_attempt_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quizzes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quizzes_modify_own" ON "public"."quizzes" USING (("auth"."uid"() = "author_id")) WITH CHECK (("auth"."uid"() = "author_id"));



CREATE POLICY "quizzes_select_own" ON "public"."quizzes" FOR SELECT USING (("auth"."uid"() = "author_id"));



ALTER TABLE "public"."resources" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "resources_modify_own" ON "public"."resources" USING (("auth"."uid"() = "author_id")) WITH CHECK (("auth"."uid"() = "author_id"));



CREATE POLICY "resources_select_own" ON "public"."resources" FOR SELECT USING (("auth"."uid"() = "author_id"));



ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































GRANT ALL ON TABLE "public"."achievements" TO "anon";
GRANT ALL ON TABLE "public"."achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."achievements" TO "service_role";



GRANT ALL ON TABLE "public"."celebration_events" TO "anon";
GRANT ALL ON TABLE "public"."celebration_events" TO "authenticated";
GRANT ALL ON TABLE "public"."celebration_events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."celebration_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."celebration_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."celebration_events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."circadian_preferences" TO "anon";
GRANT ALL ON TABLE "public"."circadian_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."circadian_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."domains" TO "anon";
GRANT ALL ON TABLE "public"."domains" TO "authenticated";
GRANT ALL ON TABLE "public"."domains" TO "service_role";



GRANT ALL ON TABLE "public"."emotional_profiles" TO "anon";
GRANT ALL ON TABLE "public"."emotional_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."emotional_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."privacy_settings" TO "anon";
GRANT ALL ON TABLE "public"."privacy_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."privacy_settings" TO "service_role";



GRANT ALL ON TABLE "public"."question_attempts" TO "anon";
GRANT ALL ON TABLE "public"."question_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."question_attempts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."question_attempts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."question_attempts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."question_attempts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."question_options" TO "anon";
GRANT ALL ON TABLE "public"."question_options" TO "authenticated";
GRANT ALL ON TABLE "public"."question_options" TO "service_role";



GRANT ALL ON TABLE "public"."questions" TO "anon";
GRANT ALL ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_attempt_questions" TO "anon";
GRANT ALL ON TABLE "public"."quiz_attempt_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_attempt_questions" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_attempts" TO "anon";
GRANT ALL ON TABLE "public"."quiz_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_codes" TO "anon";
GRANT ALL ON TABLE "public"."quiz_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_codes" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_learning_level_names" TO "anon";
GRANT ALL ON TABLE "public"."quiz_learning_level_names" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_learning_level_names" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_learning_levels" TO "anon";
GRANT ALL ON TABLE "public"."quiz_learning_levels" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_learning_levels" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_sessions" TO "anon";
GRANT ALL ON TABLE "public"."quiz_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."quizzes" TO "anon";
GRANT ALL ON TABLE "public"."quizzes" TO "authenticated";
GRANT ALL ON TABLE "public"."quizzes" TO "service_role";



GRANT ALL ON TABLE "public"."resources" TO "anon";
GRANT ALL ON TABLE "public"."resources" TO "authenticated";
GRANT ALL ON TABLE "public"."resources" TO "service_role";



GRANT ALL ON TABLE "public"."streaks" TO "anon";
GRANT ALL ON TABLE "public"."streaks" TO "authenticated";
GRANT ALL ON TABLE "public"."streaks" TO "service_role";



GRANT ALL ON TABLE "public"."user_credits" TO "anon";
GRANT ALL ON TABLE "public"."user_credits" TO "authenticated";
GRANT ALL ON TABLE "public"."user_credits" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_quiz_codes" TO "anon";
GRANT ALL ON TABLE "public"."user_quiz_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."user_quiz_codes" TO "service_role";









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
