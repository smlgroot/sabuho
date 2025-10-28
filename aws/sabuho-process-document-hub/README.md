# Sabuho Document Processing Hub

Unified AWS Lambda function that handles both OCR text extraction and AI-powered topic identification and quiz generation.

## Overview

This Lambda function processes documents through two stages:

### Stage 1: OCR Processing (`message_type: 'ocr_process'`)
1. Receives S3 upload events via SQS
2. Downloads PDF from S3
3. Extracts text using PyMuPDF and Tesseract OCR
4. Saves extracted text to S3 with `.ocr.txt` extension
5. Updates status to `'ocr_completed'`
6. Sends message to trigger AI processing

### Stage 2: AI Processing (`message_type: 'ai_process'`)
1. Receives completion message from OCR stage
2. Downloads OCR-extracted text from S3
3. Uses OpenAI to identify document topics and page ranges
4. Creates `resource_session_domains` for each topic
5. Generates quiz questions for each topic using OpenAI
6. Saves questions to `resource_session_questions` table with domain linkage
7. Updates status to `'completed'`

## Architecture

```
S3 Upload → SQS (ocr_process) → Lambda → S3 (.ocr.txt)
                                   ↓
                          SQS (ai_process) → Lambda → OpenAI → Supabase
                                               ↓
                                          S3 (OCR text)
```

## Directory Structure

```
.
├── Dockerfile                         # Ubuntu 22.04 with Tesseract OCR
├── README.md                          # This file
├── event_ocr.json                     # Sample OCR event for testing
├── event_ai.json                      # Sample AI event for testing
├── src/
│   ├── lambda_function.py            # Unified handler with message routing
│   ├── supabase_client.py            # Database operations (merged)
│   ├── requirements.txt              # Python dependencies
│   │
│   ├── ocr/                          # OCR Processing modules
│   │   ├── __init__.py
│   │   ├── pdf_text_extraction.py   # PDF text extraction
│   │   └── ocr_processing.py         # Tesseract OCR
│   │
│   └── ai/                           # AI Processing modules
│       ├── __init__.py
│       ├── topic_identifier.py       # Topic identification
│       ├── question_generator.py     # Question generation
│       ├── text_processor.py         # Text parsing and batching
│       └── openai_client.py          # OpenAI API wrapper
│
└── test/
    ├── ocr/                          # OCR tests
    │   ├── __init__.py
    │   └── test_text_extraction.py
    │
    └── ai/                           # AI tests
        ├── __init__.py
        ├── test_topic_identification.py
        └── test_question_generation.py
```

## Prerequisites

- AWS Account with ECR, Lambda, S3, and SQS access
- OpenAI API key
- Supabase project with service role key
- S3 bucket for file storage
- SQS queues for message routing

## Environment Variables

| Variable | Description | Required | Used By |
|----------|-------------|----------|---------|
| `SUPABASE_URL` | Supabase project URL | Yes | Both |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes | Both |
| `OPENAI_API_KEY` | OpenAI API key | Yes | AI only |
| `AWS_S3_BUCKET` | S3 bucket name (default: `sabuho-files`) | No | Both |
| `OUTPUT_QUEUE_URL` | SQS queue URL for AI processing messages | Yes | OCR only |
| `AWS_SAM_LOCAL` | Set to `true` for local testing | No | Both |
| `LOCAL_TEST_FILE` | Path to local test file | No | Both |

## SQS Message Format

### OCR Processing Message

```json
{
  "message_type": "ocr_process",
  "Records": [
    {
      "s3": {
        "bucket": {
          "name": "sabuho-files"
        },
        "object": {
          "key": "uploads/document.pdf"
        }
      }
    }
  ]
}
```

### AI Processing Message

```json
{
  "message_type": "ai_process",
  "resource_session_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Deployment

### 1. Build Docker Image

```bash
# Navigate to this directory
cd aws/sabuho-process-document-hub

# Build the Docker image for linux/amd64
docker buildx build --platform linux/amd64 -t sabuho-process-document-hub .
```

### 2. Push to AWS ECR

```bash
# Set your AWS account ID and region
AWS_ACCOUNT_ID="801935245468"
AWS_REGION="us-east-1"
ECR_REPO="sabuho-process-document-hub"

