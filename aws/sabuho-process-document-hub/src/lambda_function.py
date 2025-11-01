"""
AWS Lambda handler for unified document processing (OCR + AI).

This Lambda handles two message types:
1. 'ocr_process' - Extracts text from PDFs using OCR
2. 'ai_process' - Identifies topics and generates quiz questions using OpenAI
"""
import json
import os
import traceback
import boto3
from ocr.pdf_text_extraction import extract_text_with_pymupdf_and_ocr
from supabase_client import (
    get_supabase_client,
    save_resource_session_processing_ocr,
    save_resource_session_ocr_completed,
    get_resource_session,
    update_resource_session_status,
    save_topics_to_resource_session,
    create_resource_session_domains,
    save_questions_to_db,
    save_resource_session_error
)
from ai.topic_identifier import identify_document_topics
from ai.question_generator import generate_questions_for_topics
from ai.text_processor import extract_topic_texts


def lambda_handler(event, context):
    """
    Main Lambda handler that routes to OCR or AI processing based on message_type.

    Args:
        event: SQS event with Records containing message_type property
        context: Lambda context

    Returns:
        Response dict with status
    """
    # Initialize Supabase client - fail fast if not configured
    try:
        supabase = get_supabase_client()
        print("Supabase client initialized successfully")
    except Exception as error:
        print(f"Failed to initialize Supabase client: {error}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Failed to initialize Supabase client'})
        }

    print(f"[lambda_handler] Processing {len(event.get('Records', []))} SQS records")

    # Track processing results
    processed_count = 0
    failed_count = 0
    errors = []

    # Process each SQS record
    for record in event.get('Records', []):
        try:
            # Parse SQS message body
            message = json.loads(record['body'])
            message_type = message.get('message_type')

            if not message_type:
                error_msg = "No message_type in SQS message"
                print(f"Error: {error_msg}")
                errors.append(error_msg)
                failed_count += 1
                continue

            print(f"\n{'='*60}")
            print(f"Processing message_type: {message_type}")
            print(f"{'='*60}\n")

            # Route to appropriate handler based on message_type
            if message_type == 'ocr_process':
                process_ocr(supabase, message)
                processed_count += 1
            elif message_type == 'ai_process':
                process_ai(supabase, message)
                processed_count += 1
            else:
                error_msg = f"Unknown message_type: {message_type}"
                print(f"Error: {error_msg}")
                errors.append(error_msg)
                failed_count += 1
                continue

        except Exception as error:
            error_trace = traceback.format_exc()
            print(f"Error processing record: {error}")
            print(error_trace)
            errors.append(str(error))
            failed_count += 1

    # Always return 200 to consume messages (no retries)
    # But include processing statistics and errors for monitoring
    total_records = len(event.get('Records', []))

    response_body = {
        'total': total_records,
        'processed': processed_count,
        'failed': failed_count
    }

    if failed_count > 0:
        response_body['errors'] = errors
        if processed_count == 0:
            response_body['message'] = 'All records failed to process'
        else:
            response_body['message'] = 'Partial processing completed'
    else:
        response_body['message'] = 'Processing completed successfully'

    # Always return 200 so SQS/Lambda deletes the message
    return {
        'statusCode': 200,
        'body': json.dumps(response_body)
    }


def process_ocr(supabase, message: dict):
    """
    Process OCR for a PDF file from S3.

    Args:
        supabase: Supabase client
        message: SQS message containing S3 event
    """
    session_id = None  # Track session ID for error handling

    # Get AWS configuration from environment
    aws_region = os.environ['AWS_REGION']  # Required - will raise KeyError if not set

    s3_client = boto3.client('s3', region_name=aws_region)
    sqs_client = boto3.client('sqs', region_name=aws_region)

    # Get output queue URL from environment
    try:
        output_queue_url = os.environ['OUTPUT_QUEUE_URL']
    except KeyError:
        print("[process_ocr] ERROR: OUTPUT_QUEUE_URL environment variable not set")
        raise

    try:
        # Parse S3 event from message (message contains S3 event structure)
        s3_event = message

        # Extract S3 bucket and key from the S3 event
        for s3_record in s3_event.get('Records', []):
            bucket = s3_record['s3']['bucket']['name']
            key = s3_record['s3']['object']['key']
            print(f"[process_ocr] Processing file: {key} in bucket: {bucket}")

            # Extract filename from S3 key for the name field
            filename = key.split('/')[-1]

            # Create new session in Supabase with 'processing' status
            session = save_resource_session_processing_ocr(
                supabase=supabase,
                file_path=key,
                name=filename
            )
            session_id = session.get('id')
            print(f"[process_ocr] Created session: {session_id}")

            # Download PDF from S3
            response = s3_client.get_object(Bucket=bucket, Key=key)
            pdf_buffer = response['Body'].read()
            print(f"[process_ocr] Downloaded PDF from S3: {len(pdf_buffer)} bytes")

            # Extract text with PyMuPDF and OCR
            extracted_text = extract_text_with_pymupdf_and_ocr(pdf_buffer)
            print(f"[process_ocr] Text extraction completed: {len(extracted_text)} characters")

            # Save extracted text to S3 with .ocr.txt extension
            output_key = f"{key}.ocr.txt"
            s3_client.put_object(
                Bucket=bucket,
                Key=output_key,
                Body=extracted_text.encode('utf-8'),
                ContentType='text/plain'
            )
            print(f"[process_ocr] Saved extracted text to: {output_key}")

            # Update Supabase record with 'ocr_completed' status
            save_resource_session_ocr_completed(
                supabase=supabase,
                session_id=session_id
            )

            # Send completion message to output queue for AI processing
            if output_queue_url:
                message_body = json.dumps({
                    'message_type': 'ai_process',
                    'resource_session_id': session_id
                })
                sqs_client.send_message(
                    QueueUrl=output_queue_url,
                    MessageBody=message_body
                )
                print(f"[process_ocr] Sent AI processing message for session: {session_id}")

    except Exception as error:
        print(f"[process_ocr] Error: {str(error)}")
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
                print(f"[process_ocr] Updated session {session_id} with error status")
            except Exception as supabase_error:
                print(f"[process_ocr] Could not update session with error: {supabase_error}")
        else:
            print(f"[process_ocr] No session ID available to update with error")

        raise  # Re-raise to be caught by main handler


