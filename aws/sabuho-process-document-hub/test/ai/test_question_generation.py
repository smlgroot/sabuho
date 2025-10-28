"""
Test script for question generation only.

This script allows you to test question generation independently.
It assumes topics and domains have already been created.

Usage:
1. Set environment variables:
   - OPENAI_API_KEY
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
   - TEST_RESOURCE_SESSION_ID (UUID of resource session with topics/domains)

2. Run: python test_question_generation.py
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
    get_resource_session_domains,
    save_questions_to_db,
    update_resource_session_status
)
from question_generator import generate_questions_for_topics
from text_processor import extract_topic_texts


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
    print("QUESTION GENERATION TEST")
    print("="*70 + "\n")

    # Get test session ID from environment
    session_id = os.getenv('TEST_RESOURCE_SESSION_ID')
    if not session_id:
        print("Error: TEST_RESOURCE_SESSION_ID environment variable not set")
        print("Please set it to a valid resource_session UUID with existing domains")
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

        # Check for topics
        topics_map = resource_session.get('topic_page_range')
        if not topics_map or 'topics' not in topics_map:
            print("✗ Error: Resource session has no topics!")
            print("  Please run test_topic_identification.py first")
            return

        print(f"✓ Found {len(topics_map['topics'])} topics in session\n")

        # Fetch domains
        print("Step 2: Fetching resource_session_domains...")
        domains = get_resource_session_domains(supabase, session_id)
        if not domains:
            print("✗ Error: No resource_session_domains found!")
            print("  Please run test_topic_identification.py first")
            return

        print(f"✓ Found {len(domains)} domains")

        # Create domain mapping
        domain_mapping = {domain['name']: domain['id'] for domain in domains}
        print("\nDomain mapping:")
        for name, domain_id in domain_mapping.items():
            print(f"  - {name}: {domain_id}")
        print()

        # Load OCR text
        print("Step 3: Loading OCR text from local filesystem...")
        ocr_text = load_ocr_text(resource_session)
        print(f"✓ Loaded {len(ocr_text):,} characters\n")

        # Extract topic texts
        print("Step 4: Extracting text for each topic...")
        topic_texts = extract_topic_texts(ocr_text, topics_map)
        print(f"✓ Extracted text for {len(topic_texts)} topics")

        # Show preview of extracted topics
        print("\nTopic text preview:")
        for topic in topic_texts[:3]:  # Show first 3 topics
            print(f"  - {topic['name']} (pages {topic['start']}-{topic['end']}): {len(topic['text'])} chars")
        if len(topic_texts) > 3:
            print(f"  ... and {len(topic_texts) - 3} more topics")
        print()

        # Generate questions
        print("Step 5: Generating quiz questions with OpenAI...")
        print("(This may take a while depending on document length...)\n")
        questions = generate_questions_for_topics(topic_texts, domain_mapping)
        print(f"\n✓ Generated {len(questions)} questions")

        # Show sample questions
        print("\nSample questions generated:")
        for i, q in enumerate(questions[:3], 1):  # Show first 3 questions
            print(f"\n  Question {i}:")
            print(f"    Topic: {q.get('topic_name', 'Unknown')}")
            print(f"    Q: {q['question']}")
            print(f"    Options: {q['options']}")
            print(f"    Correct: {q['options'][q['correct_answer_index']]}")
        if len(questions) > 3:
            print(f"\n  ... and {len(questions) - 3} more questions")
        print()

        # Save questions to database
        print("Step 6: Saving questions to database...")
        save_questions_to_db(supabase, questions, session_id)
        print("✓ Questions saved\n")

        # Update status (optional)
        # Uncomment if you want to update status during test
        # print("Step 7: Updating status to 'completed'...")
        # update_resource_session_status(supabase, session_id, 'completed')
        # print("✓ Status updated\n")

        # Calculate elapsed time
        elapsed_time = time.perf_counter() - start_time

        print("\n" + "="*70)
        print("TEST COMPLETED SUCCESSFULLY")
        print("="*70)
        print(f"Total time: {elapsed_time:.2f} seconds")
        print(f"Topics processed: {len(topic_texts)}")
        print(f"Questions generated: {len(questions)}")
        print(f"Questions saved to database: {len(questions)}")
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
