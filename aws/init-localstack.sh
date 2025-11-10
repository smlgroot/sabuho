#!/bin/bash

# LocalStack initialization script
# This script runs when LocalStack is ready and sets up S3 buckets and SQS queues

set -e

echo "🚀 Initializing LocalStack resources..."

# Set dummy AWS credentials for LocalStack
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1

# AWS CLI endpoint configuration
ENDPOINT="http://localhost:4566"
REGION="us-east-1"

# Wait for LocalStack to be fully ready
echo "⏳ Waiting for LocalStack to be ready..."
sleep 5

# Create S3 buckets
echo "📦 Creating S3 buckets..."
aws --endpoint-url=$ENDPOINT s3 mb s3://sabuho-files --region $REGION || echo "Bucket sabuho-files already exists"
aws --endpoint-url=$ENDPOINT s3 mb s3://sabuho-files-ocr --region $REGION || echo "Bucket sabuho-files-ocr already exists"

# Enable bucket versioning (optional but good practice)
aws --endpoint-url=$ENDPOINT s3api put-bucket-versioning \
    --bucket sabuho-files \
    --versioning-configuration Status=Enabled || true

# Configure CORS for browser uploads
echo "🌐 Configuring S3 CORS..."
aws --endpoint-url=$ENDPOINT s3api put-bucket-cors \
    --bucket sabuho-files \
    --cors-configuration '{
        "CORSRules": [
            {
                "AllowedOrigins": ["http://localhost:5173"],
                "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
                "AllowedHeaders": ["*"],
                "ExposeHeaders": ["ETag"],
                "MaxAgeSeconds": 3000
            }
        ]
    }' || echo "CORS configuration failed"

# Create SQS queues
echo "📬 Creating SQS queues..."

# Create DLQ first (Dead Letter Queue) - FIFO
aws --endpoint-url=$ENDPOINT sqs create-queue \
    --queue-name sabuho-processing-dlq.fifo \
    --region $REGION \
    --attributes '{
        "FifoQueue": "true",
        "ContentBasedDeduplication": "false",
        "MessageRetentionPeriod": "1209600"
    }' || echo "DLQ already exists"

# Get DLQ ARN
DLQ_URL=$(aws --endpoint-url=$ENDPOINT sqs get-queue-url \
    --queue-name sabuho-processing-dlq.fifo \
    --region $REGION \
    --output text)
DLQ_ARN="arn:aws:sqs:$REGION:000000000000:sabuho-processing-dlq.fifo"

# Create processing queue with DLQ - FIFO
aws --endpoint-url=$ENDPOINT sqs create-queue \
    --queue-name sabuho-processing.fifo \
    --region $REGION \
    --attributes '{
        "FifoQueue": "true",
        "ContentBasedDeduplication": "false",
        "VisibilityTimeout": "900",
        "MessageRetentionPeriod": "86400",
        "RedrivePolicy": "{\"deadLetterTargetArn\":\"'$DLQ_ARN'\",\"maxReceiveCount\":\"1\"}"
    }' || echo "Processing queue already exists"

# Create S3 events queue
aws --endpoint-url=$ENDPOINT sqs create-queue \
    --queue-name sabuho-s3-events \
    --region $REGION \
    --attributes '{"VisibilityTimeout":"300"}' || echo "S3 events queue already exists"

echo "✅ S3 buckets created:"
aws --endpoint-url=$ENDPOINT s3 ls

echo "✅ SQS queues created:"
aws --endpoint-url=$ENDPOINT sqs list-queues --region $REGION

# Configure S3 event notifications
echo "🔔 Configuring S3 event notifications..."

# Get the S3 events queue URL and ARN
S3_EVENTS_QUEUE_URL=$(aws --endpoint-url=$ENDPOINT sqs get-queue-url \
    --queue-name sabuho-s3-events \
    --region $REGION \
    --output text)
S3_EVENTS_QUEUE_ARN="arn:aws:sqs:$REGION:000000000000:sabuho-s3-events"

# Set SQS queue policy to allow S3 to send messages
aws --endpoint-url=$ENDPOINT sqs set-queue-attributes \
    --queue-url $S3_EVENTS_QUEUE_URL \
    --attributes '{
        "Policy": "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"s3.amazonaws.com\"},\"Action\":\"sqs:SendMessage\",\"Resource\":\"'$S3_EVENTS_QUEUE_ARN'\"}]}"
    }' || echo "Failed to set queue policy"

# Configure S3 bucket notification to send events to SQS
aws --endpoint-url=$ENDPOINT s3api put-bucket-notification-configuration \
    --bucket sabuho-files \
    --notification-configuration '{
        "QueueConfigurations": [
            {
                "QueueArn": "'$S3_EVENTS_QUEUE_ARN'",
                "Events": ["s3:ObjectCreated:*"],
                "Filter": {
                    "Key": {
                        "FilterRules": [
                            {
                                "Name": "prefix",
                                "Value": "uploads/"
                            }
                        ]
                    }
                }
            }
        ]
    }' || echo "Failed to configure S3 notifications"

echo "✅ S3 event notifications configured!"
echo "   Files uploaded to s3://sabuho-files/uploads/* will automatically trigger SQS messages"

echo "✅ LocalStack initialization complete!"
echo ""
echo "📝 Available resources:"
echo "  - S3 Buckets:"
echo "    - sabuho-files (source bucket for uploads)"
echo "    - sabuho-files-ocr (OCR output bucket)"
echo "  - SQS Queues:"
echo "    - sabuho-s3-events (S3 upload events)"
echo "    - sabuho-processing (document processing queue)"
echo "    - sabuho-processing-dlq (dead letter queue)"
echo ""
echo "🔗 Access LocalStack:"
echo "  - Gateway: http://localhost:5566"
echo "  - Health: http://localhost:5566/_localstack/health"
echo ""
echo "💡 Use awslocal CLI for easier access:"
echo "  pip install awscli-local"
echo "  awslocal s3 ls"
