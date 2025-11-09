drop extension if exists "pg_net";

create type "public"."achievement_category" as enum ('streak', 'accuracy', 'speed', 'social', 'learning', 'special');

create type "public"."celebration_type" as enum ('correct_answer', 'combo_multiplier', 'speed_bonus', 'accuracy_milestone', 'session_complete', 'personal_best');

create type "public"."session_state" as enum ('active', 'paused', 'completed', 'abandoned');


  create table "public"."domain_codes" (
    "id" uuid not null default uuid_generate_v4(),
    "author_id" uuid not null,
    "domain_id" uuid not null,
    "code" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."domain_codes" enable row level security;


  create table "public"."domains" (
    "id" uuid not null default uuid_generate_v4(),
    "author_id" uuid not null,
    "parent_id" uuid,
    "name" text not null,
    "description" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "domain_type" text not null default 'folder'::text
      );


alter table "public"."domains" enable row level security;


  create table "public"."questions" (
    "id" uuid not null default uuid_generate_v4(),
    "domain_id" uuid not null,
    "type" text,
    "body" text not null,
    "explanation" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "difficulty" text,
    "author_id" uuid not null,
    "resource_id" uuid,
    "options" jsonb
      );


alter table "public"."questions" enable row level security;


  create table "public"."quiz_attempt_questions" (
    "id" uuid not null default uuid_generate_v4(),
    "quiz_attempt_id" uuid not null,
    "question_id" uuid not null,
    "is_correct" boolean not null default false,
    "is_skipped" boolean not null default false,
    "is_marked_for_review" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "is_attempted" boolean,
    "confidence_level" double precision,
    "response_time_ms" bigint,
    "scrambled_order" jsonb,
    "selected_answer_index" integer
      );


alter table "public"."quiz_attempt_questions" enable row level security;


  create table "public"."quiz_attempts" (
    "id" uuid not null default uuid_generate_v4(),
    "quiz_id" uuid not null,
    "user_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."quiz_attempts" enable row level security;


  create table "public"."quizzes" (
    "id" uuid not null default uuid_generate_v4(),
    "name" text not null,
    "description" text,
    "domains" json not null,
    "is_published" boolean not null default false,
    "num_questions" integer not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "author_id" uuid not null
      );


alter table "public"."quizzes" enable row level security;


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



  create table "public"."resources" (
    "id" uuid not null default uuid_generate_v4(),
    "domain_id" uuid not null,
    "name" text not null,
    "description" text,
    "file_path" text,
    "url" text,
    "mime_type" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "status" text,
    "author_id" uuid not null,
    "topic_page_range" jsonb,
    "unparsable" text
      );


alter table "public"."resources" enable row level security;


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


  create table "public"."user_credits" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "credits" integer not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );



  create table "public"."user_domain_codes" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "domain_id" uuid not null,
    "domain_code_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );



  create table "public"."user_profiles" (
    "id" uuid not null default gen_random_uuid(),
    "display_name" text,
    "last_active_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone,
    "user_id" uuid not null,
    "currencies" jsonb,
    "is_creator_enabled" boolean not null default false,
    "terms_accepted" boolean not null default false
      );


alter table "public"."user_profiles" enable row level security;

CREATE UNIQUE INDEX domains_pkey ON public.domains USING btree (id);

CREATE INDEX idx_trophy_unlocks_quiz_attempt_id ON public.trophy_unlocks USING btree (quiz_attempt_id);

CREATE INDEX idx_trophy_unlocks_trophy_type ON public.trophy_unlocks USING btree (trophy_type);

CREATE INDEX idx_trophy_unlocks_user_id ON public.trophy_unlocks USING btree (user_id);

CREATE UNIQUE INDEX questions_pkey ON public.questions USING btree (id);

CREATE UNIQUE INDEX quiz_attempt_questions_pkey ON public.quiz_attempt_questions USING btree (id);

CREATE UNIQUE INDEX quiz_attempts_pkey ON public.quiz_attempts USING btree (id);

CREATE UNIQUE INDEX quiz_codes_pkey ON public.domain_codes USING btree (id);

CREATE UNIQUE INDEX quizzes_pkey ON public.quizzes USING btree (id);

CREATE UNIQUE INDEX resource_session_domains_pkey ON public.resource_session_domains USING btree (id);

CREATE UNIQUE INDEX resource_session_pkey ON public.resource_sessions USING btree (id);

CREATE UNIQUE INDEX resource_session_questions_pkey ON public.resource_session_questions USING btree (id);

CREATE UNIQUE INDEX resources_pkey ON public.resources USING btree (id);

CREATE UNIQUE INDEX trophy_unlocks_pkey ON public.trophy_unlocks USING btree (id);

CREATE UNIQUE INDEX user_profiles_pkey ON public.user_profiles USING btree (id);

CREATE UNIQUE INDEX user_profiles_user_id_key ON public.user_profiles USING btree (user_id);

alter table "public"."domain_codes" add constraint "quiz_codes_pkey" PRIMARY KEY using index "quiz_codes_pkey";

alter table "public"."domains" add constraint "domains_pkey" PRIMARY KEY using index "domains_pkey";

alter table "public"."questions" add constraint "questions_pkey" PRIMARY KEY using index "questions_pkey";

alter table "public"."quiz_attempt_questions" add constraint "quiz_attempt_questions_pkey" PRIMARY KEY using index "quiz_attempt_questions_pkey";

alter table "public"."quiz_attempts" add constraint "quiz_attempts_pkey" PRIMARY KEY using index "quiz_attempts_pkey";

alter table "public"."quizzes" add constraint "quizzes_pkey" PRIMARY KEY using index "quizzes_pkey";

alter table "public"."resource_session_domains" add constraint "resource_session_domains_pkey" PRIMARY KEY using index "resource_session_domains_pkey";

alter table "public"."resource_session_questions" add constraint "resource_session_questions_pkey" PRIMARY KEY using index "resource_session_questions_pkey";

alter table "public"."resource_sessions" add constraint "resource_session_pkey" PRIMARY KEY using index "resource_session_pkey";

alter table "public"."resources" add constraint "resources_pkey" PRIMARY KEY using index "resources_pkey";

alter table "public"."trophy_unlocks" add constraint "trophy_unlocks_pkey" PRIMARY KEY using index "trophy_unlocks_pkey";

alter table "public"."user_profiles" add constraint "user_profiles_pkey" PRIMARY KEY using index "user_profiles_pkey";

alter table "public"."domain_codes" add constraint "domain_codes_author_id_fkey" FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."domain_codes" validate constraint "domain_codes_author_id_fkey";

alter table "public"."domain_codes" add constraint "domain_codes_domain_id_fkey" FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE not valid;

alter table "public"."domain_codes" validate constraint "domain_codes_domain_id_fkey";

alter table "public"."domain_codes" add constraint "quizz_codes_quizz_id_fkey" FOREIGN KEY (domain_id) REFERENCES quizzes(id) not valid;

alter table "public"."domain_codes" validate constraint "quizz_codes_quizz_id_fkey";

alter table "public"."domain_codes" add constraint "quizzes_user_id_fkey" FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."domain_codes" validate constraint "quizzes_user_id_fkey";

alter table "public"."domains" add constraint "domains_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES domains(id) ON DELETE CASCADE not valid;

alter table "public"."domains" validate constraint "domains_parent_id_fkey";

alter table "public"."domains" add constraint "domains_user_id_fkey" FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."domains" validate constraint "domains_user_id_fkey";

alter table "public"."questions" add constraint "questions_domain_id_fkey" FOREIGN KEY (domain_id) REFERENCES domains(id) not valid;

alter table "public"."questions" validate constraint "questions_domain_id_fkey";

alter table "public"."questions" add constraint "questions_resource_id_fkey" FOREIGN KEY (resource_id) REFERENCES resources(id) not valid;

alter table "public"."questions" validate constraint "questions_resource_id_fkey";

alter table "public"."quiz_attempt_questions" add constraint "quiz_attempt_questions_question_id_fkey" FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE not valid;

alter table "public"."quiz_attempt_questions" validate constraint "quiz_attempt_questions_question_id_fkey";

alter table "public"."quiz_attempt_questions" add constraint "quiz_attempt_questions_quiz_attempt_id_fkey" FOREIGN KEY (quiz_attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE not valid;

alter table "public"."quiz_attempt_questions" validate constraint "quiz_attempt_questions_quiz_attempt_id_fkey";

alter table "public"."quiz_attempts" add constraint "quiz_attempts_quiz_id_fkey" FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE not valid;

alter table "public"."quiz_attempts" validate constraint "quiz_attempts_quiz_id_fkey";

alter table "public"."quiz_attempts" add constraint "quiz_attempts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."quiz_attempts" validate constraint "quiz_attempts_user_id_fkey";

alter table "public"."quizzes" add constraint "quizzes_user_id_fkey" FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."quizzes" validate constraint "quizzes_user_id_fkey";

alter table "public"."resource_session_domains" add constraint "resource_session_domains_resource_session_id_fkey" FOREIGN KEY (resource_session_id) REFERENCES resource_sessions(id) not valid;

alter table "public"."resource_session_domains" validate constraint "resource_session_domains_resource_session_id_fkey";

alter table "public"."resource_session_questions" add constraint "resource_session_questions_resource_session_domain_id_fkey" FOREIGN KEY (resource_session_domain_id) REFERENCES resource_session_domains(id) not valid;

alter table "public"."resource_session_questions" validate constraint "resource_session_questions_resource_session_domain_id_fkey";

alter table "public"."resource_session_questions" add constraint "resource_session_questions_resource_session_id_fkey" FOREIGN KEY (resource_session_id) REFERENCES resource_sessions(id) not valid;

alter table "public"."resource_session_questions" validate constraint "resource_session_questions_resource_session_id_fkey";

alter table "public"."resources" add constraint "resources_domain_id_fkey" FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE not valid;

alter table "public"."resources" validate constraint "resources_domain_id_fkey";

alter table "public"."resources" add constraint "resources_user_id_fkey" FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."resources" validate constraint "resources_user_id_fkey";

alter table "public"."trophy_unlocks" add constraint "trophy_unlocks_quiz_attempt_id_fkey" FOREIGN KEY (quiz_attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE not valid;

alter table "public"."trophy_unlocks" validate constraint "trophy_unlocks_quiz_attempt_id_fkey";

alter table "public"."trophy_unlocks" add constraint "trophy_unlocks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."trophy_unlocks" validate constraint "trophy_unlocks_user_id_fkey";

alter table "public"."user_credits" add constraint "user_credits_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."user_credits" validate constraint "user_credits_user_id_fkey";

alter table "public"."user_domain_codes" add constraint "user_domain_codes_domain_code_id_fkey" FOREIGN KEY (domain_code_id) REFERENCES domain_codes(id) ON DELETE CASCADE not valid;

alter table "public"."user_domain_codes" validate constraint "user_domain_codes_domain_code_id_fkey";

alter table "public"."user_domain_codes" add constraint "user_domain_codes_domain_id_fkey" FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE not valid;

alter table "public"."user_domain_codes" validate constraint "user_domain_codes_domain_id_fkey";

alter table "public"."user_domain_codes" add constraint "user_domain_codes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_domain_codes" validate constraint "user_domain_codes_user_id_fkey";

alter table "public"."user_profiles" add constraint "user_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_user_id_fkey";

alter table "public"."user_profiles" add constraint "user_profiles_user_id_key" UNIQUE using index "user_profiles_user_id_key";

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

grant delete on table "public"."domains" to "anon";

grant insert on table "public"."domains" to "anon";

grant references on table "public"."domains" to "anon";

grant select on table "public"."domains" to "anon";

grant trigger on table "public"."domains" to "anon";

grant truncate on table "public"."domains" to "anon";

grant update on table "public"."domains" to "anon";

grant delete on table "public"."domains" to "authenticated";

grant insert on table "public"."domains" to "authenticated";

grant references on table "public"."domains" to "authenticated";

grant select on table "public"."domains" to "authenticated";

grant trigger on table "public"."domains" to "authenticated";

grant truncate on table "public"."domains" to "authenticated";

grant update on table "public"."domains" to "authenticated";

grant delete on table "public"."domains" to "service_role";

grant insert on table "public"."domains" to "service_role";

grant references on table "public"."domains" to "service_role";

grant select on table "public"."domains" to "service_role";

grant trigger on table "public"."domains" to "service_role";

grant truncate on table "public"."domains" to "service_role";

grant update on table "public"."domains" to "service_role";

grant delete on table "public"."questions" to "anon";

grant insert on table "public"."questions" to "anon";

grant references on table "public"."questions" to "anon";

grant select on table "public"."questions" to "anon";

grant trigger on table "public"."questions" to "anon";

grant truncate on table "public"."questions" to "anon";

grant update on table "public"."questions" to "anon";

grant delete on table "public"."questions" to "authenticated";

grant insert on table "public"."questions" to "authenticated";

grant references on table "public"."questions" to "authenticated";

grant select on table "public"."questions" to "authenticated";

grant trigger on table "public"."questions" to "authenticated";

grant truncate on table "public"."questions" to "authenticated";

grant update on table "public"."questions" to "authenticated";

grant delete on table "public"."questions" to "service_role";

grant insert on table "public"."questions" to "service_role";

grant references on table "public"."questions" to "service_role";

grant select on table "public"."questions" to "service_role";

grant trigger on table "public"."questions" to "service_role";

grant truncate on table "public"."questions" to "service_role";

grant update on table "public"."questions" to "service_role";

grant delete on table "public"."quiz_attempt_questions" to "anon";

grant insert on table "public"."quiz_attempt_questions" to "anon";

grant references on table "public"."quiz_attempt_questions" to "anon";

grant select on table "public"."quiz_attempt_questions" to "anon";

grant trigger on table "public"."quiz_attempt_questions" to "anon";

grant truncate on table "public"."quiz_attempt_questions" to "anon";

grant update on table "public"."quiz_attempt_questions" to "anon";

grant delete on table "public"."quiz_attempt_questions" to "authenticated";

grant insert on table "public"."quiz_attempt_questions" to "authenticated";

grant references on table "public"."quiz_attempt_questions" to "authenticated";

grant select on table "public"."quiz_attempt_questions" to "authenticated";

grant trigger on table "public"."quiz_attempt_questions" to "authenticated";

grant truncate on table "public"."quiz_attempt_questions" to "authenticated";

grant update on table "public"."quiz_attempt_questions" to "authenticated";

grant delete on table "public"."quiz_attempt_questions" to "service_role";

grant insert on table "public"."quiz_attempt_questions" to "service_role";

grant references on table "public"."quiz_attempt_questions" to "service_role";

grant select on table "public"."quiz_attempt_questions" to "service_role";

grant trigger on table "public"."quiz_attempt_questions" to "service_role";

grant truncate on table "public"."quiz_attempt_questions" to "service_role";

grant update on table "public"."quiz_attempt_questions" to "service_role";

grant delete on table "public"."quiz_attempts" to "anon";

grant insert on table "public"."quiz_attempts" to "anon";

grant references on table "public"."quiz_attempts" to "anon";

grant select on table "public"."quiz_attempts" to "anon";

grant trigger on table "public"."quiz_attempts" to "anon";

grant truncate on table "public"."quiz_attempts" to "anon";

grant update on table "public"."quiz_attempts" to "anon";

grant delete on table "public"."quiz_attempts" to "authenticated";

grant insert on table "public"."quiz_attempts" to "authenticated";

grant references on table "public"."quiz_attempts" to "authenticated";

grant select on table "public"."quiz_attempts" to "authenticated";

grant trigger on table "public"."quiz_attempts" to "authenticated";

grant truncate on table "public"."quiz_attempts" to "authenticated";

grant update on table "public"."quiz_attempts" to "authenticated";

grant delete on table "public"."quiz_attempts" to "service_role";

grant insert on table "public"."quiz_attempts" to "service_role";

grant references on table "public"."quiz_attempts" to "service_role";

grant select on table "public"."quiz_attempts" to "service_role";

grant trigger on table "public"."quiz_attempts" to "service_role";

grant truncate on table "public"."quiz_attempts" to "service_role";

grant update on table "public"."quiz_attempts" to "service_role";

grant delete on table "public"."quizzes" to "anon";

grant insert on table "public"."quizzes" to "anon";

grant references on table "public"."quizzes" to "anon";

grant select on table "public"."quizzes" to "anon";

grant trigger on table "public"."quizzes" to "anon";

grant truncate on table "public"."quizzes" to "anon";

grant update on table "public"."quizzes" to "anon";

grant delete on table "public"."quizzes" to "authenticated";

grant insert on table "public"."quizzes" to "authenticated";

grant references on table "public"."quizzes" to "authenticated";

grant select on table "public"."quizzes" to "authenticated";

grant trigger on table "public"."quizzes" to "authenticated";

grant truncate on table "public"."quizzes" to "authenticated";

grant update on table "public"."quizzes" to "authenticated";

grant delete on table "public"."quizzes" to "service_role";

grant insert on table "public"."quizzes" to "service_role";

grant references on table "public"."quizzes" to "service_role";

grant select on table "public"."quizzes" to "service_role";

grant trigger on table "public"."quizzes" to "service_role";

grant truncate on table "public"."quizzes" to "service_role";

grant update on table "public"."quizzes" to "service_role";

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

grant delete on table "public"."resources" to "anon";

grant insert on table "public"."resources" to "anon";

grant references on table "public"."resources" to "anon";

grant select on table "public"."resources" to "anon";

grant trigger on table "public"."resources" to "anon";

grant truncate on table "public"."resources" to "anon";

grant update on table "public"."resources" to "anon";

grant delete on table "public"."resources" to "authenticated";

grant insert on table "public"."resources" to "authenticated";

grant references on table "public"."resources" to "authenticated";

grant select on table "public"."resources" to "authenticated";

grant trigger on table "public"."resources" to "authenticated";

grant truncate on table "public"."resources" to "authenticated";

grant update on table "public"."resources" to "authenticated";

grant delete on table "public"."resources" to "service_role";

grant insert on table "public"."resources" to "service_role";

grant references on table "public"."resources" to "service_role";

grant select on table "public"."resources" to "service_role";

grant trigger on table "public"."resources" to "service_role";

grant truncate on table "public"."resources" to "service_role";

grant update on table "public"."resources" to "service_role";

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

grant delete on table "public"."user_credits" to "anon";

grant insert on table "public"."user_credits" to "anon";

grant references on table "public"."user_credits" to "anon";

grant select on table "public"."user_credits" to "anon";

grant trigger on table "public"."user_credits" to "anon";

grant truncate on table "public"."user_credits" to "anon";

grant update on table "public"."user_credits" to "anon";

grant delete on table "public"."user_credits" to "authenticated";

grant insert on table "public"."user_credits" to "authenticated";

grant references on table "public"."user_credits" to "authenticated";

grant select on table "public"."user_credits" to "authenticated";

grant trigger on table "public"."user_credits" to "authenticated";

grant truncate on table "public"."user_credits" to "authenticated";

grant update on table "public"."user_credits" to "authenticated";

grant delete on table "public"."user_credits" to "service_role";

grant insert on table "public"."user_credits" to "service_role";

grant references on table "public"."user_credits" to "service_role";

grant select on table "public"."user_credits" to "service_role";

grant trigger on table "public"."user_credits" to "service_role";

grant truncate on table "public"."user_credits" to "service_role";

grant update on table "public"."user_credits" to "service_role";

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

grant delete on table "public"."user_profiles" to "anon";

grant insert on table "public"."user_profiles" to "anon";

grant references on table "public"."user_profiles" to "anon";

grant select on table "public"."user_profiles" to "anon";

grant trigger on table "public"."user_profiles" to "anon";

grant truncate on table "public"."user_profiles" to "anon";

grant update on table "public"."user_profiles" to "anon";

grant delete on table "public"."user_profiles" to "authenticated";

grant insert on table "public"."user_profiles" to "authenticated";

grant references on table "public"."user_profiles" to "authenticated";

grant select on table "public"."user_profiles" to "authenticated";

grant trigger on table "public"."user_profiles" to "authenticated";

grant truncate on table "public"."user_profiles" to "authenticated";

grant update on table "public"."user_profiles" to "authenticated";

grant delete on table "public"."user_profiles" to "service_role";

grant insert on table "public"."user_profiles" to "service_role";

grant references on table "public"."user_profiles" to "service_role";

grant select on table "public"."user_profiles" to "service_role";

grant trigger on table "public"."user_profiles" to "service_role";

grant truncate on table "public"."user_profiles" to "service_role";

grant update on table "public"."user_profiles" to "service_role";


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



  create policy "Allow select for authenticated users"
  on "public"."domains"
  as permissive
  for select
  to authenticated
using (true);



  create policy "domains_modify_own"
  on "public"."domains"
  as permissive
  for all
  to public
using ((auth.uid() = author_id))
with check ((auth.uid() = author_id));



  create policy "Allow select for authenticated users"
  on "public"."questions"
  as permissive
  for select
  to authenticated
using (true);



  create policy "questions_modify_own"
  on "public"."questions"
  as permissive
  for all
  to public
using ((auth.uid() = author_id))
with check ((auth.uid() = author_id));



  create policy "quiz_attempt_questions_modify_own"
  on "public"."quiz_attempt_questions"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM quiz_attempts qa
  WHERE ((qa.id = quiz_attempt_questions.quiz_attempt_id) AND (qa.user_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM quiz_attempts qa
  WHERE ((qa.id = quiz_attempt_questions.quiz_attempt_id) AND (qa.user_id = auth.uid())))));



  create policy "quiz_attempt_questions_select_own"
  on "public"."quiz_attempt_questions"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM quiz_attempts qa
  WHERE ((qa.id = quiz_attempt_questions.quiz_attempt_id) AND (qa.user_id = auth.uid())))));



  create policy "quiz_attempts_modify_own"
  on "public"."quiz_attempts"
  as permissive
  for all
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "quiz_attempts_select_own"
  on "public"."quiz_attempts"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "quizzes_modify_own"
  on "public"."quizzes"
  as permissive
  for all
  to public
