create type "public"."achievement_category" as enum ('streak', 'accuracy', 'speed', 'social', 'learning', 'special');

create table "public"."achievements" (
    "id" uuid not null default gen_random_uuid(),
    "user_profile_id" uuid,
    "title" character varying not null,
    "description" character varying not null,
    "icon_path" character varying not null,
    "unlocked_at" timestamp with time zone not null,
    "category" achievement_category not null,
    "points_awarded" integer not null
);


create table "public"."circadian_preferences" (
    "id" uuid not null default gen_random_uuid(),
    "peak_hours" integer[] not null,
    "low_energy_hours" integer[] not null,
    "timezone" character varying not null,
    "hourly_performance" jsonb not null
);


create table "public"."domains" (
    "id" uuid not null default uuid_generate_v4(),
    "author_id" uuid not null,
    "parent_id" uuid,
    "name" text not null,
    "description" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "thumbnail_url" text,
    "question_count" smallint
);


alter table "public"."domains" enable row level security;

create table "public"."emotional_profiles" (
    "id" uuid not null default gen_random_uuid(),
    "frustration_level" double precision not null,
    "confidence_level" double precision not null,
    "motivation_level" double precision not null,
    "topic_sentiments" jsonb not null,
    "last_emotional_update" timestamp with time zone not null
);


create table "public"."privacy_settings" (
    "id" uuid not null default gen_random_uuid(),
    "show_in_leaderboards" boolean not null,
    "allow_friend_requests" boolean not null,
    "share_activity_feed" boolean not null,
    "enable_ghost_mode" boolean not null,
    "allow_study_room_invites" boolean not null
);


create table "public"."question_options" (
    "id" uuid not null default uuid_generate_v4(),
    "question_id" uuid not null,
    "label" text not null,
    "is_correct" boolean not null default false,
    "order_index" integer,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "why" text not null,
    "domain_id" uuid not null
);


alter table "public"."question_options" enable row level security;

create table "public"."questions" (
    "id" uuid not null default uuid_generate_v4(),
    "domain_id" uuid not null,
    "type" text,
    "body" text not null,
    "explanation" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "difficulty" text,
    "author_id" uuid not null
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
    "is_attempted" boolean
);


alter table "public"."quiz_attempt_questions" enable row level security;

