"""
Test script for topic identification.

This test allows you to test topic identification independently
without running the full Lambda pipeline.

Environment variables required:
- OPENAI_API_KEY
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- TEST_RESOURCE_SESSION_ID (UUID of existing resource session with OCR text)
"""
import os
import json
import time
import pytest

from supabase_client import (
    get_resource_session,
    save_topics_to_resource_session,
    create_resource_session_domains
)
from ai.topic_identifier import identify_document_topics


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
        pytest.skip(f"OCR file not found at: {ocr_file_path}")

    try:
        with open(ocr_file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        raise Exception(f"Failed to read local file: {e}")


@pytest.mark.ai
@pytest.mark.integration
@pytest.mark.slow
def test_topic_identification(supabase_client, test_resource_session_id):
    """
    Test topic identification for a document.

    Args:
        supabase_client: Supabase client fixture
        test_resource_session_id: Test resource session ID fixture
    """
    print("\n" + "=" * 70)
    print("TOPIC IDENTIFICATION TEST")
    print("=" * 70 + "\n")

    print(f"Testing with resource_session_id: {test_resource_session_id}\n")

    # Start timing
    start_time = time.perf_counter()

    # Fetch resource session
    print("Step 1: Fetching resource session...")
    resource_session = get_resource_session(supabase_client, test_resource_session_id)
    assert resource_session is not None, "Resource session not found"
    print(f"Found session: {resource_session['name']}")
    print(f"  Status: {resource_session.get('status', 'unknown')}\n")

    # Load OCR text
    print("Step 2: Loading OCR text from local filesystem...")
    ocr_text = load_ocr_text(resource_session)
    assert len(ocr_text) > 0, "OCR text is empty"
    print(f"Loaded {len(ocr_text):,} characters")
    print(f"  Preview: {ocr_text[:200]}...\n")

    # Identify topics
    print("Step 3: Identifying topics with OpenAI...")
    topics_map = identify_document_topics(ocr_text)
    assert topics_map is not None, "Failed to identify topics"
    assert 'topics' in topics_map, "Topics map missing 'topics' key"
    assert len(topics_map.get('topics', [])) > 0, "No topics identified"

    print(f"Identified {len(topics_map.get('topics', []))} topics")
    print(f"\nTopics identified:")
    print(json.dumps(topics_map, indent=2, ensure_ascii=False))
    print()

    # Save topics to database
    print("Step 4: Saving topics to resource_sessions.topic_page_range...")
    save_topics_to_resource_session(supabase_client, test_resource_session_id, topics_map)
    print("Topics saved\n")

    # Create domains
    print("Step 5: Creating resource_session_domains...")
    domain_mapping = create_resource_session_domains(supabase_client, test_resource_session_id, topics_map)
    assert domain_mapping is not None, "Failed to create domains"
    assert len(domain_mapping) > 0, "No domains created"

    print(f"Created {len(domain_mapping)} domains")
    print("\nDomain mapping:")
    for topic_name, domain_id in domain_mapping.items():
        print(f"  - {topic_name}: {domain_id}")
    print()

    # Calculate elapsed time
    elapsed_time = time.perf_counter() - start_time

    print("\n" + "=" * 70)
    print("TEST COMPLETED SUCCESSFULLY")
    print("=" * 70)
    print(f"Total time: {elapsed_time:.2f} seconds")
    print(f"Topics identified: {len(topics_map.get('topics', []))}")
    print(f"Domains created: {len(domain_mapping)}")
    print("=" * 70 + "\n")
