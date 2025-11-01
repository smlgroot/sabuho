drop policy "qopts_modify_own" on "public"."question_options";

drop policy "qopts_select_own" on "public"."question_options";

drop policy "Enable insert for users based on user_id" on "public"."quiz_codes";

drop policy "Enable read access for all users" on "public"."quiz_codes";

revoke delete on table "public"."achievements" from "anon";

revoke insert on table "public"."achievements" from "anon";

revoke references on table "public"."achievements" from "anon";

revoke select on table "public"."achievements" from "anon";

revoke trigger on table "public"."achievements" from "anon";

revoke truncate on table "public"."achievements" from "anon";

revoke update on table "public"."achievements" from "anon";

revoke delete on table "public"."achievements" from "authenticated";

revoke insert on table "public"."achievements" from "authenticated";

revoke references on table "public"."achievements" from "authenticated";

revoke select on table "public"."achievements" from "authenticated";

revoke trigger on table "public"."achievements" from "authenticated";

revoke truncate on table "public"."achievements" from "authenticated";

revoke update on table "public"."achievements" from "authenticated";

revoke delete on table "public"."achievements" from "service_role";

revoke insert on table "public"."achievements" from "service_role";

revoke references on table "public"."achievements" from "service_role";

revoke select on table "public"."achievements" from "service_role";

revoke trigger on table "public"."achievements" from "service_role";

revoke truncate on table "public"."achievements" from "service_role";

revoke update on table "public"."achievements" from "service_role";

revoke delete on table "public"."celebration_events" from "anon";

revoke insert on table "public"."celebration_events" from "anon";

revoke references on table "public"."celebration_events" from "anon";

revoke select on table "public"."celebration_events" from "anon";

revoke trigger on table "public"."celebration_events" from "anon";

revoke truncate on table "public"."celebration_events" from "anon";

revoke update on table "public"."celebration_events" from "anon";

revoke delete on table "public"."celebration_events" from "authenticated";

revoke insert on table "public"."celebration_events" from "authenticated";

revoke references on table "public"."celebration_events" from "authenticated";

revoke select on table "public"."celebration_events" from "authenticated";

revoke trigger on table "public"."celebration_events" from "authenticated";

revoke truncate on table "public"."celebration_events" from "authenticated";

revoke update on table "public"."celebration_events" from "authenticated";

revoke delete on table "public"."celebration_events" from "service_role";

revoke insert on table "public"."celebration_events" from "service_role";

revoke references on table "public"."celebration_events" from "service_role";

revoke select on table "public"."celebration_events" from "service_role";

revoke trigger on table "public"."celebration_events" from "service_role";

revoke truncate on table "public"."celebration_events" from "service_role";

revoke update on table "public"."celebration_events" from "service_role";

revoke delete on table "public"."circadian_preferences" from "anon";

revoke insert on table "public"."circadian_preferences" from "anon";

revoke references on table "public"."circadian_preferences" from "anon";

revoke select on table "public"."circadian_preferences" from "anon";

revoke trigger on table "public"."circadian_preferences" from "anon";

revoke truncate on table "public"."circadian_preferences" from "anon";

revoke update on table "public"."circadian_preferences" from "anon";

revoke delete on table "public"."circadian_preferences" from "authenticated";

revoke insert on table "public"."circadian_preferences" from "authenticated";

revoke references on table "public"."circadian_preferences" from "authenticated";

revoke select on table "public"."circadian_preferences" from "authenticated";

revoke trigger on table "public"."circadian_preferences" from "authenticated";

revoke truncate on table "public"."circadian_preferences" from "authenticated";

revoke update on table "public"."circadian_preferences" from "authenticated";

revoke delete on table "public"."circadian_preferences" from "service_role";

revoke insert on table "public"."circadian_preferences" from "service_role";

revoke references on table "public"."circadian_preferences" from "service_role";

revoke select on table "public"."circadian_preferences" from "service_role";

revoke trigger on table "public"."circadian_preferences" from "service_role";

revoke truncate on table "public"."circadian_preferences" from "service_role";

revoke update on table "public"."circadian_preferences" from "service_role";

revoke delete on table "public"."emotional_profiles" from "anon";

revoke insert on table "public"."emotional_profiles" from "anon";

revoke references on table "public"."emotional_profiles" from "anon";

revoke select on table "public"."emotional_profiles" from "anon";

revoke trigger on table "public"."emotional_profiles" from "anon";

revoke truncate on table "public"."emotional_profiles" from "anon";

revoke update on table "public"."emotional_profiles" from "anon";

