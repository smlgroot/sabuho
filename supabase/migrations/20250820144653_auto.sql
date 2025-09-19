create type "public"."celebration_type" as enum ('correct_answer', 'combo_multiplier', 'speed_bonus', 'accuracy_milestone', 'session_complete', 'personal_best');

create type "public"."session_state" as enum ('active', 'paused', 'completed', 'abandoned');

create sequence "public"."celebration_events_id_seq";

create sequence "public"."question_attempts_id_seq";

create table "public"."celebration_events" (
    "id" integer not null default nextval('celebration_events_id_seq'::regclass),
    "session_id" uuid not null,
    "type" celebration_type not null,
    "message" text not null,
    "timestamp" timestamp with time zone not null,
    "metadata" jsonb not null
);


create table "public"."question_attempts" (
    "id" integer not null default nextval('question_attempts_id_seq'::regclass),
    "session_id" uuid not null,
    "question_id" uuid not null,
    "selected_answer_id" uuid not null,
    "correct_answer_id" uuid not null,
    "is_correct" boolean not null,
    "response_time_ms" integer not null,
    "confidence_level" double precision not null,
    "combo_multiplier" integer not null,
    "timestamp" timestamp with time zone not null
);


create table "public"."quiz_sessions" (
    "id" uuid not null,
    "user_id" uuid not null,
    "domain_id" uuid not null,
    "metrics" jsonb not null,
    "emotional_flow" jsonb not null,
    "start_time" timestamp with time zone not null,
    "total_time_seconds" integer not null,
    "final_score" double precision not null,
    "state" session_state not null
);


alter table "public"."question_options" alter column "why" drop not null;

alter table "public"."questions" add column "resource_id" uuid;

alter table "public"."resources" add column "status" text;

alter sequence "public"."celebration_events_id_seq" owned by "public"."celebration_events"."id";

alter sequence "public"."question_attempts_id_seq" owned by "public"."question_attempts"."id";

CREATE UNIQUE INDEX celebration_events_pkey ON public.celebration_events USING btree (id);

CREATE INDEX idx_celebration_events_session ON public.celebration_events USING btree (session_id);

CREATE INDEX idx_question_attempts_session ON public.question_attempts USING btree (session_id);

CREATE UNIQUE INDEX question_attempts_pkey ON public.question_attempts USING btree (id);

CREATE UNIQUE INDEX quiz_sessions_pkey ON public.quiz_sessions USING btree (id);

alter table "public"."celebration_events" add constraint "celebration_events_pkey" PRIMARY KEY using index "celebration_events_pkey";

alter table "public"."question_attempts" add constraint "question_attempts_pkey" PRIMARY KEY using index "question_attempts_pkey";

alter table "public"."quiz_sessions" add constraint "quiz_sessions_pkey" PRIMARY KEY using index "quiz_sessions_pkey";

alter table "public"."celebration_events" add constraint "celebration_events_session_id_fkey" FOREIGN KEY (session_id) REFERENCES quiz_sessions(id) ON DELETE CASCADE not valid;

alter table "public"."celebration_events" validate constraint "celebration_events_session_id_fkey";

alter table "public"."question_attempts" add constraint "question_attempts_session_id_fkey" FOREIGN KEY (session_id) REFERENCES quiz_sessions(id) ON DELETE CASCADE not valid;

alter table "public"."question_attempts" validate constraint "question_attempts_session_id_fkey";

alter table "public"."questions" add constraint "questions_resource_id_fkey" FOREIGN KEY (resource_id) REFERENCES resources(id) not valid;

alter table "public"."questions" validate constraint "questions_resource_id_fkey";

grant delete on table "public"."celebration_events" to "anon";

grant insert on table "public"."celebration_events" to "anon";

grant references on table "public"."celebration_events" to "anon";

grant select on table "public"."celebration_events" to "anon";

grant trigger on table "public"."celebration_events" to "anon";

grant truncate on table "public"."celebration_events" to "anon";

grant update on table "public"."celebration_events" to "anon";

grant delete on table "public"."celebration_events" to "authenticated";

grant insert on table "public"."celebration_events" to "authenticated";

grant references on table "public"."celebration_events" to "authenticated";

grant select on table "public"."celebration_events" to "authenticated";

grant trigger on table "public"."celebration_events" to "authenticated";

grant truncate on table "public"."celebration_events" to "authenticated";

grant update on table "public"."celebration_events" to "authenticated";

grant delete on table "public"."celebration_events" to "service_role";

grant insert on table "public"."celebration_events" to "service_role";

grant references on table "public"."celebration_events" to "service_role";

grant select on table "public"."celebration_events" to "service_role";

grant trigger on table "public"."celebration_events" to "service_role";

grant truncate on table "public"."celebration_events" to "service_role";

grant update on table "public"."celebration_events" to "service_role";

grant delete on table "public"."question_attempts" to "anon";

grant insert on table "public"."question_attempts" to "anon";

grant references on table "public"."question_attempts" to "anon";

grant select on table "public"."question_attempts" to "anon";

grant trigger on table "public"."question_attempts" to "anon";

grant truncate on table "public"."question_attempts" to "anon";

grant update on table "public"."question_attempts" to "anon";

grant delete on table "public"."question_attempts" to "authenticated";

grant insert on table "public"."question_attempts" to "authenticated";

grant references on table "public"."question_attempts" to "authenticated";

grant select on table "public"."question_attempts" to "authenticated";

grant trigger on table "public"."question_attempts" to "authenticated";

grant truncate on table "public"."question_attempts" to "authenticated";

grant update on table "public"."question_attempts" to "authenticated";

grant delete on table "public"."question_attempts" to "service_role";

grant insert on table "public"."question_attempts" to "service_role";

grant references on table "public"."question_attempts" to "service_role";

grant select on table "public"."question_attempts" to "service_role";

grant trigger on table "public"."question_attempts" to "service_role";

grant truncate on table "public"."question_attempts" to "service_role";

grant update on table "public"."question_attempts" to "service_role";

grant delete on table "public"."quiz_sessions" to "anon";

grant insert on table "public"."quiz_sessions" to "anon";

grant references on table "public"."quiz_sessions" to "anon";

grant select on table "public"."quiz_sessions" to "anon";

grant trigger on table "public"."quiz_sessions" to "anon";

grant truncate on table "public"."quiz_sessions" to "anon";

grant update on table "public"."quiz_sessions" to "anon";

grant delete on table "public"."quiz_sessions" to "authenticated";

grant insert on table "public"."quiz_sessions" to "authenticated";

grant references on table "public"."quiz_sessions" to "authenticated";

grant select on table "public"."quiz_sessions" to "authenticated";

grant trigger on table "public"."quiz_sessions" to "authenticated";

grant truncate on table "public"."quiz_sessions" to "authenticated";

grant update on table "public"."quiz_sessions" to "authenticated";

grant delete on table "public"."quiz_sessions" to "service_role";

grant insert on table "public"."quiz_sessions" to "service_role";

grant references on table "public"."quiz_sessions" to "service_role";

grant select on table "public"."quiz_sessions" to "service_role";

grant trigger on table "public"."quiz_sessions" to "service_role";

grant truncate on table "public"."quiz_sessions" to "service_role";

grant update on table "public"."quiz_sessions" to "service_role";


