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

    def __init__(self, queue_url: str, max_workers: int = 4):
        self.queue_url = queue_url
        self.max_workers = max_workers
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.shutdown_handler = GracefulShutdown()

        # Configure boto3 client
        aws_region = os.environ['AWS_REGION']  # Required - will raise KeyError if not set
        config = Config(
            region_name=aws_region,
            retries={'max_attempts': 3, 'mode': 'adaptive'}
        )

        # Support LocalStack endpoint (optional)
        endpoint_url = os.environ.get('AWS_ENDPOINT_URL')
        self.sqs = boto3.client('sqs', config=config, endpoint_url=endpoint_url)

        # Get output queue URL for routing messages between OCR and AI
        self.output_queue_url = os.environ['OUTPUT_QUEUE_URL']  # Required - will raise KeyError if not set

        # Initialize the document processors
        self.ocr_processor = OCRProcessor()
        self.ai_processor = AIProcessor()

        logger.info(f"SQS Processor initialized for queue: {queue_url}")
        logger.info(f"Output queue URL: {self.output_queue_url}")

    def _send_ai_message(self, session_id: str):
        """
        Send AI processing message to output queue.

        Args:
            session_id: Resource session ID to process
        """
        try:
            ai_message = {
                'message_type': 'ai_process',
                'resource_session_id': session_id
            }

            logger.info(f"Sending AI processing message for session {session_id} to queue: {self.output_queue_url}")
            self.sqs.send_message(
                QueueUrl=self.output_queue_url,
                MessageBody=json.dumps(ai_message)
            )
            logger.debug(f"AI message sent successfully for session {session_id}")
        except Exception as e:
            logger.error(f"Failed to send AI message for session {session_id}: {e}", exc_info=True)
            raise

    def process_message(self, message: Dict[str, Any]) -> bool:
        """Process a single SQS message. Always consumes the message (no retries)."""
        message_id = message.get('MessageId', 'unknown')

        try:
            # Parse the message body
            message_body = json.loads(message['Body'])
            message_type = message_body.get('message_type')

            if not message_type:
                logger.error(f"No message_type in message: {message_id}")
                return True

            logger.info(f"Processing message: {message_id} - Type: {message_type}")

            # Route to appropriate processor based on message_type
            if message_type == 'ocr_process':
                result = self.ocr_processor.process(message_body)

                # If OCR succeeded, send AI processing message to output queue
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
            logger.error(f"Failed to parse message body for {message_id}: {e}", exc_info=True)
        except Exception as e:
            logger.error(f"Error processing message {message_id}: {e}", exc_info=True)

        finally:
            # Always delete message (no retries) regardless of processing result
            try:
                self.sqs.delete_message(
                    QueueUrl=self.queue_url,
                    ReceiptHandle=message['ReceiptHandle']
                )
                logger.debug(f"Deleted message from queue: {message_id}")
            except Exception as delete_error:
                logger.error(f"Failed to delete message {message_id}: {delete_error}")
                return False

        return True

    def poll_messages(self):
        """Poll SQS queue for messages."""
        logger.info("Starting SQS polling...")

        while not self.shutdown_handler.is_shutdown_requested():
            try:
                # Long polling for messages
                response = self.sqs.receive_message(
                    QueueUrl=self.queue_url,
                    MaxNumberOfMessages=min(10, self.max_workers),
                    WaitTimeSeconds=20,  # Long polling
                    VisibilityTimeout=300,  # 5 minutes
                    AttributeNames=['All'],
                    MessageAttributeNames=['All']
                )

                messages = response.get('Messages', [])

                if messages:
                    logger.info(f"Received {len(messages)} messages from SQS")

                    # Process messages in parallel
                    futures = []
                    for message in messages:
                        future = self.executor.submit(self.process_message, message)
                        futures.append(future)

                    # Wait for all messages to be processed
                    for future in futures:
                        try:
                            future.result(timeout=300)  # 5 minute timeout
                        except Exception as e:
                            logger.error(f"Error in message processing: {e}")
                else:
                    logger.debug("No messages available, continuing to poll...")

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
        # For ocr_process: needs S3 event structure
        message_body = {
            'message_type': 'ocr_process',
            'Records': [{
                's3': {
                    'bucket': {'name': bucket},
                    'object': {'key': file_path}
                }
            }]
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
            queue_url = os.environ['SQS_QUEUE_URL']
            max_workers = int(os.environ['MAX_WORKERS'])
        except KeyError as e:
            logger.error(f"Required environment variable not set: {e}")
            sys.exit(1)

        logger.info(f"Starting SQS processor for queue: {queue_url}")

        # Start health check server in background for Production health checks
        import threading
        health_thread = threading.Thread(target=run_health_check_server, daemon=True)
        health_thread.start()

        # Start SQS processor
        processor = SQSProcessor(
            queue_url=queue_url,
            max_workers=max_workers
        )
        processor.poll_messages()

    else:
        # Local test mode - run a single test and exit
        run_local_test()

    logger.info("Application shutdown complete")


if __name__ == '__main__':
    main()