revoke delete on table "public"."emotional_profiles" from "authenticated";

revoke insert on table "public"."emotional_profiles" from "authenticated";

revoke references on table "public"."emotional_profiles" from "authenticated";

revoke select on table "public"."emotional_profiles" from "authenticated";

revoke trigger on table "public"."emotional_profiles" from "authenticated";

revoke truncate on table "public"."emotional_profiles" from "authenticated";

revoke update on table "public"."emotional_profiles" from "authenticated";

revoke delete on table "public"."emotional_profiles" from "service_role";

revoke insert on table "public"."emotional_profiles" from "service_role";

revoke references on table "public"."emotional_profiles" from "service_role";

revoke select on table "public"."emotional_profiles" from "service_role";

revoke trigger on table "public"."emotional_profiles" from "service_role";

revoke truncate on table "public"."emotional_profiles" from "service_role";

revoke update on table "public"."emotional_profiles" from "service_role";

revoke delete on table "public"."privacy_settings" from "anon";

revoke insert on table "public"."privacy_settings" from "anon";

revoke references on table "public"."privacy_settings" from "anon";

revoke select on table "public"."privacy_settings" from "anon";

revoke trigger on table "public"."privacy_settings" from "anon";

revoke truncate on table "public"."privacy_settings" from "anon";

revoke update on table "public"."privacy_settings" from "anon";

revoke delete on table "public"."privacy_settings" from "authenticated";

revoke insert on table "public"."privacy_settings" from "authenticated";

revoke references on table "public"."privacy_settings" from "authenticated";

revoke select on table "public"."privacy_settings" from "authenticated";

revoke trigger on table "public"."privacy_settings" from "authenticated";

revoke truncate on table "public"."privacy_settings" from "authenticated";

revoke update on table "public"."privacy_settings" from "authenticated";

revoke delete on table "public"."privacy_settings" from "service_role";

revoke insert on table "public"."privacy_settings" from "service_role";

revoke references on table "public"."privacy_settings" from "service_role";

revoke select on table "public"."privacy_settings" from "service_role";

revoke trigger on table "public"."privacy_settings" from "service_role";

revoke truncate on table "public"."privacy_settings" from "service_role";

revoke update on table "public"."privacy_settings" from "service_role";

revoke delete on table "public"."question_attempts" from "anon";

revoke insert on table "public"."question_attempts" from "anon";

revoke references on table "public"."question_attempts" from "anon";

revoke select on table "public"."question_attempts" from "anon";

revoke trigger on table "public"."question_attempts" from "anon";

revoke truncate on table "public"."question_attempts" from "anon";

revoke update on table "public"."question_attempts" from "anon";

revoke delete on table "public"."question_attempts" from "authenticated";

revoke insert on table "public"."question_attempts" from "authenticated";

revoke references on table "public"."question_attempts" from "authenticated";

revoke select on table "public"."question_attempts" from "authenticated";

revoke trigger on table "public"."question_attempts" from "authenticated";

revoke truncate on table "public"."question_attempts" from "authenticated";

revoke update on table "public"."question_attempts" from "authenticated";

revoke delete on table "public"."question_attempts" from "service_role";

revoke insert on table "public"."question_attempts" from "service_role";

revoke references on table "public"."question_attempts" from "service_role";

revoke select on table "public"."question_attempts" from "service_role";

revoke trigger on table "public"."question_attempts" from "service_role";

revoke truncate on table "public"."question_attempts" from "service_role";

revoke update on table "public"."question_attempts" from "service_role";

revoke delete on table "public"."question_options" from "anon";

revoke insert on table "public"."question_options" from "anon";

revoke references on table "public"."question_options" from "anon";

revoke select on table "public"."question_options" from "anon";

revoke trigger on table "public"."question_options" from "anon";

revoke truncate on table "public"."question_options" from "anon";

revoke update on table "public"."question_options" from "anon";

revoke delete on table "public"."question_options" from "authenticated";

revoke insert on table "public"."question_options" from "authenticated";

revoke references on table "public"."question_options" from "authenticated";

revoke select on table "public"."question_options" from "authenticated";

revoke trigger on table "public"."question_options" from "authenticated";

revoke truncate on table "public"."question_options" from "authenticated";

revoke update on table "public"."question_options" from "authenticated";

revoke delete on table "public"."question_options" from "service_role";

revoke insert on table "public"."question_options" from "service_role";

revoke references on table "public"."question_options" from "service_role";

revoke select on table "public"."question_options" from "service_role";

