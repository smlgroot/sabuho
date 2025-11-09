-- Create resource_repositories table
CREATE TABLE IF NOT EXISTS "public"."resource_repositories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- Set table owner
ALTER TABLE "public"."resource_repositories" OWNER TO "postgres";

-- Add primary key constraint
ALTER TABLE ONLY "public"."resource_repositories"
    ADD CONSTRAINT "resource_repositories_pkey" PRIMARY KEY ("id");

-- Add resource_repository_id columns to related tables
ALTER TABLE "public"."resource_session_domains"
    ADD COLUMN "resource_repository_id" "uuid";

ALTER TABLE "public"."resource_session_questions"
    ADD COLUMN "resource_repository_id" "uuid";

ALTER TABLE "public"."resource_sessions"
    ADD COLUMN "resource_repository_id" "uuid";

-- Add foreign key constraints from other tables
ALTER TABLE ONLY "public"."resource_session_domains"
    ADD CONSTRAINT "resource_session_domains_resource_repositories_id_fkey" FOREIGN KEY ("resource_repository_id") REFERENCES "public"."resource_repositories"("id");

ALTER TABLE ONLY "public"."resource_session_questions"
    ADD CONSTRAINT "resource_session_questions_resource_repositories_id_fkey" FOREIGN KEY ("resource_repository_id") REFERENCES "public"."resource_repositories"("id");

ALTER TABLE ONLY "public"."resource_sessions"
    ADD CONSTRAINT "resource_sessions_resource_repositories_id_fkey" FOREIGN KEY ("resource_repository_id") REFERENCES "public"."resource_repositories"("id");

-- Grant permissions
GRANT ALL ON TABLE "public"."resource_repositories" TO "anon";
GRANT ALL ON TABLE "public"."resource_repositories" TO "authenticated";
GRANT ALL ON TABLE "public"."resource_repositories" TO "service_role";
