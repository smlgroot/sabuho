"""
Test script for topic identification only.

This script allows you to test topic identification independently
without running the full Lambda pipeline.

Usage:
1. Set environment variables:
   - OPENAI_API_KEY
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
   - TEST_RESOURCE_SESSION_ID (UUID of existing resource session with OCR text)

2. Run: python test_topic_identification.py
"""
import sys
import os
import json
import time
import traceback

# Add src directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from supabase_client import (
    get_supabase_client,
    get_resource_session,
    update_resource_session_status,
    save_topics_to_resource_session,
    create_resource_session_domains
)
from topic_identifier import identify_document_topics


def load_ocr_text(resource_session: dict) -> str:
    """
    Load OCR text from local filesystem.
    For test script - handles local file paths from Supabase.

    Args:
        resource_session: Resource session dict with file_path

    Returns:
        OCR text content as string
    """
    file_path = resource_session.get('file_path')
    if not file_path:
        raise Exception("Resource session has no file_path")

    # Convert .pdf to .ocr.txt
    if not file_path.endswith('.ocr.txt'):
        ocr_file_path = file_path.replace('.pdf', '.pdf.ocr.txt')
    else:
        ocr_file_path = file_path

    print(f"Reading from local filesystem: {ocr_file_path}")

    if not os.path.exists(ocr_file_path):
        raise Exception(f"OCR file not found at: {ocr_file_path}")

    try:
        with open(ocr_file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        raise Exception(f"Failed to read local file: {e}")


def main():
    """Main test function."""
    print("\n" + "="*70)
    print("TOPIC IDENTIFICATION TEST")
    print("="*70 + "\n")

    # Get test session ID from environment
    session_id = os.getenv('TEST_RESOURCE_SESSION_ID')
    if not session_id:
        print("Error: TEST_RESOURCE_SESSION_ID environment variable not set")
        print("Please set it to a valid resource_session UUID")
        return

    print(f"Testing with resource_session_id: {session_id}\n")

    # Initialize Supabase client
    print("Initializing Supabase client...")
    try:
        supabase = get_supabase_client()
        print("✓ Supabase client initialized\n")
    except Exception as e:
        print(f"✗ Failed to initialize Supabase: {e}")
        return

    # Start timing
    start_time = time.perf_counter()

    try:
        # Fetch resource session
        print("Step 1: Fetching resource session...")
        resource_session = get_resource_session(supabase, session_id)
        print(f"✓ Found session: {resource_session['name']}")
        print(f"  Status: {resource_session.get('status', 'unknown')}\n")

        # Load OCR text
        print("Step 2: Loading OCR text from local filesystem...")
        ocr_text = load_ocr_text(resource_session)
        print(f"✓ Loaded {len(ocr_text):,} characters")
        print(f"  Preview: {ocr_text[:200]}...\n")

        # Identify topics
        print("Step 3: Identifying topics with OpenAI...")
        topics_map = identify_document_topics(ocr_text)
        print(f"✓ Identified {len(topics_map.get('topics', []))} topics")
        print(f"\nTopics identified:")
        print(json.dumps(topics_map, indent=2, ensure_ascii=False))
        print()

        # Save topics to database
        print("Step 4: Saving topics to resource_sessions.topic_page_range...")
        save_topics_to_resource_session(supabase, session_id, topics_map)
        print("✓ Topics saved\n")

        # Create domains
        print("Step 5: Creating resource_session_domains...")
        domain_mapping = create_resource_session_domains(supabase, session_id, topics_map)
        print(f"✓ Created {len(domain_mapping)} domains")
        print("\nDomain mapping:")
        for topic_name, domain_id in domain_mapping.items():
            print(f"  - {topic_name}: {domain_id}")
        print()

        # Update status (optional - for testing only)
        # Uncomment if you want to update status during test
        # print("Step 6: Updating status to 'ai_processing'...")
        # update_resource_session_status(supabase, session_id, 'ai_processing')
        # print("✓ Status updated\n")

        # Calculate elapsed time
        elapsed_time = time.perf_counter() - start_time

        print("\n" + "="*70)
        print("TEST COMPLETED SUCCESSFULLY")
        print("="*70)
        print(f"Total time: {elapsed_time:.2f} seconds")
        print(f"Topics identified: {len(topics_map.get('topics', []))}")
        print(f"Domains created: {len(domain_mapping)}")
        print("="*70 + "\n")

    except Exception as error:
        error_trace = traceback.format_exc()
        print("\n" + "="*70)
        print("TEST FAILED")
        print("="*70)
        print(f"Error: {error}")
        print(f"\nFull traceback:\n{error_trace}")
        print("="*70 + "\n")


if __name__ == '__main__':
    main()
