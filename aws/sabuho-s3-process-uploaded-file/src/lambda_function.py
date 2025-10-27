"""AWS Lambda handler for processing PDF files uploaded to S3"""
import json
import os
import boto3
from pdf_text_extraction import extract_text_with_pymupdf_and_ocr
from supabase_client import (
    get_supabase_client,
    save_resource_session_processing_ocr,
    save_resource_session_ocr_completed,
    save_resource_session_error
)

def lambda_handler(event, context):
    """
    Process PDF files from SQS queue (containing S3 events)
    Extracts text and saves to S3 with .ocr.txt extension
    Saves processing status to Supabase
    Sends completion message to output queue
    """
    # Initialize Supabase client - fail fast if not configured
    supabase = get_supabase_client()

    s3_client = boto3.client('s3')
    sqs_client = boto3.client('sqs')

    # Get output queue URL from environment
    output_queue_url = os.getenv('OUTPUT_QUEUE_URL')
    if not output_queue_url:
        print("[lambda_handler] WARNING: OUTPUT_QUEUE_URL not set")

    session_id = None  # Track session ID for error handling

    try:
        # Check if running locally (for testing)
        is_local = os.getenv('AWS_SAM_LOCAL', 'false') == 'true'
        local_test_file = os.getenv('LOCAL_TEST_FILE', None)

        print(f"[lambda_handler] is_local: {is_local}")
        print(f"[lambda_handler] Processing {len(event.get('Records', []))} SQS records")

        # Process SQS event records
        for sqs_record in event['Records']:
            # Parse S3 event from SQS message body
            s3_event = json.loads(sqs_record['body'])

            # Extract S3 bucket and key from the S3 event
            for s3_record in s3_event['Records']:
                bucket = s3_record['s3']['bucket']['name']
                key = s3_record['s3']['object']['key']
                print(f"[lambda_handler] Processing file: {key} in bucket: {bucket}")

                # Extract filename from S3 key for the name field
                filename = key.split('/')[-1]

                # Create new session in Supabase with 'processing' status
                session = save_resource_session_processing_ocr(
                    supabase=supabase,
                    file_path=key,
                    name=filename
                )

                if not session:
                    print(f"[lambda_handler] ERROR: Failed to create session in Supabase")
                    continue

                session_id = session.get('id')
                print(f"[lambda_handler] Created session: {session_id}")

                # Download PDF from S3 or use local file for testing
                if is_local and local_test_file and os.path.exists(local_test_file):
                    print(f"[lambda_handler] Running locally - using test file: {local_test_file}")
                    with open(local_test_file, 'rb') as f:
                        pdf_buffer = f.read()
                    print(f"[lambda_handler] Loaded local PDF: {len(pdf_buffer)} bytes")
                else:
                    response = s3_client.get_object(Bucket=bucket, Key=key)
                    pdf_buffer = response['Body'].read()
                    print(f"[lambda_handler] Downloaded PDF from S3: {len(pdf_buffer)} bytes")

                # Extract text with PyMuPDF and OCR
                extracted_text = extract_text_with_pymupdf_and_ocr(pdf_buffer)
                print(f"[lambda_handler] Text extraction completed: {len(extracted_text)} characters")

                # Save extracted text to S3 with .ocr.txt extension
                output_key = f"{key}.ocr.txt"
                s3_client.put_object(
                    Bucket=bucket,
                    Key=output_key,
                    Body=extracted_text.encode('utf-8'),
                    ContentType='text/plain'
                )
                print(f"[lambda_handler] Saved extracted text to: {output_key}")

                # Update Supabase record with 'ocr_completed' status
                save_resource_session_ocr_completed(
                    supabase=supabase,
                    session_id=session_id
                )

                # Send completion message to output queue
                if output_queue_url:
                    message_body = json.dumps({'s3_key': key})
                    sqs_client.send_message(
                        QueueUrl=output_queue_url,
                        MessageBody=message_body
                    )
                    print(f"[lambda_handler] Sent completion message to output queue for: {key}")

        return {'status': 'success'}

    except Exception as error:
        print(f"[lambda_handler] Error: {str(error)}")
        import traceback
        error_trace = traceback.format_exc()
        traceback.print_exc()

        # Update Supabase record with error status if we have a session
        if session_id:
            try:
                save_resource_session_error(
                    supabase=supabase,
                    session_id=session_id,
                    error_message=f"{str(error)}\n\n{error_trace}"
                )
                print(f"[lambda_handler] Updated session {session_id} with error status")
            except Exception as supabase_error:
                print(f"[lambda_handler] Could not update session with error: {supabase_error}")
        else:
            print(f"[lambda_handler] No session ID available to update with error")

        return {
            'status': 'error',
            'message': str(error)
        }
