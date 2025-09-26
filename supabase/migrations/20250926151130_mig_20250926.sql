drop policy "quizzes_modify_own" on "public"."quizzes";

drop policy "quizzes_select_own" on "public"."quizzes";

alter table "public"."user_profiles" drop constraint "user_profiles_emotional_state_id_fkey";

alter table "public"."user_profiles" drop constraint "user_profiles_peak_hours_id_fkey";

alter table "public"."user_profiles" drop constraint "user_profiles_privacy_id_fkey";

alter table "public"."user_profiles" drop constraint "user_profiles_streaks_id_fkey";

alter table "public"."quizzes" drop constraint "quizzes_user_id_fkey";


  create table "public"."quiz_codes" (
    "id" uuid not null default uuid_generate_v4(),
    "author_id" uuid not null,
    "quiz_id" uuid not null,
    "code" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."quiz_codes" enable row level security;


  create table "public"."quiz_learning_level_names" (
    "id" uuid not null default uuid_generate_v4(),
    "name" text not null,
    "type" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );



  create table "public"."quiz_learning_levels" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "quiz_id" uuid not null,
    "index" integer not null,
    "name" text not null,
    "type" text not null,
    "is_unlocked" boolean not null default false,
    "is_completed" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );



  create table "public"."user_credits" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "credits" integer not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );



  create table "public"."user_quiz_codes" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "quiz_id" uuid not null,
    "quiz_code_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."quizzes" drop column "user_id";

alter table "public"."user_profiles" drop column "achievements";

alter table "public"."user_profiles" drop column "emotional_state_id";

alter table "public"."user_profiles" drop column "peak_hours_id";

alter table "public"."user_profiles" drop column "privacy_id";

alter table "public"."user_profiles" drop column "selected_domain_id";

alter table "public"."user_profiles" drop column "streaks_id";

alter table "public"."user_profiles" add column "is_creator_enabled" boolean not null default false;

alter table "public"."user_profiles" add column "terms_accepted" boolean not null default false;

alter table "public"."user_profiles" alter column "display_name" drop not null;

CREATE UNIQUE INDEX quiz_codes_pkey ON public.quiz_codes USING btree (id);

CREATE UNIQUE INDEX quiz_learning_paths_pkey ON public.quiz_learning_levels USING btree (id);

alter table "public"."quiz_codes" add constraint "quiz_codes_pkey" PRIMARY KEY using index "quiz_codes_pkey";

alter table "public"."quiz_learning_levels" add constraint "quiz_learning_paths_pkey" PRIMARY KEY using index "quiz_learning_paths_pkey";

alter table "public"."quiz_codes" add constraint "quizz_codes_quizz_id_fkey" FOREIGN KEY (quiz_id) REFERENCES quizzes(id) not valid;

alter table "public"."quiz_codes" validate constraint "quizz_codes_quizz_id_fkey";

alter table "public"."quiz_codes" add constraint "quizzes_user_id_fkey" FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."quiz_codes" validate constraint "quizzes_user_id_fkey";

alter table "public"."quiz_learning_levels" add constraint "quiz_learning_paths_quiz_id_fkey" FOREIGN KEY (quiz_id) REFERENCES quizzes(id) not valid;

alter table "public"."quiz_learning_levels" validate constraint "quiz_learning_paths_quiz_id_fkey";

alter table "public"."user_credits" add constraint "user_credits_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."user_credits" validate constraint "user_credits_user_id_fkey";

alter table "public"."user_quiz_codes" add constraint "user_quiz_codes_quiz_code_id_fkey" FOREIGN KEY (quiz_code_id) REFERENCES quiz_codes(id) not valid;

alter table "public"."user_quiz_codes" validate constraint "user_quiz_codes_quiz_code_id_fkey";

alter table "public"."user_quiz_codes" add constraint "user_quiz_codes_quiz_id_fkey" FOREIGN KEY (quiz_id) REFERENCES quizzes(id) not valid;

alter table "public"."user_quiz_codes" validate constraint "user_quiz_codes_quiz_id_fkey";

alter table "public"."user_quiz_codes" add constraint "user_quiz_codes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."user_quiz_codes" validate constraint "user_quiz_codes_user_id_fkey";

alter table "public"."quizzes" add constraint "quizzes_user_id_fkey" FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."quizzes" validate constraint "quizzes_user_id_fkey";

grant delete on table "public"."quiz_codes" to "anon";

grant insert on table "public"."quiz_codes" to "anon";

grant references on table "public"."quiz_codes" to "anon";

grant select on table "public"."quiz_codes" to "anon";

grant trigger on table "public"."quiz_codes" to "anon";

grant truncate on table "public"."quiz_codes" to "anon";

grant update on table "public"."quiz_codes" to "anon";

grant delete on table "public"."quiz_codes" to "authenticated";

grant insert on table "public"."quiz_codes" to "authenticated";

grant references on table "public"."quiz_codes" to "authenticated";

grant select on table "public"."quiz_codes" to "authenticated";

grant trigger on table "public"."quiz_codes" to "authenticated";

grant truncate on table "public"."quiz_codes" to "authenticated";

