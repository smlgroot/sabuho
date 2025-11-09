"""
Topic identification module - identifies document topics and their page ranges.
This module tries table of contents (TOC) parsing first, then falls back to
LLM-based semantic analysis if no TOC is found.
"""
import re
from ai.toc_detector import detect_toc_probabilistic
from ai.llm_topic_identifier import identify_topics_with_llm_chunked
from ai.openai_client import create_openai_client


def identify_document_topics(text: str, progress_callback) -> dict:
    """
    Identify topics and their page ranges in a document.

    This is the main entry point for topic identification.
    It can be tested independently without the full Lambda context.

    Strategy (in order):
    1. Try to detect and parse table of contents (ÍNDICE) - FAST, no API cost
    2. If no TOC found, use LLM-based semantic analysis - slower but reliable

    Args:
        text: Full document text with page markers (e.g., "--- Page 1 ---")
              and enhanced header markers (e.g., "### [HEADER, SIZE=14pt, BOLD, TOP] Title")
        progress_callback: Callback function(stage, current, total, metadata) to report progress

    Returns:
        Dict with format: {"topics": [{"name": "...", "start": 1, "end": 5}, ...]}

    Example:
        >>> text = "--- Page 1 ---\\n### [HEADER, SIZE=18pt, BOLD, TOP] Introduction\\n...\\n--- Page 2 ---\\n..."
        >>> result = identify_document_topics(text, callback)
        >>> print(result)
        {"topics": [{"name": "Introduction", "start": 1, "end": 5}, ...]}
    """
    print("Starting topic identification...")

    # Count total pages in the document
    total_pages = _count_pages(text)
    print(f"Document has {total_pages} pages")

    # STRATEGY 1: Try probabilistic TOC detection first (fast, free, format-agnostic)
    print("\n[Strategy 1] Attempting probabilistic table of contents (TOC) detection...")
    topics_map = detect_toc_probabilistic(text, total_pages)

    if topics_map and len(topics_map.get('topics', [])) >= 3:
        print(f"✓ Successfully extracted {len(topics_map['topics'])} topics from TOC (0 API calls)")
        print("  Skipping LLM analysis")
        progress_callback('ai_topics_identified', 1, 1)
        return topics_map

    # STRATEGY 2: Fall back to LLM if no TOC found
    print("\n[Strategy 2] No valid TOC found, using LLM-based semantic analysis...")

    # Create OpenAI client
    client = create_openai_client()

    # Use LLM-based approach with chunked processing for large documents
    # This intelligently handles multi-page topics and semantic understanding
    # Using smaller chunk_size=30 for faster processing
    topics_list = identify_topics_with_llm_chunked(client, text, total_pages, chunk_size=30)

    # Convert to the expected format
    topics_map = {"topics": topics_list}

    print(f"✓ Identified {len(topics_list)} topics using LLM")

    # Report completion
    progress_callback('ai_topics_identified', 1, 1)

    return topics_map


def _count_pages(text: str) -> int:
    """
    Count the number of pages in the document based on page markers.

    Args:
        text: OCR text with page markers (e.g., "--- Page 1 ---")

    Returns:
        Total number of pages
    """
    # Find all page markers like "--- Page 5 ---"
    page_matches = re.findall(r'--- Page (\d+) ---', text)

    if not page_matches:
        # No page markers found, assume single page
        return 1

    # Return the highest page number found
    page_numbers = [int(num) for num in page_matches]
    return max(page_numbers)


def validate_topics_map(topics_map: dict) -> bool:
    """
    Validate that a topics map has the correct structure.

    Args:
        topics_map: Topics map to validate

    Returns:
        True if valid, False otherwise
    """
    if not isinstance(topics_map, dict):
        return False

    if 'topics' not in topics_map:
        return False

    if not isinstance(topics_map['topics'], list):
        return False

    for topic in topics_map['topics']:
        if not isinstance(topic, dict):
            return False

        required_keys = ['name', 'start', 'end']
        for key in required_keys:
            if key not in topic:
                return False

        # Validate types
        if not isinstance(topic['name'], str):
            return False
        if not isinstance(topic['start'], int):
            return False
        if not isinstance(topic['end'], int):
            return False

        # Validate logic
        if topic['start'] > topic['end']:
            return False
        if topic['start'] < 1:
            return False

    return True
