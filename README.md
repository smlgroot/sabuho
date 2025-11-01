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
# AWS ECS Document Processing

# Check ECS service status
aws ecs describe-services --cluster sabuho-cluster --services sabuho-processor --region us-east-1

# View ECS task logs (CloudWatch)
aws logs tail /ecs/sabuho-processor --follow --region us-east-1

# Check SQS queue status
aws sqs get-queue-attributes --queue-url <S3_EVENTS_QUEUE_URL> --attribute-names All --region us-east-1
aws sqs get-queue-attributes --queue-url <PROCESSING_QUEUE_URL> --attribute-names All --region us-east-1

# Deploy updated Lambda (presign-url)
# See aws/sabuho-presign-url/README.md for deployment instructions

---------------------------------------------------------------------
# Display dexie tables

db.tables.map(table => table.name)
db.codes.toArray().then(console.table);


