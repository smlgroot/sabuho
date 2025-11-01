git config user.name "Sergio Lopez"
git config user.email "smlgroot@gmail.com"
git commit --amend --reset-author


---------------------------------------------------------------------
# Supabase
-- Execute from root directory
supabase link

# backup schema
supabase db dump --db-url "postgresql://postgres:postgres@127.0.0.1:54322/postgres" > local_schema_20251101.sql

# diff local with remote, move file to supabase/migrations when sql file looks right
supabase db diff --local > 20250906191829_mig_20250926.sql

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

---------------------------------------------------------------------
# Display dexie tables

db.tables.map(table => table.name)
db.codes.toArray().then(console.table);


