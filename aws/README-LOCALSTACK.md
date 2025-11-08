# LocalStack Setup for Sabuho

This guide explains how to run the AWS backend services locally using LocalStack for easier testing and development.

## Overview

The setup includes three services running in Docker:

1. **LocalStack** - Simulates AWS services (S3, SQS, Lambda)
2. **Presign URL Service** - Generates presigned URLs for S3 uploads (runs on port 3002)
3. **Document Processor** - Handles OCR and AI processing

## Architecture

```
┌─────────────────┐
│   Frontend      │
│  (Vite/React)   │
└────────┬────────┘
         │
         │ Upload File
         ▼
┌─────────────────┐      ┌──────────────────┐
│ Presign Service │◄────►│   LocalStack     │
│   (Port 3002)   │      │   (Port 4566)    │
└─────────────────┘      │                  │
                         │  - S3 Buckets    │
                         │  - SQS Queues    │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │    Processor    │
                         │  (OCR + AI)     │
                         └─────────────────┘
```

## Prerequisites

- Docker and Docker Compose installed
- AWS CLI installed (optional, for manual testing)
- OpenAI API key (for AI processing)

## Setup Instructions

### 1. Configure Environment Variables

Create a `.env` file in the `aws/` directory:

```bash
cd aws
cp .env.example .env
```

Edit `.env` and set your OpenAI API key:

```bash
OPENAI_API_KEY=your-openai-api-key-here
```

All other values are pre-configured for LocalStack.

### 2. Start the Services

From the `aws/` directory:

```bash
docker-compose up -d
```

This will start:
- LocalStack on port 4566
- Presign URL service on port 3002
- Document processor service

### 3. Verify Services are Running

Check service health:

```bash
# Check LocalStack
curl http://localhost:5566/_localstack/health

# Check Presign service
curl http://localhost:4002/health

# Check Docker containers
docker-compose ps
```

You should see all three services running.

### 4. View Logs

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f localstack
docker-compose logs -f presign-url
docker-compose logs -f processor
```

### 5. Configure Frontend

The frontend is already configured to use the mock-server by default. To switch to LocalStack:

Edit `.env.local` in the project root:

```bash
# Comment out mock-server config
# VITE_PRESIGN_URL_API=http://localhost:4001/presign

# Uncomment LocalStack config
VITE_PRESIGN_URL_API=http://localhost:4002/presign
```

Keep the Supabase URL pointing to mock-server:
```bash
VITE_SUPABASE_URL=http://localhost:4001
```

## LocalStack Resources

The initialization script creates the following resources:

### S3 Buckets
- `sabuho-files` - Source bucket for uploaded PDFs
- `sabuho-files-ocr` - OCR output bucket for text files

### SQS Queues
- `sabuho-s3-events` - Receives S3 upload events
- `sabuho-processing` - Main processing queue
- `sabuho-processing-dlq` - Dead letter queue for failed messages

## Testing the Full Flow

### 1. Start all services

```bash
# Terminal 1: Start mock-server (Supabase mock)
yarn mock-server

# Terminal 2: Start LocalStack and AWS services
cd aws
docker-compose up

# Terminal 3: Start frontend
yarn dev
```

When services start, you'll see helpful banners with instructions:

```
🚀 Presign URL Service Started
Mode: 🔧 Development (LocalStack)
📝 DEV MODE - LocalStack Integration
ℹ️  LocalStack free tier doesn't support S3 event notifications.
   After uploading a file, you need to manually trigger processing.
```

### 2. Upload a document

1. Open http://localhost:5173
2. Click "Add Document"
3. Upload a PDF file
4. Click "Start Processing"
5. **Copy the S3 key** from the browser's DevTools Network tab (presign response)

### 3. Trigger Processing (Required for LocalStack)

⚠️ **Important**: LocalStack free tier doesn't automatically send S3 events to SQS. You must manually trigger processing after uploading.

After uploading a file, the browser console will display an AWS CLI command. Simply copy and run it in your terminal.

#### Example:

```bash
aws --endpoint-url=http://localhost:5566 sqs send-message \
  --queue-url http://localhost:5566/000000000000/sabuho-s3-events \
  --region us-east-1 \
  --message-body '{"Records":[{"s3":{"bucket":{"name":"sabuho-files"},"object":{"key":"uploads/2025-11-07/abc-123/document.pdf"}}}]}'
```

The frontend will automatically generate this command with the correct S3 key after each upload. Just copy-paste from the browser console!

### 4. Monitor the process

Watch the logs to see the flow:

```bash
# All logs
docker-compose logs -f

