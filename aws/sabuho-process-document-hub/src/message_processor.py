"""
Document processing message handlers.

Separate processors for OCR and AI operations:
1. OCRProcessor - Extracts text from PDFs using OCR
2. AIProcessor - Identifies topics and generates quiz questions using OpenAI
"""
import os
import traceback
import boto3
from typing import Dict, Any, Optional
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


class ProcessingResult:
    """Result of processing a message."""

    def __init__(self, success: bool, error: str = None, data: Dict[str, Any] = None):
        self.success = success
        self.error = error
        self.data = data or {}

    def to_dict(self) -> dict:
        """Convert result to dictionary."""
        return {
            'success': self.success,
            'error': self.error,
            'data': self.data
        }


class OCRProcessor:
    """Processes OCR extraction for PDF documents."""

    def __init__(self):
        """Initialize the OCR processor."""
        # Initialize Supabase client - fail fast if not configured
        try:
            self.supabase = get_supabase_client()
            print("[OCRProcessor] Supabase client initialized successfully")
        except Exception as error:
            print(f"[OCRProcessor] Failed to initialize Supabase client: {error}")
            raise

        # Get AWS configuration from environment
        self.aws_region = os.environ['AWS_REGION']  # Required - will raise KeyError if not set
        self.s3_client = boto3.client('s3', region_name=self.aws_region)

        print(f"[OCRProcessor] Initialized - AWS Region: {self.aws_region}")

    def process(self, message: Dict[str, Any]) -> ProcessingResult:
        """
        Process OCR for a PDF file from S3.

        Args:
            message: Message containing S3 event structure with bucket and key

        Returns:
            ProcessingResult with session_id in data if successful
        """
        session_id = None  # Track session ID for error handling

        try:
            # Parse S3 event from message
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
                return ProcessingResult(False, f"Invalid S3 event structure: bucket={bucket}, key={key}")

            print(f"[OCRProcessor] Processing OCR for: s3://{bucket}/{key}")

            # Create resource session with 'processing' status
            resource_name = os.path.basename(key)
            resource_session = save_resource_session_processing_ocr(self.supabase, key, resource_name)
            session_id = resource_session['id']
            print(f"[OCRProcessor] Created resource_session with id: {session_id}")

            # Download PDF from S3
            print("[OCRProcessor] Downloading PDF from S3...")
            local_pdf_path = f"/tmp/{os.path.basename(key)}"
            self.s3_client.download_file(bucket, key, local_pdf_path)
            print(f"[OCRProcessor] Downloaded to: {local_pdf_path}")

            # Extract text using OCR
            print("[OCRProcessor] Extracting text from PDF...")
            # Read the PDF file as bytes
            with open(local_pdf_path, 'rb') as pdf_file:
                pdf_buffer = pdf_file.read()
            extracted_text = extract_text_with_pymupdf_and_ocr(pdf_buffer)
            print(f"[OCRProcessor] Extracted {len(extracted_text)} characters of text")

            # Upload OCR result to S3
            ocr_key = f"{key}.ocr.txt"
            print(f"[OCRProcessor] Uploading OCR result to: s3://{bucket}/{ocr_key}")
            self.s3_client.put_object(
                Bucket=bucket,
                Key=ocr_key,
                Body=extracted_text.encode('utf-8'),
                ContentType='text/plain'
            )

            # Update resource session status to 'ocr_completed'
            save_resource_session_ocr_completed(self.supabase, session_id)
            print(f"[OCRProcessor] Updated resource_session {session_id} to ocr_completed")

            # Clean up temporary file
            if os.path.exists(local_pdf_path):
                os.remove(local_pdf_path)

            print(f"[OCRProcessor] Successfully completed OCR for session {session_id}")

            # Return success with session_id for next step
            return ProcessingResult(True, data={'session_id': session_id})

        except Exception as error:
            error_msg = f"OCR processing failed: {error}"
            print(f"[OCRProcessor] Error: {error_msg}")
            traceback.print_exc()

            # Save error to database if we have a session_id
            if session_id:
                save_resource_session_error(self.supabase, session_id, error_msg)

            return ProcessingResult(False, error_msg)


