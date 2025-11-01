"""
Document processing message handler.

Processes two message types:
1. 'ocr_process' - Extracts text from PDFs using OCR
2. 'ai_process' - Identifies topics and generates quiz questions using OpenAI
"""
import json
import os
import traceback
import boto3
from typing import Dict, Any, Tuple
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


class MessageProcessingResult:
    """Result of processing a message."""

    def __init__(self, success: bool, error: str = None):
        self.success = success
        self.error = error

    def to_dict(self) -> dict:
        """Convert result to dictionary."""
        return {
            'success': self.success,
            'error': self.error
        }


class DocumentMessageProcessor:
    """Processes document processing messages from SQS."""

    def __init__(self):
        """Initialize the message processor."""
        # Initialize Supabase client - fail fast if not configured
        try:
            self.supabase = get_supabase_client()
            print("Supabase client initialized successfully")
        except Exception as error:
            print(f"Failed to initialize Supabase client: {error}")
            raise

        # Get AWS configuration from environment
        self.aws_region = os.environ['AWS_REGION']  # Required - will raise KeyError if not set
        self.s3_client = boto3.client('s3', region_name=self.aws_region)
        self.sqs_client = boto3.client('sqs', region_name=self.aws_region)

        # Get output queue URL from environment
        self.output_queue_url = os.environ['OUTPUT_QUEUE_URL']  # Required - will raise KeyError if not set

        print(f"DocumentMessageProcessor initialized - AWS Region: {self.aws_region}")

    def process_message(self, message_body: Dict[str, Any]) -> MessageProcessingResult:
        """
        Process a document message.

        Args:
            message_body: Parsed message body containing message_type and other fields

        Returns:
            MessageProcessingResult indicating success or failure
        """
        try:
            message_type = message_body.get('message_type')

            if not message_type:
                return MessageProcessingResult(False, "No message_type in message")

            print(f"\n{'='*60}")
            print(f"Processing message_type: {message_type}")
            print(f"{'='*60}\n")

            # Route to appropriate handler based on message_type
            if message_type == 'ocr_process':
                self._process_ocr(message_body)
                return MessageProcessingResult(True)
            elif message_type == 'ai_process':
                self._process_ai(message_body)
                return MessageProcessingResult(True)
            else:
                return MessageProcessingResult(False, f"Unknown message_type: {message_type}")

        except Exception as error:
            error_trace = traceback.format_exc()
            print(f"Error processing message: {error}")
            print(error_trace)
            return MessageProcessingResult(False, str(error))

    def _process_ocr(self, message: dict):
        """
        Process OCR for a PDF file from S3.

        Args:
            message: Message containing S3 event structure
        """
        session_id = None  # Track session ID for error handling

        try:
            # Parse S3 event from message (message contains S3 event structure)
            s3_event = message

            # Handle both direct S3 event format and wrapped format
            if 'Records' in s3_event:
                record = s3_event['Records'][0]
                s3_info = record.get('s3', {})
            else:
                # Direct format without Records wrapper
                s3_info = s3_event.get('s3', {})

            bucket = s3_info.get('bucket', {}).get('name')
            key = s3_info.get('object', {}).get('key')

            if not bucket or not key:
                raise ValueError(f"Invalid S3 event structure: bucket={bucket}, key={key}")

            print(f"Processing OCR for: s3://{bucket}/{key}")

            # Create resource session with 'processing' status
            resource_name = os.path.basename(key)
            resource_session = save_resource_session_processing_ocr(self.supabase, key, resource_name)
            session_id = resource_session['id']
            print(f"Created resource_session with id: {session_id}")

            # Download PDF from S3
            print("Downloading PDF from S3...")
            local_pdf_path = f"/tmp/{os.path.basename(key)}"
            self.s3_client.download_file(bucket, key, local_pdf_path)
            print(f"Downloaded to: {local_pdf_path}")

            # Extract text using OCR
            print("Extracting text from PDF...")
            extracted_text = extract_text_with_pymupdf_and_ocr(local_pdf_path)
            print(f"Extracted {len(extracted_text)} characters of text")

            # Upload OCR result to S3
            ocr_key = f"{key}.ocr.txt"
            print(f"Uploading OCR result to: s3://{bucket}/{ocr_key}")
            self.s3_client.put_object(
                Bucket=bucket,
                Key=ocr_key,
                Body=extracted_text.encode('utf-8'),
                ContentType='text/plain'
            )

            # Update resource session status to 'ocr_completed'
            save_resource_session_ocr_completed(self.supabase, session_id)
            print(f"Updated resource_session {session_id} to ocr_completed")

            # Send message to output queue for AI processing
            ai_message = {
                'message_type': 'ai_process',
                'resource_session_id': session_id
            }

            print(f"Sending AI processing message to queue: {self.output_queue_url}")
            self.sqs_client.send_message(
                QueueUrl=self.output_queue_url,
                MessageBody=json.dumps(ai_message)
            )

            print(f"[process_ocr] Successfully completed OCR for session {session_id}")

            # Clean up temporary file
            if os.path.exists(local_pdf_path):
                os.remove(local_pdf_path)

        except Exception as error:
            error_msg = f"OCR processing failed: {error}"
            print(f"[process_ocr] Error: {error_msg}")
            traceback.print_exc()

            # Save error to database if we have a session_id
            if session_id:
                save_resource_session_error(self.supabase, session_id, error_msg)

            raise

    def _process_ai(self, message: dict):
        """
        Process AI analysis for a document (topic identification + question generation).

        Args:
            message: Message containing resource_session_id
        """
        session_id = message.get('resource_session_id')

        if not session_id:
            raise ValueError("No resource_session_id in message")

        print(f"Processing AI for session: {session_id}")

        try:
            # Update status to 'ai_processing'
            update_resource_session_status(self.supabase, session_id, 'ai_processing')

            # Get resource session
            resource_session = get_resource_session(self.supabase, session_id)
            file_path = resource_session['file_path']
            print(f"File path: {file_path}")

            # Determine OCR file path
            if file_path.endswith('.pdf'):
                ocr_file_path = f"{file_path}.ocr.txt"
            else:
                ocr_file_path = file_path

            # Download OCR text from S3
            s3_bucket = os.environ['AWS_S3_BUCKET']  # Required - will raise KeyError if not set
            print(f"Downloading OCR text from S3: bucket={s3_bucket}, key={ocr_file_path}")

            try:
                response = self.s3_client.get_object(Bucket=s3_bucket, Key=ocr_file_path)
                full_text = response['Body'].read().decode('utf-8')
                print(f"Downloaded {len(full_text)} characters")
            except Exception as s3_error:
                raise Exception(f"Failed to download OCR text from S3: {s3_error}")

            # Step 1: Identify topics
            print("Step 1: Identifying document topics...")
            topics_result = identify_document_topics(full_text)
            print(f"Identified {len(topics_result.get('topics', []))} topics")

            # Save topics to resource_session
            save_topics_to_resource_session(self.supabase, session_id, topics_result)

            # Create resource_session_domains
            domain_mapping = create_resource_session_domains(self.supabase, session_id, topics_result)
            print(f"Created {len(domain_mapping)} domains")

            # Step 2: Generate questions for each topic
            print("Step 2: Generating questions for topics...")

            # Extract text for each topic based on page ranges
            topic_texts = extract_topic_texts(full_text, topics_result)
            print(f"Extracted text for {len(topic_texts)} topics")

            # Generate questions for all topics
            questions = generate_questions_for_topics(topic_texts, domain_mapping)
            print(f"Generated {len(questions)} total questions")

            # Save questions to database
            save_questions_to_db(self.supabase, questions, session_id)

            # Update status to 'completed'
            update_resource_session_status(self.supabase, session_id, 'completed')
            print(f"[process_ai] Successfully completed AI processing for session {session_id}")

        except Exception as error:
            error_msg = f"AI processing failed: {error}"
            print(f"[process_ai] Error: {error_msg}")
            traceback.print_exc()

            # Save error to database
            save_resource_session_error(self.supabase, session_id, error_msg)

            raise
