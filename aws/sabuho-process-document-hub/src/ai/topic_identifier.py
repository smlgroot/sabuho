"""
Topic identification module - identifies document topics and their page ranges.
This module is designed to be testable independently.
"""
from openai_client import create_openai_client, call_openai_for_topics


def identify_document_topics(text: str) -> dict:
    """
    Identify topics and their page ranges in a document.

    This is the main entry point for topic identification.
    It can be tested independently without the full Lambda context.

    Args:
        text: Full document text with page markers (e.g., "--- Page 1 ---")

    Returns:
        Dict with format: {"topics": [{"name": "...", "start": 1, "end": 5}, ...]}

    Raises:
        Exception: If OpenAI client creation or API call fails

    Example:
        >>> text = "--- Page 1 ---\\nIntroduction...\\n--- Page 2 ---\\nChapter 1..."
        >>> result = identify_document_topics(text)
        >>> print(result)
        {"topics": [{"name": "Introduction", "start": 1, "end": 1}, ...]}
    """
    print("Starting topic identification...")

    # Create OpenAI client
    client = create_openai_client()

    # Call OpenAI to identify topics
    topics_map = call_openai_for_topics(client, text)

    print(f"Identified {len(topics_map.get('topics', []))} topics")

    return topics_map


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
