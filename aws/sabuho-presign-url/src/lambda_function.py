"""
AWS Lambda function to generate presigned URLs for S3 uploads.

Generates unique S3 keys for each upload to avoid collisions when multiple
users upload files with the same name.
"""
import json
import os
import uuid
from datetime import datetime
import boto3
from botocore.exceptions import ClientError


def generate_unique_key(filename: str = "document.pdf") -> tuple[str, str]:
    """
    Generate a unique S3 key for uploaded files.

    Args:
        filename: Original filename (default: "document.pdf")

    Returns:
        Tuple of (s3_key, job_id)
        - s3_key: Unique path in S3 (e.g., "uploads/2024-01-15/uuid/filename.pdf")
        - job_id: Unique identifier for this upload job
    """
    # Generate unique job ID
    job_id = str(uuid.uuid4())

    # Create date-based folder structure
    date_folder = datetime.utcnow().strftime("%Y-%m-%d")

    # Sanitize filename to remove any path components
    safe_filename = os.path.basename(filename)

    # Create unique key: uploads/{date}/{job_id}/{filename}
    s3_key = f"uploads/{date_folder}/{job_id}/{safe_filename}"

    return s3_key, job_id


def lambda_handler(event, context):
    """
    Lambda handler to generate presigned URLs for S3 uploads.

    Expected request (POST):
        Headers:
            Content-Type: application/json
        Body (optional):
            {
                "filename": "document.pdf",  // Optional: original filename
                "contentType": "application/pdf"  // Optional: MIME type
            }

    Response:
        {
            "uploadUrl": "https://s3.amazonaws.com/...",  // Presigned URL for PUT
            "key": "uploads/2024-01-15/uuid/filename.pdf",  // Unique S3 key
            "jobId": "uuid"  // Unique job identifier
        }
    """
    try:
        # Get configuration from environment
        bucket_name = os.environ.get('S3_BUCKET_NAME')
        if not bucket_name:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                'body': json.dumps({'error': 'S3_BUCKET_NAME not configured'})
            }

        # Parse request body
        body = {}
        if event.get('body'):
            try:
                body = json.loads(event['body'])
            except json.JSONDecodeError:
                pass

        filename = body.get('filename', 'document.pdf')
        content_type = body.get('contentType', 'application/pdf')

        # Generate unique S3 key
        s3_key, job_id = generate_unique_key(filename)

        # Initialize S3 client
        s3_client = boto3.client('s3')

        # Generate presigned URL for PUT operation
        # Valid for 15 minutes
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': bucket_name,
                'Key': s3_key,
                'ContentType': content_type
            },
            ExpiresIn=900  # 15 minutes
        )

        # Return response
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': json.dumps({
                'uploadUrl': presigned_url,
                'key': s3_key,
                'jobId': job_id
            })
        }

    except ClientError as e:
        print(f"AWS error generating presigned URL: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Failed to generate presigned URL',
                'details': str(e)
            })
        }
    except Exception as e:
        print(f"Error generating presigned URL: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'details': str(e)
            })
        }
