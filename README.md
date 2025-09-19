git config user.name "Sergio Lopez"
git config user.email "smlgroot@gmail.com"
git commit --amend --reset-author


---------------------------------------------------------------------
# Supabase
-- Execute from root directory
supabse link

# backup schema
supabase db dump --db-url "postgresql://postgres:postgres@127.0.0.1:54322/postgres" > local_schema_20250906.sql

# diff local with remote, move ile to supabase/migrations when sql file looks right
supabase db diff --local > 20250906191829_mig_20250906.sql

# check migrations, local ones applied depends on the files in migration directory, remote ones depend on push command
supabase migration list

# push changes
supabase db push


---------------------------------------------------------------------
# Heroku
heroku status
heroku ps
heroku ps:scale web=1 --app orto-pdf-processor
heroku ps
heroku ps
heroku logs --app orto-pdf-processor --tail
heroku apps:info --app orto-pdf-processor