-- Migration to remove domain_type column from domains table
-- All domains will now be of type "folder" (the column is no longer needed)
-- Generated on 2025-10-19

BEGIN;

-- Drop the domain_type column from the domains table
ALTER TABLE public.domains DROP COLUMN IF EXISTS domain_type;

COMMIT;