revoke trigger on table "public"."question_options" from "service_role";

revoke truncate on table "public"."question_options" from "service_role";

revoke update on table "public"."question_options" from "service_role";

revoke delete on table "public"."quiz_codes" from "anon";

revoke insert on table "public"."quiz_codes" from "anon";

revoke references on table "public"."quiz_codes" from "anon";

revoke select on table "public"."quiz_codes" from "anon";

revoke trigger on table "public"."quiz_codes" from "anon";

revoke truncate on table "public"."quiz_codes" from "anon";

revoke update on table "public"."quiz_codes" from "anon";

revoke delete on table "public"."quiz_codes" from "authenticated";

revoke insert on table "public"."quiz_codes" from "authenticated";

revoke references on table "public"."quiz_codes" from "authenticated";

revoke select on table "public"."quiz_codes" from "authenticated";

revoke trigger on table "public"."quiz_codes" from "authenticated";

revoke truncate on table "public"."quiz_codes" from "authenticated";

revoke update on table "public"."quiz_codes" from "authenticated";

revoke delete on table "public"."quiz_codes" from "service_role";

revoke insert on table "public"."quiz_codes" from "service_role";

revoke references on table "public"."quiz_codes" from "service_role";

revoke select on table "public"."quiz_codes" from "service_role";

revoke trigger on table "public"."quiz_codes" from "service_role";

revoke truncate on table "public"."quiz_codes" from "service_role";

revoke update on table "public"."quiz_codes" from "service_role";

revoke delete on table "public"."quiz_learning_level_names" from "anon";

revoke insert on table "public"."quiz_learning_level_names" from "anon";

revoke references on table "public"."quiz_learning_level_names" from "anon";

revoke select on table "public"."quiz_learning_level_names" from "anon";

revoke trigger on table "public"."quiz_learning_level_names" from "anon";

revoke truncate on table "public"."quiz_learning_level_names" from "anon";

revoke update on table "public"."quiz_learning_level_names" from "anon";

revoke delete on table "public"."quiz_learning_level_names" from "authenticated";

revoke insert on table "public"."quiz_learning_level_names" from "authenticated";

revoke references on table "public"."quiz_learning_level_names" from "authenticated";

revoke select on table "public"."quiz_learning_level_names" from "authenticated";

revoke trigger on table "public"."quiz_learning_level_names" from "authenticated";

revoke truncate on table "public"."quiz_learning_level_names" from "authenticated";

revoke update on table "public"."quiz_learning_level_names" from "authenticated";

revoke delete on table "public"."quiz_learning_level_names" from "service_role";

revoke insert on table "public"."quiz_learning_level_names" from "service_role";

revoke references on table "public"."quiz_learning_level_names" from "service_role";

revoke select on table "public"."quiz_learning_level_names" from "service_role";

revoke trigger on table "public"."quiz_learning_level_names" from "service_role";

revoke truncate on table "public"."quiz_learning_level_names" from "service_role";

revoke update on table "public"."quiz_learning_level_names" from "service_role";

revoke delete on table "public"."quiz_learning_levels" from "anon";

revoke insert on table "public"."quiz_learning_levels" from "anon";

revoke references on table "public"."quiz_learning_levels" from "anon";

revoke select on table "public"."quiz_learning_levels" from "anon";

revoke trigger on table "public"."quiz_learning_levels" from "anon";

revoke truncate on table "public"."quiz_learning_levels" from "anon";

revoke update on table "public"."quiz_learning_levels" from "anon";

revoke delete on table "public"."quiz_learning_levels" from "authenticated";

revoke insert on table "public"."quiz_learning_levels" from "authenticated";

revoke references on table "public"."quiz_learning_levels" from "authenticated";

revoke select on table "public"."quiz_learning_levels" from "authenticated";

revoke trigger on table "public"."quiz_learning_levels" from "authenticated";

revoke truncate on table "public"."quiz_learning_levels" from "authenticated";

revoke update on table "public"."quiz_learning_levels" from "authenticated";

revoke delete on table "public"."quiz_learning_levels" from "service_role";

revoke insert on table "public"."quiz_learning_levels" from "service_role";

revoke references on table "public"."quiz_learning_levels" from "service_role";

revoke select on table "public"."quiz_learning_levels" from "service_role";

revoke trigger on table "public"."quiz_learning_levels" from "service_role";

revoke truncate on table "public"."quiz_learning_levels" from "service_role";

revoke update on table "public"."quiz_learning_levels" from "service_role";

revoke delete on table "public"."quiz_sessions" from "anon";