class AIProcessor:
    """Processes AI analysis for documents (topic identification + question generation)."""

    def __init__(self):
        """Initialize the AI processor."""
        # Initialize Supabase client - fail fast if not configured
        try:
            self.supabase = get_supabase_client()
            print("[AIProcessor] Supabase client initialized successfully")
        except Exception as error:
            print(f"[AIProcessor] Failed to initialize Supabase client: {error}")
            raise

        # Get AWS configuration from environment
        self.aws_region = os.environ['AWS_REGION']  # Required - will raise KeyError if not set
        self.s3_bucket = os.environ['AWS_S3_BUCKET']  # Required - will raise KeyError if not set
        self.s3_client = boto3.client('s3', region_name=self.aws_region)

        print(f"[AIProcessor] Initialized - AWS Region: {self.aws_region}, Bucket: {self.s3_bucket}")

    def process(self, message: Dict[str, Any]) -> ProcessingResult:
        """
        Process AI analysis for a document (topic identification + question generation).

        Args:
            message: Message containing resource_session_id

        Returns:
            ProcessingResult indicating success or failure
        """
        session_id = message.get('resource_session_id')

        if not session_id:
            return ProcessingResult(False, "No resource_session_id in message")

        print(f"[AIProcessor] Processing AI for session: {session_id}")

        try:
            # Update status to 'ai_processing'
            update_resource_session_status(self.supabase, session_id, 'ai_processing')

            # Get resource session
            resource_session = get_resource_session(self.supabase, session_id)
            file_path = resource_session['file_path']
            print(f"[AIProcessor] File path: {file_path}")

            # Determine OCR file path
            if file_path.endswith('.pdf'):
                ocr_file_path = f"{file_path}.ocr.txt"
            else:
                ocr_file_path = file_path

            # Download OCR text from S3
            print(f"[AIProcessor] Downloading OCR text from S3: bucket={self.s3_bucket}, key={ocr_file_path}")

            try:
                response = self.s3_client.get_object(Bucket=self.s3_bucket, Key=ocr_file_path)
                full_text = response['Body'].read().decode('utf-8')
                print(f"[AIProcessor] Downloaded {len(full_text)} characters")
            except Exception as s3_error:
                raise Exception(f"Failed to download OCR text from S3: {s3_error}")

            # Step 1: Identify topics
            print("[AIProcessor] Step 1: Identifying document topics...")
            topics_result = identify_document_topics(full_text)
            print(f"[AIProcessor] Identified {len(topics_result.get('topics', []))} topics")

            # Save topics to resource_session
            save_topics_to_resource_session(self.supabase, session_id, topics_result)

            # Create resource_session_domains
            domain_mapping = create_resource_session_domains(self.supabase, session_id, topics_result)
            print(f"[AIProcessor] Created {len(domain_mapping)} domains")

            # Step 2: Generate questions for each topic
            print("[AIProcessor] Step 2: Generating questions for topics...")

            # Extract text for each topic based on page ranges
            topic_texts = extract_topic_texts(full_text, topics_result)
            print(f"[AIProcessor] Extracted text for {len(topic_texts)} topics")

            # Generate questions for all topics
            questions = generate_questions_for_topics(topic_texts, domain_mapping)
            print(f"[AIProcessor] Generated {len(questions)} total questions")

            # Save questions to database
            save_questions_to_db(self.supabase, questions, session_id)

            # Update status to 'completed'
            update_resource_session_status(self.supabase, session_id, 'completed')
            print(f"[AIProcessor] Successfully completed AI processing for session {session_id}")

            return ProcessingResult(True, data={'session_id': session_id, 'questions_count': len(questions)})

        except Exception as error:
            error_msg = f"AI processing failed: {error}"
            print(f"[AIProcessor] Error: {error_msg}")
            traceback.print_exc()

            # Save error to database
            save_resource_session_error(self.supabase, session_id, error_msg)

            return ProcessingResult(False, error_msg)