using ((auth.uid() = author_id))
with check ((auth.uid() = author_id));



  create policy "quizzes_select_own"
  on "public"."quizzes"
  as permissive
  for select
  to public
using ((auth.uid() = author_id));



  create policy "resources_modify_own"
  on "public"."resources"
  as permissive
  for all
  to public
using ((auth.uid() = author_id))
with check ((auth.uid() = author_id));



  create policy "resources_select_own"
  on "public"."resources"
  as permissive
  for select
  to public
using ((auth.uid() = author_id));



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



  create policy "manage own data"
  on "public"."user_profiles"
  as permissive
  for all
  to public
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));



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



  create policy "Give users access to own folder 128fyud_0"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'resources'::text) AND (( SELECT (auth.uid())::text AS uid) = (storage.foldername(name))[1])));



  create policy "Give users access to own folder 128fyud_1"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'resources'::text) AND (( SELECT (auth.uid())::text AS uid) = (storage.foldername(name))[1])));



  create policy "Give users access to own folder 128fyud_2"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'resources'::text) AND (( SELECT (auth.uid())::text AS uid) = (storage.foldername(name))[1])));



  create policy "Give users access to own folder 128fyud_3"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'resources'::text) AND (( SELECT (auth.uid())::text AS uid) = (storage.foldername(name))[1])));



  create policy "Give users access to own folder 8rioo0_0"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'quest-quiz'::text) AND (( SELECT (auth.uid())::text AS uid) = (storage.foldername(name))[1])));



  create policy "Give users access to own folder 8rioo0_1"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'quest-quiz'::text) AND (( SELECT (auth.uid())::text AS uid) = (storage.foldername(name))[1])));



  create policy "Give users access to own folder 8rioo0_2"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'quest-quiz'::text) AND (( SELECT (auth.uid())::text AS uid) = (storage.foldername(name))[1])));



  create policy "Give users access to own folder 8rioo0_3"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'quest-quiz'::text) AND (( SELECT (auth.uid())::text AS uid) = (storage.foldername(name))[1])));