revoke insert on table "public"."quiz_sessions" from "anon";

revoke references on table "public"."quiz_sessions" from "anon";

revoke select on table "public"."quiz_sessions" from "anon";

revoke trigger on table "public"."quiz_sessions" from "anon";

revoke truncate on table "public"."quiz_sessions" from "anon";

revoke update on table "public"."quiz_sessions" from "anon";

revoke delete on table "public"."quiz_sessions" from "authenticated";

revoke insert on table "public"."quiz_sessions" from "authenticated";

revoke references on table "public"."quiz_sessions" from "authenticated";

revoke select on table "public"."quiz_sessions" from "authenticated";

revoke trigger on table "public"."quiz_sessions" from "authenticated";

revoke truncate on table "public"."quiz_sessions" from "authenticated";

revoke update on table "public"."quiz_sessions" from "authenticated";

revoke delete on table "public"."quiz_sessions" from "service_role";

revoke insert on table "public"."quiz_sessions" from "service_role";

revoke references on table "public"."quiz_sessions" from "service_role";

revoke select on table "public"."quiz_sessions" from "service_role";

revoke trigger on table "public"."quiz_sessions" from "service_role";

revoke truncate on table "public"."quiz_sessions" from "service_role";

revoke update on table "public"."quiz_sessions" from "service_role";

revoke delete on table "public"."streaks" from "anon";

revoke insert on table "public"."streaks" from "anon";

revoke references on table "public"."streaks" from "anon";

revoke select on table "public"."streaks" from "anon";

revoke trigger on table "public"."streaks" from "anon";

revoke truncate on table "public"."streaks" from "anon";

revoke update on table "public"."streaks" from "anon";

revoke delete on table "public"."streaks" from "authenticated";

revoke insert on table "public"."streaks" from "authenticated";

revoke references on table "public"."streaks" from "authenticated";

revoke select on table "public"."streaks" from "authenticated";

revoke trigger on table "public"."streaks" from "authenticated";

revoke truncate on table "public"."streaks" from "authenticated";

revoke update on table "public"."streaks" from "authenticated";

revoke delete on table "public"."streaks" from "service_role";

revoke insert on table "public"."streaks" from "service_role";

revoke references on table "public"."streaks" from "service_role";

revoke select on table "public"."streaks" from "service_role";

revoke trigger on table "public"."streaks" from "service_role";

revoke truncate on table "public"."streaks" from "service_role";

revoke update on table "public"."streaks" from "service_role";

revoke delete on table "public"."user_quiz_codes" from "anon";

revoke insert on table "public"."user_quiz_codes" from "anon";

revoke references on table "public"."user_quiz_codes" from "anon";

revoke select on table "public"."user_quiz_codes" from "anon";

revoke trigger on table "public"."user_quiz_codes" from "anon";

revoke truncate on table "public"."user_quiz_codes" from "anon";

revoke update on table "public"."user_quiz_codes" from "anon";

revoke delete on table "public"."user_quiz_codes" from "authenticated";

revoke insert on table "public"."user_quiz_codes" from "authenticated";

revoke references on table "public"."user_quiz_codes" from "authenticated";

revoke select on table "public"."user_quiz_codes" from "authenticated";

revoke trigger on table "public"."user_quiz_codes" from "authenticated";

revoke truncate on table "public"."user_quiz_codes" from "authenticated";

revoke update on table "public"."user_quiz_codes" from "authenticated";

revoke delete on table "public"."user_quiz_codes" from "service_role";

revoke insert on table "public"."user_quiz_codes" from "service_role";

revoke references on table "public"."user_quiz_codes" from "service_role";

revoke select on table "public"."user_quiz_codes" from "service_role";

revoke trigger on table "public"."user_quiz_codes" from "service_role";

revoke truncate on table "public"."user_quiz_codes" from "service_role";

revoke update on table "public"."user_quiz_codes" from "service_role";

alter table "public"."achievements" drop constraint "achievements_user_profile_id_fkey";

alter table "public"."celebration_events" drop constraint "celebration_events_session_id_fkey";

alter table "public"."question_attempts" drop constraint "question_attempts_session_id_fkey";

alter table "public"."question_options" drop constraint "question_options_domain_id_fkey";

alter table "public"."question_options" drop constraint "question_options_question_id_fkey";

alter table "public"."quiz_codes" drop constraint "quizz_codes_quizz_id_fkey";

alter table "public"."quiz_codes" drop constraint "quizzes_user_id_fkey";

alter table "public"."quiz_learning_levels" drop constraint "quiz_learning_paths_quiz_id_fkey";

