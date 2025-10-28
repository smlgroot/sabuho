"""
AWS Lambda function for AI processing of document resources.

This Lambda:
1. Receives SQS events from the OCR processing Lambda
2. Downloads OCR text from S3
3. Identifies document topics using OpenAI
4. Generates quiz questions for each topic
5. Saves everything to Supabase
"""
import json
import os
import traceback
import boto3
from supabase_client import (
    get_supabase_client,
    get_resource_session,
    update_resource_session_status,
    save_topics_to_resource_session,
    create_resource_session_domains,
    save_questions_to_db,
    save_resource_session_error
)
from topic_identifier import identify_document_topics
from question_generator import generate_questions_for_topics
from text_processor import extract_topic_texts


def lambda_handler(event, context):
    """
    Main Lambda handler for AI processing.

    Args:
        event: SQS event containing resource_session_id
        context: Lambda context

    Returns:
        Response dict with statusCode and body
    """
    print("AI Processing Lambda started")
    print(f"Event: {json.dumps(event)}")

    # Initialize clients
    try:
        supabase = get_supabase_client()
        print("Supabase client initialized successfully")
    except Exception as error:
        print(f"Failed to initialize Supabase client: {error}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Failed to initialize Supabase client'})
        }

    # Check if running locally for testing
    is_local = os.getenv('AWS_SAM_LOCAL', 'false').lower() == 'true'

    # Process each SQS record
    for record in event.get('Records', []):
        session_id = None

        try:
            # Parse SQS message body
            message_body = json.loads(record['body'])
            session_id = message_body.get('resource_session_id')

            if not session_id:
                print("Error: No resource_session_id in message")
                continue

            print(f"\n{'='*60}")
            print(f"Processing resource_session: {session_id}")
            print(f"{'='*60}\n")

            # Process this document
            process_document(supabase, session_id, is_local)

        except Exception as error:
            error_trace = traceback.format_exc()
            print(f"Error processing record: {error}")
            print(error_trace)

            # Save error to database if we have a session_id
            if session_id:
                try:
                    save_resource_session_error(supabase, session_id, error_trace)
                except Exception as save_error:
                    print(f"Failed to save error to database: {save_error}")

    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'AI processing completed'})
    }


def process_document(supabase, session_id: str, is_local: bool = False):
    """
    Process a single document through the AI pipeline.

    Args:
        supabase: Supabase client
        session_id: UUID of the resource session
        is_local: Whether running locally for testing
    """
    # 1. Fetch resource session
    print("Step 1: Fetching resource session...")
    resource_session = get_resource_session(supabase, session_id)
    print(f"Resource session: {resource_session['name']}")

    # 2. Update status to ai_processing
    print("\nStep 2: Updating status to 'ai_processing'...")
    update_resource_session_status(supabase, session_id, 'ai_processing')

    # 3. Download OCR text from S3
    print("\nStep 3: Downloading OCR text from S3...")
    ocr_text = download_ocr_text_from_s3(resource_session, is_local)
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


def download_ocr_text_from_s3(resource_session: dict, is_local: bool = False) -> str:
    """
    Download OCR text file from S3.

    Args:
        resource_session: Resource session dict with file_path
        is_local: Whether running locally (for testing)

    Returns:
        OCR text content as string

    Raises:
        Exception: If download fails or file not found
    """
    if is_local:
        # For local testing, read from local file
        local_file = os.getenv('LOCAL_TEST_FILE')
        if local_file:
            print(f"Local testing mode: reading from {local_file}")
            with open(local_file, 'r', encoding='utf-8') as f:
                return f.read()

    # Get S3 file path
    file_path = resource_session.get('file_path')
    if not file_path:
        raise Exception("Resource session has no file_path")

    # OCR text is stored with .ocr.txt extension
    if not file_path.endswith('.ocr.txt'):
        ocr_file_path = file_path.replace('.pdf', '.ocr.txt')
    else:
        ocr_file_path = file_path

    # Download from S3
    s3_bucket = os.getenv('AWS_S3_BUCKET', 'sabuho-files')
    print(f"Downloading from S3: bucket={s3_bucket}, key={ocr_file_path}")

    s3_client = boto3.client('s3')

    try:
        response = s3_client.get_object(Bucket=s3_bucket, Key=ocr_file_path)
        text_content = response['Body'].read().decode('utf-8')
        return text_content
    except s3_client.exceptions.NoSuchKey:
        raise Exception(f"OCR file not found in S3: {ocr_file_path}")
    except Exception as e:
        raise Exception(f"Failed to download from S3: {e}")
