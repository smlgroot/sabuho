# Sabuho Document Processing Hub

Simple Docker-based document processing service for OCR and AI analysis.

## Quick Start

### 1. Set Environment Variables

Create a `.env` file:

```bash
# Required
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key

# AWS (if using S3)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=sabuho-files
```

### 2. Build and Run

For local development with SQS queue:

```bash
# Build the image
docker build -t sabuho-processor .

# Run with SQS queue (requires SQS_QUEUE_URL in .env)
docker-compose up

# Or run directly
docker run --env-file .env sabuho-processor
```

For unit tests:

```bash
docker build -t sabuho-processor .
docker run sabuho-processor pytest -v
```

## Project Structure

```
.
├── src/                  # Source code
│   ├── lambda_function.py
│   ├── main.py
│   ├── ocr/             # OCR processing
│   └── ai/              # AI processing
├── test/                # Unit tests
├── Dockerfile           # Simple single-stage build
├── docker-compose.yml   # Local development
└── requirements.txt     # Python dependencies
```

## Execution Modes

- **Lambda Mode**: Runs in AWS Lambda (triggered by Lambda runtime)
- **SQS Mode**: Long-running process that polls SQS queue (for ECS or local development with `SQS_QUEUE_URL` set)

## Development

The `src/` directory is mounted as a volume for hot-reloading during development.

For local SQS testing, you can use LocalStack or point to an actual AWS SQS queue.

## AWS Deployment

### Deploy to ECR

```bash
# Set your AWS account details
AWS_ACCOUNT_ID="801935245468"
AWS_REGION="us-east-1"
ECR_REPO="ortosaurio/sabuho"

# Build for AWS Lambda (linux/amd64)
docker buildx build --platform linux/amd64 -t ${ECR_REPO}:latest .

# Authenticate to ECR
aws ecr get-login-password --region ${AWS_REGION} | \
  docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Tag and push
docker tag ${ECR_REPO}:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:latest
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:latest
```

### Update Lambda Function

```bash
aws lambda update-function-code \
  --function-name sabuho-process-document-hub \
  --image-uri ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:latest
```

## License

Proprietary - Sabuho Project