alter table "public"."quiz_sessions" drop constraint "quiz_sessions_domain_id_fkey";

alter table "public"."user_quiz_codes" drop constraint "user_quiz_codes_quiz_code_id_fkey";

alter table "public"."user_quiz_codes" drop constraint "user_quiz_codes_quiz_id_fkey";

alter table "public"."user_quiz_codes" drop constraint "user_quiz_codes_user_id_fkey";

alter table "public"."achievements" drop constraint "achievements_pkey";

alter table "public"."celebration_events" drop constraint "celebration_events_pkey";

alter table "public"."circadian_preferences" drop constraint "circadian_preferences_pkey";

alter table "public"."emotional_profiles" drop constraint "emotional_profiles_pkey";

alter table "public"."privacy_settings" drop constraint "privacy_settings_pkey";

alter table "public"."question_attempts" drop constraint "question_attempts_pkey";

alter table "public"."question_options" drop constraint "question_options_pkey";

alter table "public"."quiz_codes" drop constraint "quiz_codes_pkey";

alter table "public"."quiz_learning_levels" drop constraint "quiz_learning_paths_pkey";

alter table "public"."quiz_sessions" drop constraint "quiz_sessions_pkey";

alter table "public"."streaks" drop constraint "streaks_pkey";

drop index if exists "public"."achievements_pkey";

drop index if exists "public"."celebration_events_pkey";

drop index if exists "public"."circadian_preferences_pkey";

drop index if exists "public"."emotional_profiles_pkey";

drop index if exists "public"."idx_celebration_events_session";

drop index if exists "public"."idx_question_attempts_session";

drop index if exists "public"."privacy_settings_pkey";

drop index if exists "public"."question_attempts_pkey";

drop index if exists "public"."question_options_pkey";

drop index if exists "public"."quiz_learning_paths_pkey";

drop index if exists "public"."quiz_sessions_pkey";

drop index if exists "public"."streaks_pkey";

drop index if exists "public"."quiz_codes_pkey";

drop table "public"."achievements";

drop table "public"."celebration_events";

drop table "public"."circadian_preferences";

drop table "public"."emotional_profiles";

drop table "public"."privacy_settings";

drop table "public"."question_attempts";

drop table "public"."question_options";

drop table "public"."quiz_codes";

drop table "public"."quiz_learning_level_names";

drop table "public"."quiz_learning_levels";

drop table "public"."quiz_sessions";

drop table "public"."streaks";

