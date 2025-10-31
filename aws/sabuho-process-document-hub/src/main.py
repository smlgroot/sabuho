#!/usr/bin/env python3
"""
Main entry point for Sabuho Document Processing Hub.
Supports multiple execution modes: Lambda, ECS, and Local development.
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

# Import the existing lambda_function for backward compatibility
from lambda_function import lambda_handler

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
    """Process messages from SQS queue for ECS/Local mode."""

    def __init__(self, queue_url: str, max_workers: int = 4):
        self.queue_url = queue_url
        self.max_workers = max_workers
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.shutdown_handler = GracefulShutdown()

        # Configure boto3 client
        config = Config(
            region_name=os.environ.get('AWS_REGION', 'us-east-1'),
            retries={'max_attempts': 3, 'mode': 'adaptive'}
        )

        # Support LocalStack endpoint
        endpoint_url = os.environ.get('AWS_ENDPOINT_URL')
        self.sqs = boto3.client('sqs', config=config, endpoint_url=endpoint_url)

        logger.info(f"SQS Processor initialized for queue: {queue_url}")

    def process_message(self, message: Dict[str, Any]) -> bool:
        """Process a single SQS message. Always consumes the message (no retries)."""
        message_id = message.get('MessageId', 'unknown')

        try:
            # Convert SQS message to Lambda event format
            event = {
                'Records': [{
                    'body': message['Body'],
                    'receiptHandle': message['ReceiptHandle'],
                    'messageId': message_id,
                    'attributes': message.get('Attributes', {}),
                    'messageAttributes': message.get('MessageAttributes', {})
                }]
            }

            # Use the existing lambda handler
            context = type('Context', (), {
                'aws_request_id': message_id,
                'invoked_function_arn': 'arn:aws:lambda:local:000000000000:function:sabuho-processor',
                'get_remaining_time_in_millis': lambda: 300000  # 5 minutes
            })()

            logger.info(f"Processing message: {message_id}")
            result = lambda_handler(event, context)

            # Log the result
            result_body = json.loads(result.get('body', '{}'))
            if result_body.get('failed', 0) > 0:
                logger.warning(
                    f"Message processed with errors: {message_id} - "
                    f"Processed: {result_body.get('processed', 0)}, "
                    f"Failed: {result_body.get('failed', 0)}"
                )
                if result_body.get('errors'):
                    logger.error(f"Errors: {result_body['errors']}")
            else:
                logger.info(f"Successfully processed message: {message_id}")

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
    if os.environ.get('AWS_LAMBDA_FUNCTION_NAME'):
        return 'lambda'
    elif os.environ.get('SQS_QUEUE_URL'):
        return 'sqs'
    elif os.environ.get('ENV') == 'local':
        return 'local'
    else:
        return 'lambda'


def run_health_check_server():
    """Run a simple HTTP server for health checks (ECS)."""
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

    # Create mock context
    context = type('Context', (), {
        'aws_request_id': 'local-test-request',
        'invoked_function_arn': 'arn:aws:lambda:local:000000000000:function:sabuho-processor',
        'get_remaining_time_in_millis': lambda: 300000
    })()

    # Get test parameters from environment, no defaults; return if any are not set
    bucket = os.environ.get('AWS_S3_BUCKET')
    if not bucket:
        logger.error("AWS_S3_BUCKET environment variable not set. Exiting test.")
        return

    file_path = os.environ.get('TEST_FILE_PATH')
    if not file_path:
        logger.error("TEST_FILE_PATH environment variable not set. Exiting test.")
        return

    message_type = os.environ.get('TEST_MESSAGE_TYPE')
    if not message_type:
        logger.error("TEST_MESSAGE_TYPE environment variable not set. Exiting test.")
        return

    

    logger.info(f"Test S3 Bucket: {bucket}")
    logger.info(f"Test File Path: {file_path}")
    logger.info(f"Test Message Type: {message_type}")
    logger.info("-" * 80)

    # Create test event in the format expected by lambda_handler
    # For ocr_process: needs S3 event structure
    if message_type == 'ocr_process':
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
        session_id = os.environ.get('TEST_SESSION_ID')
        if not session_id:
            logger.error("TEST_SESSION_ID environment variable not set. Exiting test.")
            return
        logger.info(f"Test Session ID: {session_id}")
        message_body = {
            'message_type': 'ai_process',
            'resource_session_id': session_id
        }
    else:
        logger.error(f"Unknown message_type: {message_type}")
        return

    event = {
        'Records': [{
            'body': json.dumps(message_body),
            'receiptHandle': 'local-test-receipt',
            'messageId': 'local-test-msg-001'
        }]
    }

    # Run the lambda handler
    try:
        result = lambda_handler(event, context)
        logger.info("=" * 80)
        logger.info("TEST RESULT:")
        logger.info(json.dumps(result, indent=2))
        logger.info("=" * 80)

        if result.get('statusCode') == 200:
            logger.info("✓ Test PASSED")
        else:
            logger.error("✗ Test FAILED")
    except Exception as e:
        logger.error(f"✗ Test FAILED with exception: {e}", exc_info=True)


def main():
    """Main entry point for the application."""
    mode = get_execution_mode()
    logger.info(f"Starting application in {mode.upper()} mode")

    if mode == 'lambda':
        # Lambda mode is handled by the Lambda runtime
        logger.info("Running in Lambda mode - handler will be called by runtime")
        # The lambda_handler will be called directly by AWS Lambda

    elif mode == 'sqs':
        # SQS mode - long-running SQS processor (for ECS or local development)
        queue_url = os.environ.get('SQS_QUEUE_URL')
        if not queue_url:
            logger.error("SQS_QUEUE_URL not set")
            sys.exit(1)

        logger.info(f"Starting SQS processor for queue: {queue_url}")

        # Start health check server in background (useful for ECS)
        import threading
        health_thread = threading.Thread(target=run_health_check_server, daemon=True)
        health_thread.start()

        # Start SQS processor
        processor = SQSProcessor(
            queue_url=queue_url,
            max_workers=int(os.environ.get('MAX_WORKERS', '4'))
        )
        processor.poll_messages()

    elif mode == 'local':
        # Local test mode - run a single test and exit
        run_local_test()

    logger.info("Application shutdown complete")


if __name__ == '__main__':
    main()