create table "public"."quiz_attempts" (
    "id" uuid not null default uuid_generate_v4(),
    "quiz_id" uuid not null,
    "user_id" uuid not null,
    "score" integer,
    "num_questions" integer,
    "num_correct" integer,
    "num_skipped" integer,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."quiz_attempts" enable row level security;

create table "public"."quizzes" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "name" text not null,
    "description" text,
    "domains" json,
    "is_published" boolean not null default false,
    "num_questions" integer not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."quizzes" enable row level security;

create table "public"."resources" (
    "id" uuid not null default uuid_generate_v4(),
    "domain_id" uuid not null,
    "user_id" uuid not null,
    "name" text not null,
    "description" text,
    "file_path" text,
    "url" text,
    "mime_type" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."resources" enable row level security;

create table "public"."streaks" (
    "id" uuid not null default gen_random_uuid(),
    "current_streak" integer not null,
    "longest_streak" integer not null,
    "last_quiz_date" timestamp with time zone,
    "has_streak_insurance" boolean not null,
    "streak_insurance_count" integer not null
);


create table "public"."user_profiles" (
    "id" uuid not null default gen_random_uuid(),
    "display_name" text not null,
    "selected_domain_id" uuid,
    "last_active_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone,
    "user_id" uuid not null,
    "currencies" jsonb,
    "streaks_id" uuid,
    "emotional_state_id" uuid,
    "peak_hours_id" uuid,
    "privacy_id" uuid,
    "achievements" jsonb
);


alter table "public"."user_profiles" enable row level security;

CREATE UNIQUE INDEX achievements_pkey ON public.achievements USING btree (id);

CREATE UNIQUE INDEX circadian_preferences_pkey ON public.circadian_preferences USING btree (id);

CREATE UNIQUE INDEX domains_pkey ON public.domains USING btree (id);

CREATE UNIQUE INDEX emotional_profiles_pkey ON public.emotional_profiles USING btree (id);

CREATE UNIQUE INDEX privacy_settings_pkey ON public.privacy_settings USING btree (id);

CREATE UNIQUE INDEX question_options_pkey ON public.question_options USING btree (id);

CREATE UNIQUE INDEX questions_pkey ON public.questions USING btree (id);

CREATE UNIQUE INDEX quiz_attempt_questions_pkey ON public.quiz_attempt_questions USING btree (id);

CREATE UNIQUE INDEX quiz_attempts_pkey ON public.quiz_attempts USING btree (id);

CREATE UNIQUE INDEX quizzes_pkey ON public.quizzes USING btree (id);

CREATE UNIQUE INDEX resources_pkey ON public.resources USING btree (id);

CREATE UNIQUE INDEX streaks_pkey ON public.streaks USING btree (id);

CREATE UNIQUE INDEX user_profiles_pkey ON public.user_profiles USING btree (id);

CREATE UNIQUE INDEX user_profiles_user_id_key ON public.user_profiles USING btree (user_id);

alter table "public"."achievements" add constraint "achievements_pkey" PRIMARY KEY using index "achievements_pkey";

alter table "public"."circadian_preferences" add constraint "circadian_preferences_pkey" PRIMARY KEY using index "circadian_preferences_pkey";

alter table "public"."domains" add constraint "domains_pkey" PRIMARY KEY using index "domains_pkey";

alter table "public"."emotional_profiles" add constraint "emotional_profiles_pkey" PRIMARY KEY using index "emotional_profiles_pkey";

alter table "public"."privacy_settings" add constraint "privacy_settings_pkey" PRIMARY KEY using index "privacy_settings_pkey";

alter table "public"."question_options" add constraint "question_options_pkey" PRIMARY KEY using index "question_options_pkey";

alter table "public"."questions" add constraint "questions_pkey" PRIMARY KEY using index "questions_pkey";

alter table "public"."quiz_attempt_questions" add constraint "quiz_attempt_questions_pkey" PRIMARY KEY using index "quiz_attempt_questions_pkey";

alter table "public"."quiz_attempts" add constraint "quiz_attempts_pkey" PRIMARY KEY using index "quiz_attempts_pkey";

alter table "public"."quizzes" add constraint "quizzes_pkey" PRIMARY KEY using index "quizzes_pkey";

alter table "public"."resources" add constraint "resources_pkey" PRIMARY KEY using index "resources_pkey";

alter table "public"."streaks" add constraint "streaks_pkey" PRIMARY KEY using index "streaks_pkey";

alter table "public"."user_profiles" add constraint "user_profiles_pkey" PRIMARY KEY using index "user_profiles_pkey";

alter table "public"."achievements" add constraint "achievements_user_profile_id_fkey" FOREIGN KEY (user_profile_id) REFERENCES user_profiles(id) not valid;

alter table "public"."achievements" validate constraint "achievements_user_profile_id_fkey";

alter table "public"."domains" add constraint "domains_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES domains(id) ON DELETE CASCADE not valid;

alter table "public"."domains" validate constraint "domains_parent_id_fkey";

alter table "public"."domains" add constraint "domains_user_id_fkey" FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."domains" validate constraint "domains_user_id_fkey";

alter table "public"."question_options" add constraint "question_options_domain_id_fkey" FOREIGN KEY (domain_id) REFERENCES domains(id) not valid;

alter table "public"."question_options" validate constraint "question_options_domain_id_fkey";

alter table "public"."question_options" add constraint "question_options_question_id_fkey" FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE not valid;

alter table "public"."question_options" validate constraint "question_options_question_id_fkey";

alter table "public"."questions" add constraint "questions_domain_id_fkey" FOREIGN KEY (domain_id) REFERENCES domains(id) not valid;

alter table "public"."questions" validate constraint "questions_domain_id_fkey";

alter table "public"."quiz_attempt_questions" add constraint "quiz_attempt_questions_question_id_fkey" FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE not valid;

alter table "public"."quiz_attempt_questions" validate constraint "quiz_attempt_questions_question_id_fkey";

alter table "public"."quiz_attempt_questions" add constraint "quiz_attempt_questions_quiz_attempt_id_fkey" FOREIGN KEY (quiz_attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE not valid;

alter table "public"."quiz_attempt_questions" validate constraint "quiz_attempt_questions_quiz_attempt_id_fkey";

alter table "public"."quiz_attempts" add constraint "quiz_attempts_quiz_id_fkey" FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE not valid;

alter table "public"."quiz_attempts" validate constraint "quiz_attempts_quiz_id_fkey";

alter table "public"."quiz_attempts" add constraint "quiz_attempts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."quiz_attempts" validate constraint "quiz_attempts_user_id_fkey";

alter table "public"."quizzes" add constraint "quizzes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."quizzes" validate constraint "quizzes_user_id_fkey";

alter table "public"."resources" add constraint "resources_domain_id_fkey" FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE not valid;

alter table "public"."resources" validate constraint "resources_domain_id_fkey";

alter table "public"."resources" add constraint "resources_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."resources" validate constraint "resources_user_id_fkey";

alter table "public"."user_profiles" add constraint "user_profiles_emotional_state_id_fkey" FOREIGN KEY (emotional_state_id) REFERENCES emotional_profiles(id) not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_emotional_state_id_fkey";

alter table "public"."user_profiles" add constraint "user_profiles_peak_hours_id_fkey" FOREIGN KEY (peak_hours_id) REFERENCES circadian_preferences(id) not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_peak_hours_id_fkey";

alter table "public"."user_profiles" add constraint "user_profiles_privacy_id_fkey" FOREIGN KEY (privacy_id) REFERENCES privacy_settings(id) not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_privacy_id_fkey";

alter table "public"."user_profiles" add constraint "user_profiles_streaks_id_fkey" FOREIGN KEY (streaks_id) REFERENCES streaks(id) not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_streaks_id_fkey";

alter table "public"."user_profiles" add constraint "user_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_user_id_fkey";

alter table "public"."user_profiles" add constraint "user_profiles_user_id_key" UNIQUE using index "user_profiles_user_id_key";

grant delete on table "public"."achievements" to "anon";

grant insert on table "public"."achievements" to "anon";

grant references on table "public"."achievements" to "anon";

grant select on table "public"."achievements" to "anon";

grant trigger on table "public"."achievements" to "anon";

grant truncate on table "public"."achievements" to "anon";

grant update on table "public"."achievements" to "anon";

grant delete on table "public"."achievements" to "authenticated";

grant insert on table "public"."achievements" to "authenticated";

grant references on table "public"."achievements" to "authenticated";

grant select on table "public"."achievements" to "authenticated";

grant trigger on table "public"."achievements" to "authenticated";

grant truncate on table "public"."achievements" to "authenticated";

grant update on table "public"."achievements" to "authenticated";

grant delete on table "public"."achievements" to "service_role";

grant insert on table "public"."achievements" to "service_role";

grant references on table "public"."achievements" to "service_role";

grant select on table "public"."achievements" to "service_role";

grant trigger on table "public"."achievements" to "service_role";

grant truncate on table "public"."achievements" to "service_role";

grant update on table "public"."achievements" to "service_role";

grant delete on table "public"."circadian_preferences" to "anon";

grant insert on table "public"."circadian_preferences" to "anon";

grant references on table "public"."circadian_preferences" to "anon";

grant select on table "public"."circadian_preferences" to "anon";

grant trigger on table "public"."circadian_preferences" to "anon";

grant truncate on table "public"."circadian_preferences" to "anon";

grant update on table "public"."circadian_preferences" to "anon";

grant delete on table "public"."circadian_preferences" to "authenticated";

grant insert on table "public"."circadian_preferences" to "authenticated";

grant references on table "public"."circadian_preferences" to "authenticated";

grant select on table "public"."circadian_preferences" to "authenticated";

grant trigger on table "public"."circadian_preferences" to "authenticated";

grant truncate on table "public"."circadian_preferences" to "authenticated";

grant update on table "public"."circadian_preferences" to "authenticated";

grant delete on table "public"."circadian_preferences" to "service_role";

grant insert on table "public"."circadian_preferences" to "service_role";

grant references on table "public"."circadian_preferences" to "service_role";

grant select on table "public"."circadian_preferences" to "service_role";

grant trigger on table "public"."circadian_preferences" to "service_role";

grant truncate on table "public"."circadian_preferences" to "service_role";

grant update on table "public"."circadian_preferences" to "service_role";

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

grant delete on table "public"."emotional_profiles" to "anon";

grant insert on table "public"."emotional_profiles" to "anon";

grant references on table "public"."emotional_profiles" to "anon";

grant select on table "public"."emotional_profiles" to "anon";

grant trigger on table "public"."emotional_profiles" to "anon";

grant truncate on table "public"."emotional_profiles" to "anon";

grant update on table "public"."emotional_profiles" to "anon";

grant delete on table "public"."emotional_profiles" to "authenticated";

grant insert on table "public"."emotional_profiles" to "authenticated";

grant references on table "public"."emotional_profiles" to "authenticated";

grant select on table "public"."emotional_profiles" to "authenticated";

grant trigger on table "public"."emotional_profiles" to "authenticated";

grant truncate on table "public"."emotional_profiles" to "authenticated";

grant update on table "public"."emotional_profiles" to "authenticated";

grant delete on table "public"."emotional_profiles" to "service_role";

grant insert on table "public"."emotional_profiles" to "service_role";

grant references on table "public"."emotional_profiles" to "service_role";

grant select on table "public"."emotional_profiles" to "service_role";

grant trigger on table "public"."emotional_profiles" to "service_role";

grant truncate on table "public"."emotional_profiles" to "service_role";

grant update on table "public"."emotional_profiles" to "service_role";

grant delete on table "public"."privacy_settings" to "anon";

grant insert on table "public"."privacy_settings" to "anon";

grant references on table "public"."privacy_settings" to "anon";

grant select on table "public"."privacy_settings" to "anon";

grant trigger on table "public"."privacy_settings" to "anon";

grant truncate on table "public"."privacy_settings" to "anon";

grant update on table "public"."privacy_settings" to "anon";

grant delete on table "public"."privacy_settings" to "authenticated";

grant insert on table "public"."privacy_settings" to "authenticated";

grant references on table "public"."privacy_settings" to "authenticated";

grant select on table "public"."privacy_settings" to "authenticated";

grant trigger on table "public"."privacy_settings" to "authenticated";

grant truncate on table "public"."privacy_settings" to "authenticated";

grant update on table "public"."privacy_settings" to "authenticated";

grant delete on table "public"."privacy_settings" to "service_role";

grant insert on table "public"."privacy_settings" to "service_role";

grant references on table "public"."privacy_settings" to "service_role";

grant select on table "public"."privacy_settings" to "service_role";

grant trigger on table "public"."privacy_settings" to "service_role";

grant truncate on table "public"."privacy_settings" to "service_role";

grant update on table "public"."privacy_settings" to "service_role";

grant delete on table "public"."question_options" to "anon";

grant insert on table "public"."question_options" to "anon";

grant references on table "public"."question_options" to "anon";

grant select on table "public"."question_options" to "anon";

grant trigger on table "public"."question_options" to "anon";

grant truncate on table "public"."question_options" to "anon";

grant update on table "public"."question_options" to "anon";

grant delete on table "public"."question_options" to "authenticated";

grant insert on table "public"."question_options" to "authenticated";

grant references on table "public"."question_options" to "authenticated";

grant select on table "public"."question_options" to "authenticated";

grant trigger on table "public"."question_options" to "authenticated";

grant truncate on table "public"."question_options" to "authenticated";

grant update on table "public"."question_options" to "authenticated";

grant delete on table "public"."question_options" to "service_role";

grant insert on table "public"."question_options" to "service_role";

grant references on table "public"."question_options" to "service_role";

grant select on table "public"."question_options" to "service_role";

grant trigger on table "public"."question_options" to "service_role";

grant truncate on table "public"."question_options" to "service_role";

grant update on table "public"."question_options" to "service_role";

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

grant delete on table "public"."streaks" to "anon";

grant insert on table "public"."streaks" to "anon";

grant references on table "public"."streaks" to "anon";

grant select on table "public"."streaks" to "anon";

grant trigger on table "public"."streaks" to "anon";

grant truncate on table "public"."streaks" to "anon";

grant update on table "public"."streaks" to "anon";

grant delete on table "public"."streaks" to "authenticated";

grant insert on table "public"."streaks" to "authenticated";

grant references on table "public"."streaks" to "authenticated";

grant select on table "public"."streaks" to "authenticated";

grant trigger on table "public"."streaks" to "authenticated";

grant truncate on table "public"."streaks" to "authenticated";

grant update on table "public"."streaks" to "authenticated";

grant delete on table "public"."streaks" to "service_role";

grant insert on table "public"."streaks" to "service_role";

grant references on table "public"."streaks" to "service_role";

grant select on table "public"."streaks" to "service_role";

grant trigger on table "public"."streaks" to "service_role";

grant truncate on table "public"."streaks" to "service_role";

grant update on table "public"."streaks" to "service_role";

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


create policy "qopts_modify_own"
on "public"."question_options"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM questions q
  WHERE ((q.id = question_options.question_id) AND (q.author_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM questions q
  WHERE ((q.id = question_options.question_id) AND (q.author_id = auth.uid())))));


create policy "qopts_select_own"
on "public"."question_options"
as permissive
for select
to authenticated
using (true);


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
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


create policy "quizzes_select_own"
on "public"."quizzes"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "resources_modify_own"
on "public"."resources"
as permissive
for all
to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


create policy "resources_select_own"
on "public"."resources"
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