drop table "public"."user_quiz_codes";


  create table "public"."domain_codes" (
    "id" uuid not null default uuid_generate_v4(),
    "author_id" uuid not null,
    "domain_id" uuid not null,
    "code" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."domain_codes" enable row level security;


  create table "public"."resource_session_domains" (
    "id" uuid not null default uuid_generate_v4(),
    "resource_session_id" uuid not null,
    "name" text not null,
    "page_range_start" smallint not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "page_range_end" smallint not null
      );



  create table "public"."resource_session_questions" (
    "id" uuid not null default uuid_generate_v4(),
    "resource_session_domain_id" uuid not null,
    "type" text default 'multiple_options'::text,
    "body" text not null,
    "explanation" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "resource_session_id" uuid,
    "options" jsonb
      );



  create table "public"."resource_sessions" (
    "id" uuid not null default uuid_generate_v4(),
    "name" text not null,
    "file_path" text,
    "url" text,
    "mime_type" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "status" text,
    "topic_page_range" jsonb,
    "unparsable" text
      );



  create table "public"."trophy_unlocks" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "quiz_attempt_id" uuid not null,
    "trophy_type" text not null,
    "trophy_name" text not null,
    "trophy_description" text not null,
    "trophy_icon" text not null,
    "trophy_metadata" jsonb default '{}'::jsonb,
    "unlocked_at" timestamp with time zone not null default now(),
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."trophy_unlocks" enable row level security;


  create table "public"."user_domain_codes" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "domain_id" uuid not null,
    "domain_code_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."domains" drop column "question_count";

alter table "public"."domains" drop column "thumbnail_url";

alter table "public"."domains" add column "domain_type" text not null default 'folder'::text;

alter table "public"."quiz_attempt_questions" add column "confidence_level" double precision;

alter table "public"."quiz_attempt_questions" add column "response_time_ms" bigint;

alter table "public"."quiz_attempt_questions" add column "scrambled_order" jsonb;

alter table "public"."quiz_attempt_questions" add column "selected_answer_index" integer;

alter table "public"."quiz_attempts" drop column "num_correct";

alter table "public"."quiz_attempts" drop column "num_questions";

alter table "public"."quiz_attempts" drop column "num_skipped";

alter table "public"."quiz_attempts" drop column "score";

drop sequence if exists "public"."celebration_events_id_seq";

drop sequence if exists "public"."question_attempts_id_seq";

CREATE INDEX idx_trophy_unlocks_quiz_attempt_id ON public.trophy_unlocks USING btree (quiz_attempt_id);

CREATE INDEX idx_trophy_unlocks_trophy_type ON public.trophy_unlocks USING btree (trophy_type);

CREATE INDEX idx_trophy_unlocks_user_id ON public.trophy_unlocks USING btree (user_id);

CREATE UNIQUE INDEX resource_session_domains_pkey ON public.resource_session_domains USING btree (id);

CREATE UNIQUE INDEX resource_session_pkey ON public.resource_sessions USING btree (id);

CREATE UNIQUE INDEX resource_session_questions_pkey ON public.resource_session_questions USING btree (id);

CREATE UNIQUE INDEX trophy_unlocks_pkey ON public.trophy_unlocks USING btree (id);

CREATE UNIQUE INDEX quiz_codes_pkey ON public.domain_codes USING btree (id);

alter table "public"."domain_codes" add constraint "quiz_codes_pkey" PRIMARY KEY using index "quiz_codes_pkey";

alter table "public"."resource_session_domains" add constraint "resource_session_domains_pkey" PRIMARY KEY using index "resource_session_domains_pkey";

alter table "public"."resource_session_questions" add constraint "resource_session_questions_pkey" PRIMARY KEY using index "resource_session_questions_pkey";

alter table "public"."resource_sessions" add constraint "resource_session_pkey" PRIMARY KEY using index "resource_session_pkey";

alter table "public"."trophy_unlocks" add constraint "trophy_unlocks_pkey" PRIMARY KEY using index "trophy_unlocks_pkey";

alter table "public"."domain_codes" add constraint "domain_codes_author_id_fkey" FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."domain_codes" validate constraint "domain_codes_author_id_fkey";

alter table "public"."domain_codes" add constraint "domain_codes_domain_id_fkey" FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE not valid;

alter table "public"."domain_codes" validate constraint "domain_codes_domain_id_fkey";

alter table "public"."domain_codes" add constraint "quizz_codes_quizz_id_fkey" FOREIGN KEY (domain_id) REFERENCES quizzes(id) not valid;

alter table "public"."domain_codes" validate constraint "quizz_codes_quizz_id_fkey";

alter table "public"."domain_codes" add constraint "quizzes_user_id_fkey" FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."domain_codes" validate constraint "quizzes_user_id_fkey";

alter table "public"."resource_session_domains" add constraint "resource_session_domains_resource_session_id_fkey" FOREIGN KEY (resource_session_id) REFERENCES resource_sessions(id) not valid;

alter table "public"."resource_session_domains" validate constraint "resource_session_domains_resource_session_id_fkey";

alter table "public"."resource_session_questions" add constraint "resource_session_questions_resource_session_domain_id_fkey" FOREIGN KEY (resource_session_domain_id) REFERENCES resource_session_domains(id) not valid;

alter table "public"."resource_session_questions" validate constraint "resource_session_questions_resource_session_domain_id_fkey";

alter table "public"."resource_session_questions" add constraint "resource_session_questions_resource_session_id_fkey" FOREIGN KEY (resource_session_id) REFERENCES resource_sessions(id) not valid;

alter table "public"."resource_session_questions" validate constraint "resource_session_questions_resource_session_id_fkey";

alter table "public"."trophy_unlocks" add constraint "trophy_unlocks_quiz_attempt_id_fkey" FOREIGN KEY (quiz_attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE not valid;

alter table "public"."trophy_unlocks" validate constraint "trophy_unlocks_quiz_attempt_id_fkey";

alter table "public"."trophy_unlocks" add constraint "trophy_unlocks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."trophy_unlocks" validate constraint "trophy_unlocks_user_id_fkey";

alter table "public"."user_domain_codes" add constraint "user_domain_codes_domain_code_id_fkey" FOREIGN KEY (domain_code_id) REFERENCES domain_codes(id) ON DELETE CASCADE not valid;

alter table "public"."user_domain_codes" validate constraint "user_domain_codes_domain_code_id_fkey";

alter table "public"."user_domain_codes" add constraint "user_domain_codes_domain_id_fkey" FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE not valid;

alter table "public"."user_domain_codes" validate constraint "user_domain_codes_domain_id_fkey";

alter table "public"."user_domain_codes" add constraint "user_domain_codes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_domain_codes" validate constraint "user_domain_codes_user_id_fkey";

grant delete on table "public"."domain_codes" to "anon";

grant insert on table "public"."domain_codes" to "anon";

grant references on table "public"."domain_codes" to "anon";

grant select on table "public"."domain_codes" to "anon";

grant trigger on table "public"."domain_codes" to "anon";

grant truncate on table "public"."domain_codes" to "anon";

grant update on table "public"."domain_codes" to "anon";

grant delete on table "public"."domain_codes" to "authenticated";

grant insert on table "public"."domain_codes" to "authenticated";

grant references on table "public"."domain_codes" to "authenticated";

grant select on table "public"."domain_codes" to "authenticated";

grant trigger on table "public"."domain_codes" to "authenticated";

grant truncate on table "public"."domain_codes" to "authenticated";

grant update on table "public"."domain_codes" to "authenticated";

grant delete on table "public"."domain_codes" to "service_role";

grant insert on table "public"."domain_codes" to "service_role";

grant references on table "public"."domain_codes" to "service_role";

grant select on table "public"."domain_codes" to "service_role";

grant trigger on table "public"."domain_codes" to "service_role";

grant truncate on table "public"."domain_codes" to "service_role";

grant update on table "public"."domain_codes" to "service_role";

grant delete on table "public"."resource_session_domains" to "anon";

grant insert on table "public"."resource_session_domains" to "anon";

grant references on table "public"."resource_session_domains" to "anon";

grant select on table "public"."resource_session_domains" to "anon";

grant trigger on table "public"."resource_session_domains" to "anon";

grant truncate on table "public"."resource_session_domains" to "anon";

grant update on table "public"."resource_session_domains" to "anon";

grant delete on table "public"."resource_session_domains" to "authenticated";

grant insert on table "public"."resource_session_domains" to "authenticated";

grant references on table "public"."resource_session_domains" to "authenticated";

grant select on table "public"."resource_session_domains" to "authenticated";

grant trigger on table "public"."resource_session_domains" to "authenticated";

grant truncate on table "public"."resource_session_domains" to "authenticated";

grant update on table "public"."resource_session_domains" to "authenticated";

grant delete on table "public"."resource_session_domains" to "service_role";

grant insert on table "public"."resource_session_domains" to "service_role";

grant references on table "public"."resource_session_domains" to "service_role";

grant select on table "public"."resource_session_domains" to "service_role";

grant trigger on table "public"."resource_session_domains" to "service_role";

grant truncate on table "public"."resource_session_domains" to "service_role";

grant update on table "public"."resource_session_domains" to "service_role";

grant delete on table "public"."resource_session_questions" to "anon";

grant insert on table "public"."resource_session_questions" to "anon";

grant references on table "public"."resource_session_questions" to "anon";

grant select on table "public"."resource_session_questions" to "anon";

grant trigger on table "public"."resource_session_questions" to "anon";

grant truncate on table "public"."resource_session_questions" to "anon";

grant update on table "public"."resource_session_questions" to "anon";

grant delete on table "public"."resource_session_questions" to "authenticated";

grant insert on table "public"."resource_session_questions" to "authenticated";

grant references on table "public"."resource_session_questions" to "authenticated";

grant select on table "public"."resource_session_questions" to "authenticated";

grant trigger on table "public"."resource_session_questions" to "authenticated";

grant truncate on table "public"."resource_session_questions" to "authenticated";

grant update on table "public"."resource_session_questions" to "authenticated";

grant delete on table "public"."resource_session_questions" to "service_role";

grant insert on table "public"."resource_session_questions" to "service_role";

grant references on table "public"."resource_session_questions" to "service_role";

grant select on table "public"."resource_session_questions" to "service_role";

grant trigger on table "public"."resource_session_questions" to "service_role";

grant truncate on table "public"."resource_session_questions" to "service_role";

grant update on table "public"."resource_session_questions" to "service_role";

grant delete on table "public"."resource_sessions" to "anon";

grant insert on table "public"."resource_sessions" to "anon";

grant references on table "public"."resource_sessions" to "anon";

grant select on table "public"."resource_sessions" to "anon";

grant trigger on table "public"."resource_sessions" to "anon";

grant truncate on table "public"."resource_sessions" to "anon";

grant update on table "public"."resource_sessions" to "anon";

grant delete on table "public"."resource_sessions" to "authenticated";

grant insert on table "public"."resource_sessions" to "authenticated";

grant references on table "public"."resource_sessions" to "authenticated";

grant select on table "public"."resource_sessions" to "authenticated";

grant trigger on table "public"."resource_sessions" to "authenticated";

grant truncate on table "public"."resource_sessions" to "authenticated";

grant update on table "public"."resource_sessions" to "authenticated";

grant delete on table "public"."resource_sessions" to "service_role";

grant insert on table "public"."resource_sessions" to "service_role";

grant references on table "public"."resource_sessions" to "service_role";

grant select on table "public"."resource_sessions" to "service_role";

grant trigger on table "public"."resource_sessions" to "service_role";

grant truncate on table "public"."resource_sessions" to "service_role";

grant update on table "public"."resource_sessions" to "service_role";

grant delete on table "public"."trophy_unlocks" to "anon";

grant insert on table "public"."trophy_unlocks" to "anon";

grant references on table "public"."trophy_unlocks" to "anon";

grant select on table "public"."trophy_unlocks" to "anon";

grant trigger on table "public"."trophy_unlocks" to "anon";

grant truncate on table "public"."trophy_unlocks" to "anon";

grant update on table "public"."trophy_unlocks" to "anon";

grant delete on table "public"."trophy_unlocks" to "authenticated";

grant insert on table "public"."trophy_unlocks" to "authenticated";

grant references on table "public"."trophy_unlocks" to "authenticated";

grant select on table "public"."trophy_unlocks" to "authenticated";

grant trigger on table "public"."trophy_unlocks" to "authenticated";

grant truncate on table "public"."trophy_unlocks" to "authenticated";

grant update on table "public"."trophy_unlocks" to "authenticated";

grant delete on table "public"."trophy_unlocks" to "service_role";

grant insert on table "public"."trophy_unlocks" to "service_role";

grant references on table "public"."trophy_unlocks" to "service_role";

grant select on table "public"."trophy_unlocks" to "service_role";

grant trigger on table "public"."trophy_unlocks" to "service_role";

grant truncate on table "public"."trophy_unlocks" to "service_role";

grant update on table "public"."trophy_unlocks" to "service_role";

grant delete on table "public"."user_domain_codes" to "anon";

grant insert on table "public"."user_domain_codes" to "anon";

grant references on table "public"."user_domain_codes" to "anon";

grant select on table "public"."user_domain_codes" to "anon";

grant trigger on table "public"."user_domain_codes" to "anon";

grant truncate on table "public"."user_domain_codes" to "anon";

grant update on table "public"."user_domain_codes" to "anon";

grant delete on table "public"."user_domain_codes" to "authenticated";

grant insert on table "public"."user_domain_codes" to "authenticated";

grant references on table "public"."user_domain_codes" to "authenticated";

grant select on table "public"."user_domain_codes" to "authenticated";

grant trigger on table "public"."user_domain_codes" to "authenticated";

grant truncate on table "public"."user_domain_codes" to "authenticated";

grant update on table "public"."user_domain_codes" to "authenticated";

grant delete on table "public"."user_domain_codes" to "service_role";

grant insert on table "public"."user_domain_codes" to "service_role";

grant references on table "public"."user_domain_codes" to "service_role";

grant select on table "public"."user_domain_codes" to "service_role";

grant trigger on table "public"."user_domain_codes" to "service_role";

grant truncate on table "public"."user_domain_codes" to "service_role";

grant update on table "public"."user_domain_codes" to "service_role";


  create policy "Enable insert for users based on user_id"
  on "public"."domain_codes"
  as permissive
  for insert
  to public
with check ((auth.uid() = author_id));



  create policy "Enable read access for all users"
  on "public"."domain_codes"
  as permissive
  for select
  to public
using (true);



  create policy "Users can insert their own trophies"
  on "public"."trophy_unlocks"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can view their own trophies"
  on "public"."trophy_unlocks"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Enable insert for authenticated users"
  on "public"."user_domain_codes"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Enable read access for own codes"
  on "public"."user_domain_codes"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Give anon users access to txt in folder 1o40xcf_0"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'resources-files'::text) AND (storage.extension(name) = 'txt'::text) AND (lower((storage.foldername(name))[1]) = 'public'::text) AND (auth.role() = 'anon'::text)));



  create policy "Give anon users access to txt in folder 1o40xcf_1"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'resources-files'::text) AND (storage.extension(name) = 'txt'::text) AND (lower((storage.foldername(name))[1]) = 'public'::text) AND (auth.role() = 'anon'::text)));