# Specific services
docker-compose logs -f localstack    # S3 uploads
docker-compose logs -f presign-url   # Presign and trigger
docker-compose logs -f processor     # OCR + AI processing
```

You'll see processing progress through these stages:
1. `processing` - Initial state
2. `ocr_page_1_of_10` ... `ocr_page_10_of_10` - OCR progress
3. `ocr_completed` - OCR finished
4. `ai_processing` - AI analysis starting
5. `ai_topics_identified` - Topics extracted
6. `ai_batch_1_of_5` ... `ai_batch_5_of_5` - Question generation
7. `completed` - All done!

## Manual Testing with AWS CLI

You can manually interact with LocalStack using the AWS CLI:

```bash
# Set endpoint
export AWS_ENDPOINT_URL=http://localhost:5566
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1

# List S3 buckets
aws s3 ls --endpoint-url=$AWS_ENDPOINT_URL

# Upload a file to S3
aws s3 cp test.pdf s3://sabuho-files/uploads/test.pdf --endpoint-url=$AWS_ENDPOINT_URL

# List files in bucket
aws s3 ls s3://sabuho-files/uploads/ --endpoint-url=$AWS_ENDPOINT_URL

# List SQS queues
aws sqs list-queues --endpoint-url=$AWS_ENDPOINT_URL

# Send a message to queue (simulates S3 event)
aws sqs send-message \
  --queue-url http://localhost:5566/000000000000/sabuho-s3-events \
  --message-body '{"Records":[{"s3":{"bucket":{"name":"sabuho-files"},"object":{"key":"uploads/test.pdf"}}}]}' \
  --endpoint-url=$AWS_ENDPOINT_URL
```

## Using awslocal (Optional)

For easier LocalStack interaction, install `awslocal`:

```bash
pip install awscli-local
```

Then use `awslocal` instead of `aws` (endpoint is pre-configured):

```bash
awslocal s3 ls
awslocal sqs list-queues
```

## Development Tools

This setup includes helpful tools for testing in LocalStack:

### 1. Browser Console Helper

After uploading a file in dev mode, the frontend automatically prints an AWS CLI command to your browser console. The command is customized with:
- The exact S3 key of your uploaded file
- Correct queue URL
- Proper message format

Just copy-paste the command into your terminal to trigger processing!

### 2. Startup Banners

Both services print helpful information when starting:

**Presign Service** shows:
- Dev mode status
- LocalStack endpoint configuration

**Processor Service** shows:
- Execution mode
- Queue URLs being polled
- AWS endpoint configuration

## Troubleshooting

### Services won't start

```bash
# Check if ports are already in use
lsof -i :4566  # LocalStack
lsof -i :3002  # Presign service

# Stop and remove all containers
docker-compose down -v

# Rebuild and start
docker-compose up --build
```

### Can't connect to LocalStack from containers

Make sure services use `http://localstack:4566` (not `localhost`) in docker-compose.yml.

### S3 upload fails

Check presign service logs:
```bash
docker-compose logs presign-url
```

Verify LocalStack S3 is working:
```bash
curl http://localhost:5566/_localstack/health | jq .services.s3
```

### Processing doesn't start

LocalStack free tier doesn't automatically send S3 events to SQS. After uploading a file:

1. File gets uploaded to LocalStack S3 ✅
2. Browser console shows AWS CLI command
3. Copy and run the command in your terminal to send the SQS message
4. Processor picks up the message and starts processing

Check the logs to verify:
```bash
docker-compose logs -f processor
```

You should see messages like:
- "Processing S3 event"
- "Starting OCR processing"

### Clean slate

To completely reset:

```bash
# Stop all services
docker-compose down -v

# Remove LocalStack data
rm -rf localstack-data

# Restart
docker-compose up
```

## Production vs Local Development

| Feature | Mock Server | LocalStack | Production AWS |
|---------|-------------|------------|----------------|
| Speed | ⚡ Fastest | 🚀 Fast | 🐌 Slower (network) |
| S3 Storage | ❌ No | ✅ Yes | ✅ Yes |
| SQS Queues | ❌ No | ✅ Yes | ✅ Yes |
| Real OCR | ❌ No | ✅ Yes | ✅ Yes |
| Real AI | ❌ No | ✅ Yes | ✅ Yes |
| Cost | Free | Free | $$ Paid |
| Setup | Simple | Medium | Complex |

## When to Use What?

- **Mock Server**: Quick frontend testing, UI development, no need for real processing
- **LocalStack**: Full integration testing, backend development, testing AWS interactions
- **Production AWS**: Real deployment, staging environment

## Stopping Services

```bash
# Stop all services
cd aws
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Next Steps

1. ✅ Set up LocalStack (you are here)
2. Test document upload flow
3. Monitor processing pipeline
4. Debug and iterate
5. Deploy to production AWS

## Additional Resources

- [LocalStack Documentation](https://docs.localstack.cloud/)
- [AWS CLI Reference](https://docs.aws.amazon.com/cli/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
