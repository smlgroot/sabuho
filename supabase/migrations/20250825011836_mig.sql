drop policy "resources_modify_own" on "public"."resources";

drop policy "resources_select_own" on "public"."resources";

alter table "public"."resources" drop constraint "resources_user_id_fkey";

alter table "public"."questions" add column "options" jsonb;

alter table "public"."resources" drop column "user_id";

alter table "public"."resources" add column "author_id" uuid not null;

alter table "public"."resources" add column "topic_page_range" jsonb;

alter table "public"."resources" add column "unparsable" text;

alter table "public"."resources" add constraint "resources_user_id_fkey" FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."resources" validate constraint "resources_user_id_fkey";


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



