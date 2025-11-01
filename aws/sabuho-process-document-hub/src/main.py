#!/usr/bin/env python3
"""
Main entry point for Sabuho Document Processing Hub.

Supports two execution modes:
1. Production Mode - Long-running SQS processor for ECS deployment
2. Local Mode - Single test execution for local development

Processes document messages for OCR and AI analysis without Lambda dependencies.
"""

import os
import sys
import json
import signal
import asyncio
import logging
import time
from typing import Dict, Any, Optional
from threading import Event
from concurrent.futures import ThreadPoolExecutor

import boto3
from botocore.config import Config

# Import the document message processors
from message_processor import OCRProcessor, AIProcessor, ProcessingResult

# Configure logging
logging.basicConfig(
    level=os.environ.get('LOG_LEVEL', 'INFO'),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class GracefulShutdown:
    """Handle graceful shutdown for long-running services."""

    def __init__(self):
        self.shutdown_event = Event()
        signal.signal(signal.SIGTERM, self._handle_signal)
        signal.signal(signal.SIGINT, self._handle_signal)

    def _handle_signal(self, signum, frame):
        logger.info(f"Received signal {signum}, initiating graceful shutdown...")
        self.shutdown_event.set()

    def is_shutdown_requested(self):
        return self.shutdown_event.is_set()

    def wait_for_shutdown(self, timeout=None):
        return self.shutdown_event.wait(timeout)


class SQSProcessor:
    """Process messages from SQS queue for Production mode."""

    def __init__(self, s3_events_queue_url: str, processing_queue_url: str, max_workers: int = 4):
        self.s3_events_queue_url = s3_events_queue_url
        self.processing_queue_url = processing_queue_url
        self.max_workers = max_workers
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.shutdown_handler = GracefulShutdown()

        # Configure boto3 client
        aws_region = os.environ['AWS_REGION']  # Required - will raise KeyError if not set
        config = Config(
            region_name=aws_region,
            retries={'max_attempts': 3, 'mode': 'adaptive'}
        )

        self.sqs = boto3.client('sqs', config=config)

        # Initialize the document processors
        self.ocr_processor = OCRProcessor()
        self.ai_processor = AIProcessor()

        logger.info(f"SQS Processor initialized")
        logger.info(f"S3 Events Queue: {s3_events_queue_url}")
        logger.info(f"Processing Queue (FIFO): {processing_queue_url}")

    def _transform_and_enqueue_s3_events(self, s3_event_message: Dict[str, Any]):
        """
        Transform S3 event records into simplified messages and send to processing queue.

        Args:
            s3_event_message: Raw S3 event message containing multiple Records
        """
        try:
            records = s3_event_message.get('Records', [])

            if not records:
                logger.warning("No Records found in S3 event message")
                return

            logger.info(f"Processing {len(records)} S3 event records")

            # Transform each S3 event record into simplified message
            for record in records:
                try:
                    s3_info = record.get('s3', {})
                    bucket = s3_info.get('bucket', {}).get('name')
                    key = s3_info.get('object', {}).get('key')

                    if not key:
                        logger.error(f"Missing key in S3 record: {record}")
                        continue

                    # Create simplified message for OCR processing
                    simplified_message = {
                        'message_type': 'ocr_process',
                        'key': key
                    }

                    # Send to FIFO processing queue
                    # Use the S3 key as MessageGroupId to ensure ordering per file
                    message_group_id = key.replace('/', '_')  # FIFO requires valid MessageGroupId

                    logger.info(f"Enqueueing OCR message for key: {key}")
                    self.sqs.send_message(
                        QueueUrl=self.processing_queue_url,
                        MessageBody=json.dumps(simplified_message),
                        MessageGroupId=message_group_id,
                        MessageDeduplicationId=f"{key}_{int(time.time() * 1000)}"  # Unique dedup ID
                    )
                    logger.debug(f"Enqueued message to processing queue for key: {key}")

                except Exception as e:
                    logger.error(f"Failed to transform/enqueue S3 record: {e}", exc_info=True)
                    # Continue processing other records

        except Exception as e:
            logger.error(f"Failed to process S3 event records: {e}", exc_info=True)
            raise

    def _send_ai_message(self, session_id: str):
        """
        Send AI processing message to processing queue.

        Args:
            session_id: Resource session ID to process
        """
        try:
            ai_message = {
                'message_type': 'ai_process',
                'resource_session_id': session_id
            }

            # Use session_id as MessageGroupId for FIFO ordering
            logger.info(f"Sending AI processing message for session {session_id} to processing queue")
            self.sqs.send_message(
                QueueUrl=self.processing_queue_url,
                MessageBody=json.dumps(ai_message),
                MessageGroupId=session_id,
                MessageDeduplicationId=f"{session_id}_ai_{int(time.time() * 1000)}"
            )
            logger.debug(f"AI message sent successfully for session {session_id}")
        except Exception as e:
            logger.error(f"Failed to send AI message for session {session_id}: {e}", exc_info=True)
            raise

    def process_s3_event_message(self, message: Dict[str, Any], queue_url: str) -> bool:
        """
        Process a single S3 event message from the S3 events queue.
        Transforms S3 events and enqueues simplified messages to processing queue.
        """
        message_id = message.get('MessageId', 'unknown')

        try:
            # Parse the message body (S3 event format)
            message_body = json.loads(message['Body'])

            logger.info(f"Processing S3 event message: {message_id}")

            # Transform and enqueue to processing queue
            self._transform_and_enqueue_s3_events(message_body)

            logger.info(f"Successfully transformed and enqueued S3 events from message: {message_id}")

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse S3 event message body for {message_id}: {e}", exc_info=True)
        except Exception as e:
            logger.error(f"Error processing S3 event message {message_id}: {e}", exc_info=True)

        finally:
            # Always delete message immediately after transformation to avoid reprocessing
            try:
                self.sqs.delete_message(
                    QueueUrl=queue_url,
                    ReceiptHandle=message['ReceiptHandle']
                )
                logger.debug(f"Deleted S3 event message from queue: {message_id}")
            except Exception as delete_error:
                logger.error(f"Failed to delete S3 event message {message_id}: {delete_error}")
                return False

        return True

    def process_processing_message(self, message: Dict[str, Any], queue_url: str) -> bool:
        """
        Process a single message from the processing queue (OCR/AI messages).
        Always consumes the message (no retries).
        """
        message_id = message.get('MessageId', 'unknown')

        try:
            # Parse the message body
            message_body = json.loads(message['Body'])
            message_type = message_body.get('message_type')

            if not message_type:
                logger.error(f"No message_type in processing message: {message_id}")
                return True

            logger.info(f"Processing message: {message_id} - Type: {message_type}")

            # Route to appropriate processor based on message_type
            if message_type == 'ocr_process':
                result = self.ocr_processor.process(message_body)

                # If OCR succeeded, send AI processing message to processing queue
                if result.success:
                    session_id = result.data.get('session_id')
                    self._send_ai_message(session_id)
                    logger.info(f"Successfully processed OCR and queued AI for session: {session_id}")
                else:
                    logger.error(f"OCR processing failed: {message_id} - Error: {result.error}")

            elif message_type == 'ai_process':
                result = self.ai_processor.process(message_body)

                if result.success:
                    session_id = result.data.get('session_id')
                    questions_count = result.data.get('questions_count', 0)
                    logger.info(f"Successfully processed AI for session {session_id} - Generated {questions_count} questions")
                else:
                    logger.error(f"AI processing failed: {message_id} - Error: {result.error}")

            else:
                logger.error(f"Unknown message_type: {message_type} in message: {message_id}")

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse processing message body for {message_id}: {e}", exc_info=True)
        except Exception as e:
            logger.error(f"Error processing message {message_id}: {e}", exc_info=True)

        finally:
            # Always delete message (no retries) regardless of processing result
            try:
                self.sqs.delete_message(
                    QueueUrl=queue_url,
                    ReceiptHandle=message['ReceiptHandle']
                )
                logger.debug(f"Deleted processing message from queue: {message_id}")
            except Exception as delete_error:
                logger.error(f"Failed to delete processing message {message_id}: {delete_error}")
                return False

        return True

    def poll_messages(self):
        """Poll both SQS queues for messages."""
        logger.info("Starting SQS polling for both queues...")

        while not self.shutdown_handler.is_shutdown_requested():
            try:
                # Poll S3 events queue
                s3_response = self.sqs.receive_message(
                    QueueUrl=self.s3_events_queue_url,
                    MaxNumberOfMessages=min(10, self.max_workers),
                    WaitTimeSeconds=5,  # Shorter polling for S3 events
                    VisibilityTimeout=60,  # 1 minute (transformation is quick)
                    AttributeNames=['All'],
                    MessageAttributeNames=['All']
                )

                s3_messages = s3_response.get('Messages', [])

                if s3_messages:
                    logger.info(f"Received {len(s3_messages)} S3 event messages")

                    # Process S3 event messages (transform and enqueue)
                    for message in s3_messages:
                        future = self.executor.submit(
                            self.process_s3_event_message,
                            message,
                            self.s3_events_queue_url
                        )

                # Poll processing queue (FIFO)
                processing_response = self.sqs.receive_message(
                    QueueUrl=self.processing_queue_url,
                    MaxNumberOfMessages=min(10, self.max_workers),
                    WaitTimeSeconds=20,  # Long polling for processing queue
                    VisibilityTimeout=300,  # 5 minutes (OCR/AI takes longer)
                    AttributeNames=['All'],
                    MessageAttributeNames=['All']
                )

                processing_messages = processing_response.get('Messages', [])

                if processing_messages:
                    logger.info(f"Received {len(processing_messages)} processing messages")

                    # Process messages from processing queue in parallel
                    futures = []
                    for message in processing_messages:
                        future = self.executor.submit(
                            self.process_processing_message,
                            message,
                            self.processing_queue_url
                        )
                        futures.append(future)

                    # Wait for all processing messages to complete
                    for future in futures:
                        try:
                            future.result(timeout=300)  # 5 minute timeout
                        except Exception as e:
                            logger.error(f"Error in processing message: {e}")

                if not s3_messages and not processing_messages:
                    logger.debug("No messages available from either queue, continuing to poll...")

            except Exception as e:
                logger.error(f"Error polling SQS: {e}", exc_info=True)
                time.sleep(5)  # Wait before retrying

        logger.info("SQS polling stopped")
        self.executor.shutdown(wait=True)


def get_execution_mode() -> str:
    """Determine the execution mode based on environment."""
    return os.environ['APP_ENV_TYPE']  # Required - will raise KeyError if not set


def run_health_check_server():
    """Run a simple HTTP server for health checks (Production mode)."""
    from http.server import HTTPServer, BaseHTTPRequestHandler

    class HealthHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path == '/health':
                self.send_response(200)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(b'OK')
            else:
                self.send_response(404)
                self.end_headers()

        def log_message(self, format, *args):
            # Suppress access logs for health checks
            if '/health' not in args[0]:
                super().log_message(format, *args)

    server = HTTPServer(('0.0.0.0', 8080), HealthHandler)
    logger.info("Health check server running on port 8080")
    server.serve_forever()


def run_local_test():
    """Run a simple local test of the document processor."""
    logger.info("=" * 80)
    logger.info("LOCAL TEST MODE - Testing document processor")
    logger.info("=" * 80)

    # Get test parameters from environment - all required, will raise KeyError if not set
    try:
        bucket = os.environ['AWS_S3_BUCKET']
        file_path = os.environ['TEST_FILE_PATH']
        message_type = os.environ['TEST_MESSAGE_TYPE']
    except KeyError as e:
        logger.error(f"Required environment variable not set: {e}")
        raise

    logger.info(f"Test S3 Bucket: {bucket}")
    logger.info(f"Test File Path: {file_path}")
    logger.info(f"Test Message Type: {message_type}")
    logger.info("-" * 80)

    # Create test message body
    if message_type == 'ocr_process':
        # For ocr_process: needs simplified message with key only
        message_body = {
            'message_type': 'ocr_process',
            'key': file_path
        }
    elif message_type == 'ai_process':
        # For ai_process: needs resource_session_id
        try:
            session_id = os.environ['TEST_SESSION_ID']
        except KeyError:
            logger.error("TEST_SESSION_ID environment variable not set (required for ai_process message type)")
            raise
        logger.info(f"Test Session ID: {session_id}")
        message_body = {
            'message_type': 'ai_process',
            'resource_session_id': session_id
        }
    else:
        logger.error(f"Unknown message_type: {message_type}")
        return

    # Initialize the appropriate processor and run the test
    try:
        if message_type == 'ocr_process':
            processor = OCRProcessor()
            logger.info("OCR processor initialized successfully")
            result = processor.process(message_body)

            # If OCR succeeded and we want to continue to AI, we could do it here
            # For now, just report the OCR result
            if result.success:
                session_id = result.data.get('session_id')
                logger.info(f"OCR completed successfully. Session ID: {session_id}")
                logger.info("Note: In production, AI processing message would be sent to SQS")

        elif message_type == 'ai_process':
            processor = AIProcessor()
            logger.info("AI processor initialized successfully")
            result = processor.process(message_body)

            if result.success:
                questions_count = result.data.get('questions_count', 0)
                logger.info(f"AI processing completed. Generated {questions_count} questions")

        logger.info("=" * 80)
        logger.info("TEST RESULT:")
        logger.info(json.dumps(result.to_dict(), indent=2))
        logger.info("=" * 80)

        if result.success:
            logger.info("✓ Test PASSED")
        else:
            logger.error(f"✗ Test FAILED: {result.error}")
    except Exception as e:
        logger.error(f"✗ Test FAILED with exception: {e}", exc_info=True)


def main():
    """Main entry point for the application."""
    mode = get_execution_mode()
    logger.info(f"Starting application in {mode.upper()} mode")

    if mode == 'production':
        # SQS mode - long-running SQS processor for ECS deployment
        try:
            s3_events_queue_url = os.environ['S3_EVENTS_QUEUE_URL']
            processing_queue_url = os.environ['PROCESSING_QUEUE_URL']
            max_workers = int(os.environ['MAX_WORKERS'])
        except KeyError as e:
            logger.error(f"Required environment variable not set: {e}")
            sys.exit(1)

        logger.info(f"Starting SQS processor")
        logger.info(f"S3 Events Queue: {s3_events_queue_url}")
        logger.info(f"Processing Queue: {processing_queue_url}")

        # Start health check server in background for Production health checks
        import threading
        health_thread = threading.Thread(target=run_health_check_server, daemon=True)
        health_thread.start()

        # Start SQS processor
        processor = SQSProcessor(
            s3_events_queue_url=s3_events_queue_url,
            processing_queue_url=processing_queue_url,
            max_workers=max_workers
        )
        processor.poll_messages()

    else:
        # Local test mode - run a single test and exit
        run_local_test()

    logger.info("Application shutdown complete")


if __name__ == '__main__':
    main()