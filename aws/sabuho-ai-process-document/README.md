# Sabuho AI Processing Lambda

AWS Lambda function that processes documents with AI to identify topics and generate quiz questions.

## Overview

This Lambda function:
1. Receives SQS messages from the OCR processing Lambda
2. Downloads OCR-extracted text from S3
3. Uses OpenAI to identify document topics and page ranges
4. Creates `resource_session_domains` for each topic
5. Generates quiz questions for each topic using OpenAI
6. Saves questions to `resource_session_questions` table with domain linkage

## Architecture

```
SQS (from OCR Lambda) → AI Processing Lambda → Supabase
                                ↓
                          S3 (OCR text)
                                ↓
                          OpenAI API
```

## Directory Structure

```
.
├── Dockerfile                         # Container definition
├── README.md                          # This file
├── event.json                         # Sample SQS event for testing
├── src/
│   ├── lambda_function.py            # Main Lambda handler
│   ├── topic_identifier.py           # Topic identification module
│   ├── question_generator.py         # Question generation module
│   ├── text_processor.py             # Text parsing and batching
│   ├── openai_client.py              # OpenAI API wrapper
│   ├── supabase_client.py            # Database operations
│   └── requirements.txt              # Python dependencies
└── test/
    ├── test_topic_identification.py  # Test topics only
    └── test_question_generation.py   # Test questions only
```

## Prerequisites

- AWS Account with ECR and Lambda access
- OpenAI API key
- Supabase project with service role key
- S3 bucket with OCR text files
- SQS queue receiving messages from OCR Lambda

## Environment Variables

The Lambda function requires these environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for full DB access) | Yes |
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `AWS_S3_BUCKET` | S3 bucket name (default: `sabuho-files`) | No |
| `AWS_SAM_LOCAL` | Set to `true` for local testing | No |
| `LOCAL_TEST_FILE` | Path to local OCR text file for testing | No |

## Deployment

### 1. Build Docker Image

```bash
# Navigate to this directory
cd aws/sabuho-ai-process-document

# Build the Docker image
docker build -t sabuho-ai-process-document .
```

### 2. Push to AWS ECR

```bash
# Authenticate Docker to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Create ECR repository (if not exists)
aws ecr create-repository --repository-name sabuho-ai-process-document --region us-east-1

# Tag the image
docker tag sabuho-ai-process-document:latest <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/sabuho-ai-process-document:latest

# Push to ECR
docker push <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/sabuho-ai-process-document:latest
```

### 3. Create Lambda Function

```bash
# Create Lambda function with container image
aws lambda create-function \
  --function-name sabuho-ai-process-document \
  --package-type Image \
  --code ImageUri=<AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/sabuho-ai-process-document:latest \
  --role arn:aws:iam::<AWS_ACCOUNT_ID>:role/lambda-execution-role \
  --timeout 900 \
  --memory-size 2048 \
  --environment Variables="{SUPABASE_URL=<YOUR_URL>,SUPABASE_SERVICE_ROLE_KEY=<YOUR_KEY>,OPENAI_API_KEY=<YOUR_KEY>,AWS_S3_BUCKET=sabuho-files}"
```

### 4. Configure SQS Trigger

```bash
# Add SQS trigger to Lambda
aws lambda create-event-source-mapping \
  --function-name sabuho-ai-process-document \
  --event-source-arn arn:aws:sqs:us-east-1:<AWS_ACCOUNT_ID>:sabuho-ocr-completed-queue \
  --batch-size 1
```

## Testing

### Local Testing with Test Scripts

The project includes two independent test scripts:

#### 1. Test Topic Identification Only

```bash
cd test

# Set environment variables
export OPENAI_API_KEY="sk-..."
export SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."
export TEST_RESOURCE_SESSION_ID="550e8400-e29b-41d4-a716-446655440000"
export AWS_SAM_LOCAL="true"
export LOCAL_TEST_FILE="/path/to/test.ocr.txt"

# Run test
python test_topic_identification.py
```

This will:
- Download OCR text
- Identify topics with OpenAI
- Save topics to `resource_sessions.topic_page_range`
- Create `resource_session_domains` records

#### 2. Test Question Generation Only

```bash
cd test

# Set same environment variables as above
# (Assumes topics/domains already created by previous test)

# Run test
python test_question_generation.py
```

This will:
- Fetch existing topics/domains
- Extract text for each topic
- Generate questions with OpenAI
- Save questions to `resource_session_questions`

### Test with Sample Event

```bash
# Test Lambda locally with Docker
docker run -p 9000:8080 \
  -e SUPABASE_URL="<YOUR_URL>" \
  -e SUPABASE_SERVICE_ROLE_KEY="<YOUR_KEY>" \
  -e OPENAI_API_KEY="<YOUR_KEY>" \
  -e AWS_S3_BUCKET="sabuho-files" \
  sabuho-ai-process-document:latest

# In another terminal, invoke the function
curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d @event.json
```

### Test in AWS

```bash
# Invoke Lambda with test event
aws lambda invoke \
  --function-name sabuho-ai-process-document \
  --payload file://event.json \
  response.json

# View response
cat response.json
```

## Monitoring

### CloudWatch Logs

```bash
# View recent logs
aws logs tail /aws/lambda/sabuho-ai-process-document --follow
```

### Check Lambda Metrics

```bash
# Get Lambda metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=sabuho-ai-process-document \
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
- status: TEXT (ai_processing, completed, failed)
- topic_page_range: JSONB (topics map)
- unparsable: TEXT (errors)
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
- options: JSONB (array with is_correct flags)
- explanation: TEXT (source text)
```

## Status Flow

```
ocr_completed → ai_processing → completed
                     ↓
                  failed
```

## OpenAI Usage

The function makes 2 OpenAI API calls per document:

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
- Individual batch failures don't stop the entire process

## Cost Optimization

- Uses `gpt-4o-mini` for cost-effective processing
- Batches topics to minimize API calls
- Lambda timeout: 15 minutes (900s)
- Memory: 2048 MB (adjust based on document size)

## Troubleshooting

### Lambda Timeout

Increase timeout:
```bash
aws lambda update-function-configuration \
  --function-name sabuho-ai-process-document \
  --timeout 900
```

### Out of Memory

Increase memory:
```bash
aws lambda update-function-configuration \
  --function-name sabuho-ai-process-document \
  --memory-size 3008
```

### OpenAI Rate Limits

Adjust `DELAY_BETWEEN_BATCHES_SECONDS` in `question_generator.py`

### Database Connection Issues

Verify `SUPABASE_SERVICE_ROLE_KEY` has full access permissions

## Development

### Adding New Features

1. Update relevant module in `src/`
2. Test with test scripts
3. Rebuild Docker image
4. Push to ECR
5. Update Lambda function

### Code Structure

- **Modular design**: Each AI operation is in a separate module
- **Testable**: Independent test scripts for each phase
- **Separation of concerns**: Clear boundaries between OpenAI, Supabase, and text processing

## License

Proprietary - Sabuho Project
