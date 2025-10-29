## Deployment

### 1. Build Docker Image

AWS_ACCOUNT_ID="801935245468"
AWS_REGION="us-east-1"
ECR_REPO="sabuho-process-document-hub"

```bash
# Navigate to this directory
cd aws/sabuho-process-document-hub

# Build the Docker image for linux/amd64
docker buildx build --platform linux/amd64 -t  ortosaurio/sabuho .


# Authenticate Docker to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 801935245468.dkr.ecr.us-east-1.amazonaws.com

# Tag the image
docker tag ortosaurio/sabuho:latest 801935245468.dkr.ecr.us-east-1.amazonaws.com/ortosaurio/sabuho:latest

# Push to ECR
docker push 801935245468.dkr.ecr.us-east-1.amazonaws.com/ortosaurio/sabuho:latest
```

## Lambda Function
### 1. Update Existing Lambda image

```bash
# Update Lambda function code with new image
aws lambda update-function-code \
  --function-name sabuho-process-document-hub \
  --image-uri ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:latest
```

## Testing

### Local Testing

```bash
pytest -m ocr
pytest -m ai
pytest -m ai -k test_question_generation
```

## License

Proprietary - Sabuho Project