def process_ai(supabase, message: dict):
    """
    Process AI (topic identification and question generation) for a document.

    Args:
        supabase: Supabase client
        message: SQS message containing resource_session_id
    """
    session_id = message.get('resource_session_id')

    if not session_id:
        print("Error: No resource_session_id in message")
        return

    print(f"[process_ai] Processing resource_session: {session_id}")

    try:
        # 1. Fetch resource session
        print("Step 1: Fetching resource session...")
        resource_session = get_resource_session(supabase, session_id)
        print(f"Resource session: {resource_session['name']}")

        # 2. Update status to ai_processing
        print("\nStep 2: Updating status to 'ai_processing'...")
        update_resource_session_status(supabase, session_id, 'ai_processing')

        # 3. Download OCR text from S3
        print("\nStep 3: Downloading OCR text from S3...")
        ocr_text = download_ocr_text_from_s3(resource_session)
        print(f"Downloaded {len(ocr_text)} characters of text")

        # 4. Identify document topics
        print("\nStep 4: Identifying document topics with OpenAI...")
        topics_map = identify_document_topics(ocr_text)
        print(f"Topics identified: {json.dumps(topics_map, indent=2)}")

        # 5. Save topics to resource_sessions.topic_page_range
        print("\nStep 5: Saving topics to database...")
        save_topics_to_resource_session(supabase, session_id, topics_map)

        # 6. Create resource_session_domains
        print("\nStep 6: Creating resource_session_domains...")
        domain_mapping = create_resource_session_domains(supabase, session_id, topics_map)
        print(f"Created {len(domain_mapping)} domains")

        # 7. Extract topic texts from OCR text
        print("\nStep 7: Extracting text for each topic...")
        topic_texts = extract_topic_texts(ocr_text, topics_map)
        print(f"Extracted text for {len(topic_texts)} topics")

        # 8. Generate questions for topics
        print("\nStep 8: Generating quiz questions with OpenAI...")
        questions = generate_questions_for_topics(topic_texts, domain_mapping)
        print(f"Generated {len(questions)} questions")

        # 9. Save questions to database
        print("\nStep 9: Saving questions to database...")
        save_questions_to_db(supabase, questions, session_id)

        # 10. Update status to completed
        print("\nStep 10: Updating status to 'completed'...")
        update_resource_session_status(supabase, session_id, 'completed')

        print(f"\n{'='*60}")
        print(f"AI processing completed successfully for session {session_id}")
        print(f"{'='*60}\n")

    except Exception as error:
        error_trace = traceback.format_exc()
        print(f"[process_ai] Error: {error}")
        print(error_trace)

        # Save error to database
        try:
            save_resource_session_error(supabase, session_id, error_trace)
        except Exception as save_error:
            print(f"[process_ai] Failed to save error to database: {save_error}")

        raise  # Re-raise to be caught by main handler


def download_ocr_text_from_s3(resource_session: dict) -> str:
    """
    Download OCR text file from S3.

    Args:
        resource_session: Resource session dict with file_path

    Returns:
        OCR text content as string

    Raises:
        Exception: If download fails or file not found
    """
    # Get S3 file path
    file_path = resource_session.get('file_path')
    if not file_path:
        raise Exception("Resource session has no file_path")

    # OCR text is stored with .ocr.txt extension
    if not file_path.endswith('.ocr.txt'):
        # OCR process appends .ocr.txt to the original filename
        ocr_file_path = f"{file_path}.ocr.txt"
    else:
        ocr_file_path = file_path

    # Download from S3
    s3_bucket = os.environ['AWS_S3_BUCKET']  # Required - will raise KeyError if not set
    aws_region = os.environ['AWS_REGION']  # Required - will raise KeyError if not set
    print(f"Downloading from S3: bucket={s3_bucket}, key={ocr_file_path}")

    s3_client = boto3.client('s3', region_name=aws_region)

    try:
        response = s3_client.get_object(Bucket=s3_bucket, Key=ocr_file_path)
        text_content = response['Body'].read().decode('utf-8')
        return text_content
    except s3_client.exceptions.NoSuchKey:
        raise Exception(f"OCR file not found in S3: {ocr_file_path}")
    except Exception as e:
        raise Exception(f"Failed to download from S3: {e}")