grant update on table "public"."quiz_codes" to "authenticated";

grant delete on table "public"."quiz_codes" to "service_role";

grant insert on table "public"."quiz_codes" to "service_role";

grant references on table "public"."quiz_codes" to "service_role";

grant select on table "public"."quiz_codes" to "service_role";

grant trigger on table "public"."quiz_codes" to "service_role";

grant truncate on table "public"."quiz_codes" to "service_role";

grant update on table "public"."quiz_codes" to "service_role";

grant delete on table "public"."quiz_learning_level_names" to "anon";

grant insert on table "public"."quiz_learning_level_names" to "anon";

grant references on table "public"."quiz_learning_level_names" to "anon";

grant select on table "public"."quiz_learning_level_names" to "anon";

grant trigger on table "public"."quiz_learning_level_names" to "anon";

grant truncate on table "public"."quiz_learning_level_names" to "anon";

grant update on table "public"."quiz_learning_level_names" to "anon";

grant delete on table "public"."quiz_learning_level_names" to "authenticated";

grant insert on table "public"."quiz_learning_level_names" to "authenticated";

grant references on table "public"."quiz_learning_level_names" to "authenticated";

grant select on table "public"."quiz_learning_level_names" to "authenticated";

grant trigger on table "public"."quiz_learning_level_names" to "authenticated";

grant truncate on table "public"."quiz_learning_level_names" to "authenticated";

grant update on table "public"."quiz_learning_level_names" to "authenticated";

grant delete on table "public"."quiz_learning_level_names" to "service_role";

grant insert on table "public"."quiz_learning_level_names" to "service_role";

grant references on table "public"."quiz_learning_level_names" to "service_role";

grant select on table "public"."quiz_learning_level_names" to "service_role";

grant trigger on table "public"."quiz_learning_level_names" to "service_role";

grant truncate on table "public"."quiz_learning_level_names" to "service_role";

grant update on table "public"."quiz_learning_level_names" to "service_role";

grant delete on table "public"."quiz_learning_levels" to "anon";

grant insert on table "public"."quiz_learning_levels" to "anon";

grant references on table "public"."quiz_learning_levels" to "anon";

grant select on table "public"."quiz_learning_levels" to "anon";

grant trigger on table "public"."quiz_learning_levels" to "anon";

grant truncate on table "public"."quiz_learning_levels" to "anon";

grant update on table "public"."quiz_learning_levels" to "anon";

grant delete on table "public"."quiz_learning_levels" to "authenticated";

grant insert on table "public"."quiz_learning_levels" to "authenticated";

grant references on table "public"."quiz_learning_levels" to "authenticated";

grant select on table "public"."quiz_learning_levels" to "authenticated";

grant trigger on table "public"."quiz_learning_levels" to "authenticated";

grant truncate on table "public"."quiz_learning_levels" to "authenticated";

grant update on table "public"."quiz_learning_levels" to "authenticated";

grant delete on table "public"."quiz_learning_levels" to "service_role";

grant insert on table "public"."quiz_learning_levels" to "service_role";

grant references on table "public"."quiz_learning_levels" to "service_role";

grant select on table "public"."quiz_learning_levels" to "service_role";

grant trigger on table "public"."quiz_learning_levels" to "service_role";

grant truncate on table "public"."quiz_learning_levels" to "service_role";

grant update on table "public"."quiz_learning_levels" to "service_role";

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

grant delete on table "public"."user_quiz_codes" to "anon";

grant insert on table "public"."user_quiz_codes" to "anon";

grant references on table "public"."user_quiz_codes" to "anon";

grant select on table "public"."user_quiz_codes" to "anon";

grant trigger on table "public"."user_quiz_codes" to "anon";

grant truncate on table "public"."user_quiz_codes" to "anon";

grant update on table "public"."user_quiz_codes" to "anon";

grant delete on table "public"."user_quiz_codes" to "authenticated";

grant insert on table "public"."user_quiz_codes" to "authenticated";

grant references on table "public"."user_quiz_codes" to "authenticated";

grant select on table "public"."user_quiz_codes" to "authenticated";

grant trigger on table "public"."user_quiz_codes" to "authenticated";

grant truncate on table "public"."user_quiz_codes" to "authenticated";

grant update on table "public"."user_quiz_codes" to "authenticated";

grant delete on table "public"."user_quiz_codes" to "service_role";

grant insert on table "public"."user_quiz_codes" to "service_role";

grant references on table "public"."user_quiz_codes" to "service_role";

grant select on table "public"."user_quiz_codes" to "service_role";

grant trigger on table "public"."user_quiz_codes" to "service_role";

grant truncate on table "public"."user_quiz_codes" to "service_role";

grant update on table "public"."user_quiz_codes" to "service_role";


  create policy "Enable insert for users based on user_id"
  on "public"."quiz_codes"
  as permissive
  for all
  to public
using ((auth.uid() = author_id))
with check ((auth.uid() = author_id));



  create policy "Enable read access for all users"
  on "public"."quiz_codes"
  as permissive
  for select
  to public
using (true);



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




