
ALTER TABLE "resource_sessions"
  ADD COLUMN "status_history" jsonb DEFAULT '[]'::jsonb;
