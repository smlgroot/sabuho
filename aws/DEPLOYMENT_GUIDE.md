# AWS Deployment Guide for Sabuho

This guide covers the deployment of the complete AWS-based document processing system.

## Architecture Overview

```
Frontend → Lambda (presign-url) → S3 Upload
                                    ↓
                              S3 Event Notification
                                    ↓
                            SQS (S3 Events Queue)
                                    ↓
                            ECS (Document Hub)
                                    ↓
                         SQS (Processing Queue FIFO)
                                    ↓
                    OCR Processing → AI Processing
                                    ↓
                        Supabase (resource_sessions)
                                    ↓
                            Frontend (polling)
```

## Components

### 1. Presign URL Lambda (`sabuho-presign-url`)
**Purpose**: Generate presigned URLs with unique S3 keys for file uploads

**Location**: `aws/sabuho-presign-url/`

**Deployment**: See `aws/sabuho-presign-url/README.md`

### 2. Document Processing Hub (`sabuho-process-document-hub`)
**Purpose**: Long-running ECS service that processes OCR and AI tasks

**Location**: `aws/sabuho-process-document-hub/`

**Deployment**: See `aws/sabuho-process-document-hub/README.md`

### 3. Frontend Application
**Changes Made**:
- Removed Heroku service dependencies
- Updated to use new presign-url Lambda
- Polls resource_sessions by unique S3 key
- Backend creates resource_session records automatically

## Deployment Steps

### Step 1: Deploy Presign URL Lambda

```bash
cd aws/sabuho-presign-url

# Build and deploy to ECR
export AWS_ACCOUNT_ID="801935245468"
export AWS_REGION="us-east-1"
export AWS_ECR_REPO_PRESIGN_URL="sabuho-presign-url"

# Create ECR repository (first time only)
aws ecr create-repository --repository-name ${AWS_ECR_REPO_PRESIGN_URL} --region ${AWS_REGION}

# Build for AWS Lambda
docker buildx build --platform linux/amd64 -t ${AWS_ECR_REPO_PRESIGN_URL}:latest .

# Push to ECR
aws ecr get-login-password --region ${AWS_REGION} | \
  docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

docker tag ${AWS_ECR_REPO_PRESIGN_URL}:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${AWS_ECR_REPO_PRESIGN_URL}:latest
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${AWS_ECR_REPO_PRESIGN_URL}:latest

# Create/Update Lambda function
aws lambda create-function \
  --function-name sabuho-presign-url \
  --package-type Image \
  --code ImageUri=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${AWS_ECR_REPO_PRESIGN_URL}:latest \
  --role arn:aws:iam::${AWS_ACCOUNT_ID}:role/service-role/sabuho-s3-presign-url-role-r59iryu7 \
  --environment Variables="{S3_BUCKET_NAME=sabuho-files}" \
  --timeout 10 \
  --memory-size 256

# Create API Gateway HTTP API and note the endpoint URL
```

### Step 2: Configure S3 Bucket

1. **Enable Event Notifications**:
   - Go to S3 Console → `sabuho-files` bucket
   - Properties → Event notifications → Create
   - Event type: `s3:ObjectCreated:*`
   - Prefix: `uploads/`
   - Destination: SQS Queue (S3 Events Queue URL)

2. **Update CORS Configuration**:
```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["PUT", "POST", "GET"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

### Step 3: Ensure SQS Queues Exist

Required queues:
- **S3 Events Queue** (Standard): Receives S3 event notifications
- **Processing Queue** (FIFO): Handles OCR and AI processing messages
- **Processing DLQ** (FIFO): Dead letter queue for failed messages

### Step 4: Deploy/Update Document Processing Hub

```bash
cd aws/sabuho-process-document-hub

# Build and push to ECR (if not already deployed)
# See aws/sabuho-process-document-hub/README.md

# The ECS service should already be running
# If you need to update the code, push new image and update ECS task
```

### Step 5: Update Frontend Environment Variables

Update `.env.local`:

```bash
# Replace with your Lambda API Gateway endpoint
VITE_PRESIGN_URL_API=https://xxx.execute-api.us-east-1.amazonaws.com/dev/presign-url

# Remove this (no longer needed)
# VITE_HEROKU_SERVICE_URL=...
```

### Step 6: Deploy Frontend

```bash
# Build and deploy frontend
yarn build

# Deploy to your hosting service (Vercel, Netlify, etc.)
```

## Verification

### 1. Test Presign URL Lambda

```bash
curl -X POST "https://xxx.execute-api.us-east-1.amazonaws.com/dev/presign-url" \
  -H "Content-Type: application/json" \
  -d '{"filename": "test.pdf", "contentType": "application/pdf"}'

# Should return:
# {
#   "uploadUrl": "https://s3.amazonaws.com/...",
#   "key": "uploads/2024-01-15/uuid/test.pdf",
#   "jobId": "uuid"
# }
```

### 2. Test Full Flow

1. Open frontend and upload a PDF
2. Check S3 bucket for uploaded file
3. Check S3 Events Queue for message
4. Check Processing Queue for transformed messages
5. Check ECS logs for processing activity
6. Check `resource_sessions` table for record creation and status updates
7. Verify frontend displays results

### 3. Monitor SQS Queues

```bash
# Check S3 Events Queue
aws sqs get-queue-attributes \
  --queue-url <S3_EVENTS_QUEUE_URL> \
  --attribute-names ApproximateNumberOfMessages,ApproximateNumberOfMessagesNotVisible \
  --region us-east-1

# Check Processing Queue
aws sqs get-queue-attributes \
  --queue-url <PROCESSING_QUEUE_URL> \
  --attribute-names ApproximateNumberOfMessages,ApproximateNumberOfMessagesNotVisible \
  --region us-east-1

# Check DLQ for failures
aws sqs get-queue-attributes \
  --queue-url <PROCESSING_DLQ_URL> \
  --attribute-names ApproximateNumberOfMessages \
  --region us-east-1
```

### 4. Monitor ECS Service

```bash
# Check service status
aws ecs describe-services \
  --cluster sabuho-cluster \
  --services sabuho-processor \
  --region us-east-1

# View logs
aws logs tail /ecs/sabuho-processor --follow --region us-east-1
```

## Troubleshooting

### File uploads but no processing

1. Check S3 event notifications are configured correctly
2. Check S3 Events Queue has messages
3. Check ECS service is running and polling

### Processing stuck at "processing" status

1. Check ECS logs for errors
2. Check Processing Queue for messages
3. Check DLQ for failed messages

### Frontend can't poll resource_session

1. Check S3 key format is correct (includes UUID)
2. Check backend created resource_session record
3. Check file_path in database matches S3 key exactly

## Changes Summary

### Removed
- ❌ Heroku service and all related code
- ❌ `VITE_HEROKU_SERVICE_URL` environment variable
- ❌ `startResourceSessionProcessing()` function
- ❌ Frontend creating `resource_session` records

### Added
- ✅ Presign URL Lambda with unique S3 key generation
- ✅ `fetchResourceSessionByFilePath()` function
- ✅ Updated polling to support polling by S3 key
- ✅ Backend automatically creates resource_session records

### Updated
- 🔄 HomePage: Polls by S3 key instead of session ID
- 🔄 AdminPage: Removed Heroku service call
- 🔄 S3 upload flow: Now event-driven via S3 notifications

## Architecture Benefits

1. **Event-Driven**: S3 automatically triggers processing
2. **Scalable**: SQS + ECS scales independently
3. **Reliable**: DLQ captures failures, no retries needed
4. **Cost-Effective**: Pay only for what you use
5. **Maintainable**: Clear separation of concerns