# Authenticate Docker to ECR
aws ecr get-login-password --region ${AWS_REGION} | \
  docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Create ECR repository (if not exists)
aws ecr create-repository --repository-name ${ECR_REPO} --region ${AWS_REGION}

# Tag the image
docker tag sabuho-process-document-hub:latest \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:latest

# Push to ECR
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:latest
```

### 3. Create Lambda Function

```bash
aws lambda create-function \
  --function-name sabuho-process-document-hub \
  --package-type Image \
  --code ImageUri=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:latest \
  --role arn:aws:iam::${AWS_ACCOUNT_ID}:role/lambda-execution-role \
  --timeout 900 \
  --memory-size 2048 \
  --environment Variables="{SUPABASE_URL=<YOUR_URL>,SUPABASE_SERVICE_ROLE_KEY=<YOUR_KEY>,OPENAI_API_KEY=<YOUR_KEY>,AWS_S3_BUCKET=sabuho-files,OUTPUT_QUEUE_URL=<SQS_QUEUE_URL>}"
```

### 4. Configure SQS Triggers

```bash
# Add SQS trigger for OCR processing (S3 upload events)
aws lambda create-event-source-mapping \
  --function-name sabuho-process-document-hub \
  --event-source-arn arn:aws:sqs:${AWS_REGION}:${AWS_ACCOUNT_ID}:sabuho-s3-upload-queue \
  --batch-size 1

# Add SQS trigger for AI processing (OCR completed events)
aws lambda create-event-source-mapping \
  --function-name sabuho-process-document-hub \
  --event-source-arn arn:aws:sqs:${AWS_REGION}:${AWS_ACCOUNT_ID}:sabuho-ai-processing-queue \
  --batch-size 1
```

### 5. Update Existing Lambda

```bash
# Update Lambda function code with new image
aws lambda update-function-code \
  --function-name sabuho-process-document-hub \
  --image-uri ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:latest
```

## Testing

### Local Testing - OCR Processing

```bash
cd test/ocr

# Set environment variables
export SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."
export AWS_SAM_LOCAL="true"
export LOCAL_TEST_FILE="/path/to/test.pdf"

# Run OCR test
python test_text_extraction.py
```

### Local Testing - AI Topic Identification

```bash
cd test/ai

# Set environment variables
export OPENAI_API_KEY="sk-..."
export SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."
export TEST_RESOURCE_SESSION_ID="550e8400-e29b-41d4-a716-446655440000"
export AWS_SAM_LOCAL="true"
export LOCAL_TEST_FILE="/path/to/test.ocr.txt"

# Run topic identification test
python test_topic_identification.py
```

### Local Testing - AI Question Generation

```bash
cd test/ai

# Set same environment variables as above
# (Assumes topics/domains already created)

# Run question generation test
python test_question_generation.py
```

### Test with Docker

```bash
# Test Lambda locally with Docker
docker run -p 9000:8080 \
  -e SUPABASE_URL="<YOUR_URL>" \
  -e SUPABASE_SERVICE_ROLE_KEY="<YOUR_KEY>" \
  -e OPENAI_API_KEY="<YOUR_KEY>" \
  -e AWS_S3_BUCKET="sabuho-files" \
  -e OUTPUT_QUEUE_URL="<QUEUE_URL>" \
  sabuho-process-document-hub:latest

# In another terminal, invoke with OCR event
curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d @event_ocr.json

# Or invoke with AI event
curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d @event_ai.json
```

### Test in AWS

```bash
# Invoke Lambda with OCR test event
aws lambda invoke \
  --function-name sabuho-process-document-hub \
  --payload file://event_ocr.json \
  response.json

# View response
cat response.json
```

## Monitoring

### CloudWatch Logs

```bash
# View recent logs
aws logs tail /aws/lambda/sabuho-process-document-hub --follow
```

### Check Lambda Metrics

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=sabuho-process-document-hub \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Average
```

## Database Schema

### resource_sessions

