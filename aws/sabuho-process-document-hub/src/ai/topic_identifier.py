"""
Topic identification module - identifies document topics and their page ranges.
This module uses structure-based analysis using font formatting markers.
"""
from ai.structure_topic_identifier import identify_topics_structure


def identify_document_topics(text: str, progress_callback) -> dict:
    """
    Identify topics and their page ranges in a document.

    This is the main entry point for topic identification.
    It can be tested independently without the full Lambda context.

    Uses structure-based analysis that:
    - Extracts header markers from OCR text
    - Analyzes font sizes to determine heading hierarchy
    - Uses bold markers as secondary signals
    - Creates topics from top-level headers

    This approach is inspired by pdf.tocgen and TSHD algorithms (96%+ accuracy).

    Args:
        text: Full document text with page markers (e.g., "--- Page 1 ---")
              and header markers (e.g., "### [HEADER, SIZE=14pt] Title")
        progress_callback: Callback function(stage, current, total, metadata) to report progress

    Returns:
        Dict with format: {"topics": [{"name": "...", "start": 1, "end": 5}, ...]}

    Example:
        >>> text = "--- Page 1 ---\\n### [HEADER, SIZE=18pt] Introduction\\n...\\n--- Page 2 ---\\n..."
        >>> result = identify_document_topics(text, callback)
        >>> print(result)
        {"topics": [{"name": "Introduction", "start": 1, "end": 5}, ...]}
    """
    print("Starting structure-based topic identification...")

    # Use structure-based approach (fast, reliable, based on formatting)
    topics_map = identify_topics_structure(text)

    print(f"Identified {len(topics_map.get('topics', []))} topics")

    # Report completion
    progress_callback('ai_topics_identified', 1, 1)

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
