#!/usr/bin/env python3
"""
Main entry point for Sabuho Document Processing Hub.
Supports two execution modes:
1. Production SQS Mode - Long-running SQS processor for ECS deployment
2. Development Local Mode - Single test execution for local development
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
    level=os.environ.get('LOG_LEVEL') or 'INFO',  # Allow LOG_LEVEL to be optional for logging convenience
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

        self.sqs = boto3.client('sqs', config=config)

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

    # Create mock context
    context = type('Context', (), {
        'aws_request_id': 'local-test-request',
        'invoked_function_arn': 'arn:aws:lambda:local:000000000000:function:sabuho-processor',
        'get_remaining_time_in_millis': lambda: 300000
    })()

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