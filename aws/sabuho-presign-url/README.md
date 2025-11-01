# Sabuho Presign URL Lambda

AWS Lambda function to generate presigned URLs for S3 file uploads with unique keys.

## Features

- ✅ Generates unique S3 keys for each upload (prevents collisions)
- ✅ Returns job ID for tracking processing status
- ✅ CORS enabled for frontend access
- ✅ Date-based folder structure for organization
- ✅ 15-minute expiration on presigned URLs

## S3 Key Format

```
uploads/{date}/{job-id}/{filename}
```

Example: `uploads/2024-01-15/a1b2c3d4-e5f6-7890-abcd-ef1234567890/document.pdf`

## API

### POST /presign-url

Generate a presigned URL for uploading a file to S3.

**Request Body** (optional):
```json
{
  "filename": "document.pdf",
  "contentType": "application/pdf"
}
```

**Response**:
```json
{
  "uploadUrl": "https://s3.amazonaws.com/bucket/uploads/...",
  "key": "uploads/2024-01-15/uuid/document.pdf",
  "jobId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `S3_BUCKET_NAME` | Yes | Target S3 bucket for uploads (e.g., `sabuho-files`) |

## Local Development

### Test Locally with Docker

```bash
# Build the image
docker build -t sabuho-presign-url .

# Run locally
docker run -p 9000:8080 \
  -e S3_BUCKET_NAME=sabuho-files \
  -e AWS_ACCESS_KEY_ID=your_key \
  -e AWS_SECRET_ACCESS_KEY=your_secret \
  -e AWS_REGION=us-east-1 \
  sabuho-presign-url

# Test the function
curl -X POST "http://localhost:9000/2015-03-31/functions/function/invocations" \
  -H "Content-Type: application/json" \
  -d '{"body": "{\"filename\": \"test.pdf\", \"contentType\": \"application/pdf\"}"}'
```

### Test with Python

```bash
cd src
python3 << EOF
from lambda_function import lambda_handler
import json

event = {
    "body": json.dumps({
        "filename": "test-document.pdf",
        "contentType": "application/pdf"
    })
}

result = lambda_handler(event, None)
print(json.dumps(json.loads(result['body']), indent=2))
EOF
```

## AWS Deployment

### Deploy to AWS Lambda

#### Option 1: Deploy using AWS CLI (Recommended)

```bash
# Set your AWS account details
AWS_ACCOUNT_ID="801935245468"
AWS_REGION="us-east-1"
FUNCTION_NAME="sabuho-presign-url"
S3_BUCKET="sabuho-files"

# Create Lambda function (first time only)
aws lambda create-function \
  --function-name ${FUNCTION_NAME} \
  --package-type Image \
  --code ImageUri=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/sabuho-presign-url:latest \
  --role arn:aws:iam::${AWS_ACCOUNT_ID}:role/lambda-s3-presign-role \
  --environment Variables="{S3_BUCKET_NAME=${S3_BUCKET}}" \
  --timeout 10 \
  --memory-size 256

# Or update existing function
aws lambda update-function-code \
  --function-name ${FUNCTION_NAME} \
  --image-uri ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/sabuho-presign-url:latest
```

#### Option 2: Deploy to ECR and Lambda

```bash
# Set your AWS account details
AWS_ACCOUNT_ID="801935245468"
AWS_REGION="us-east-1"
ECR_REPO="sabuho-presign-url"

# Create ECR repository (first time only)
aws ecr create-repository --repository-name ${ECR_REPO} --region ${AWS_REGION}

# Build for AWS Lambda (linux/amd64)
docker buildx build --platform linux/amd64 -t ${ECR_REPO}:latest .

# Authenticate to ECR
aws ecr get-login-password --region ${AWS_REGION} | \
  docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Tag and push
docker tag ${ECR_REPO}:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:latest
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:latest
```

### Create API Gateway

1. Go to API Gateway console
2. Create new HTTP API
3. Add integration with Lambda function
4. Configure CORS settings
5. Deploy API
6. Note the API endpoint URL (e.g., `https://xxx.execute-api.us-east-1.amazonaws.com/dev/presign-url`)

### IAM Role Requirements

The Lambda execution role needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::sabuho-files/uploads/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

## S3 Bucket Configuration

Ensure your S3 bucket has:

1. **CORS Configuration**:
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

2. **Event Notifications** to trigger document processing:
   - Event type: `s3:ObjectCreated:*`
   - Prefix: `uploads/`
   - Destination: SQS Queue (S3 Events Queue)

## Frontend Configuration

Update your `.env.local`:

```bash
VITE_PRESIGN_URL_API=https://xxx.execute-api.us-east-1.amazonaws.com/dev/presign-url
```

## Architecture Flow

1. **Frontend** → POST to Lambda → Get presigned URL + unique key
2. **Frontend** → PUT file to S3 using presigned URL
3. **S3** → Event notification → SQS S3 Events Queue
4. **ECS (Document Hub)** → Poll SQS → Process document → Update resource_sessions
5. **Frontend** → Poll resource_sessions by unique key → Get results

## License

Proprietary - Sabuho Project