```sql
- id: UUID
- name: TEXT
- file_path: TEXT (S3 key)
- status: TEXT (processing, ocr_completed, ai_processing, completed, failed)
- topic_page_range: JSONB (topics map)
- unparsable: TEXT (errors)
- updated_at: TIMESTAMP
```

### resource_session_domains

```sql
- id: UUID
- resource_session_id: UUID (FK)
- name: TEXT (topic name)
- page_range_start: SMALLINT
- page_range_end: SMALLINT
```

### resource_session_questions

```sql
- id: UUID
- resource_session_id: UUID (FK)
- resource_session_domain_id: UUID (FK)
- type: TEXT (default: 'multiple_options')
- body: TEXT (question text)
- options: JSONB (array with [correct] suffix marking)
- explanation: TEXT (source text)
```

## Status Flow

```
S3 Upload
   ↓
processing (OCR stage)
   ↓
ocr_completed
   ↓
ai_processing (AI stage)
   ↓
completed
   ↓
(or failed at any stage)
```

## OpenAI Usage

The AI processing stage makes 2 types of OpenAI API calls per document:

1. **Topic Identification** (`gpt-4o-mini`)
   - Max tokens: 4000
   - Temperature: 0.1
   - Returns: Topics with page ranges

2. **Question Generation** (`gpt-4o-mini`)
   - Max tokens: 12000
   - Temperature: 0.1
   - Batched by token limit (16,385 tokens)
   - Rate limited: 2s delay between batches
   - Returns: Quiz questions with options

## Error Handling

- All errors are logged to CloudWatch
- Failed sessions update `resource_sessions.status` to `'failed'`
- Error details saved to `resource_sessions.unparsable` field
- Individual batch failures don't stop the entire AI process
- OCR failures prevent AI processing from starting

## Performance

### OCR Stage
- Average duration: 10-30 seconds per document
- Parallel page processing (4 workers)
- Memory usage: 512-1024 MB

### AI Stage
- Average duration: 30-120 seconds per document
- Token-aware batching for large documents
- Memory usage: 1024-2048 MB

## Cost Optimization

- Single Docker image reduces storage costs
- Uses `gpt-4o-mini` for cost-effective AI processing
- Batches topics to minimize OpenAI API calls
- Lambda timeout: 15 minutes (900s)
- Recommended memory: 2048 MB

## Troubleshooting

### Lambda Timeout

Increase timeout:
```bash
aws lambda update-function-configuration \
  --function-name sabuho-process-document-hub \
  --timeout 900
```

### Out of Memory

Increase memory:
```bash
aws lambda update-function-configuration \
  --function-name sabuho-process-document-hub \
  --memory-size 3008
```

### Tesseract OCR Not Working

Verify Tesseract is installed in the Docker image:
```bash
docker run sabuho-process-document-hub:latest tesseract --version
```

### OpenAI Rate Limits

Adjust `DELAY_BETWEEN_BATCHES_SECONDS` in `src/question_generator.py`

### Database Connection Issues

Verify `SUPABASE_SERVICE_ROLE_KEY` has full access permissions

### Wrong Message Type

Check SQS message includes `message_type` property with value `'ocr_process'` or `'ai_process'`

## Development

### Adding New Features

1. Update relevant module in `src/`
2. Test with test scripts
3. Rebuild Docker image
4. Push to ECR
5. Update Lambda function

### Code Structure

- **Unified handler**: Single entry point routes by message type
- **Modular design**: Each operation in a separate module
- **Testable**: Independent test scripts for each phase
- **Separation of concerns**: Clear boundaries between OCR, AI, and database operations

## Migration from Separate Lambdas

If you're migrating from separate `sabuho-s3-process-uploaded-file` and `sabuho-ai-process-document` Lambdas:

1. Update SQS message format to include `message_type` property
2. Change environment variable from `SUPABASE_KEY` to `SUPABASE_SERVICE_ROLE_KEY`
3. Update OCR completion message to send `resource_session_id` instead of `s3_key`
4. Deploy unified Lambda
5. Update SQS queue mappings
6. Remove old Lambda functions

## License

Proprietary - Sabuho Project
