"""
Topic identification module - identifies document topics and their page ranges.
This module is designed to be testable independently.
"""
import re
from ai.openai_client import create_openai_client, call_openai_for_topics


# Configuration for chunking
# gpt-3.5-turbo has 16k token context limit
# Conservative estimate: 1 token ≈ 4 chars, leaving room for prompts and response
# 16k tokens total - 2k for system/user prompts - 4k for response = 10k tokens available
MAX_CHARS_PER_CHUNK = 40000  # ~10k tokens for gpt-3.5-turbo (safe limit)
OVERLAP_PAGES = 3  # Pages to overlap between chunks for continuity


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

    # Check if we need to chunk the document
    if len(text) <= MAX_CHARS_PER_CHUNK:
        # Process in one go
        print(f"Document size: {len(text)} chars - processing in single pass")
        topics_map = call_openai_for_topics(client, text)
    else:
        # Process in overlapping chunks
        print(f"Document size: {len(text)} chars - processing in chunks")
        chunks = _create_overlapping_chunks(text, MAX_CHARS_PER_CHUNK, OVERLAP_PAGES)
        print(f"Created {len(chunks)} overlapping chunks")

        # Process each chunk
        all_topics = []
        for i, chunk_info in enumerate(chunks):
            print(f"Processing chunk {i+1}/{len(chunks)} (pages {chunk_info['start_page']}-{chunk_info['end_page']})")
            chunk_result = call_openai_for_topics(client, chunk_info['text'])

            # Adjust page numbers to absolute positions
            for topic in chunk_result.get('topics', []):
                topic['start'] += chunk_info['start_page'] - 1
                topic['end'] += chunk_info['start_page'] - 1

            all_topics.extend(chunk_result.get('topics', []))

        # Merge overlapping topics
        merged_topics = _merge_overlapping_topics(all_topics)
        print(f"Merged {len(all_topics)} chunk topics into {len(merged_topics)} final topics")
        topics_map = {"topics": merged_topics}

    print(f"Identified {len(topics_map.get('topics', []))} topics")

    return topics_map


def _create_overlapping_chunks(text: str, max_chars: int, overlap_pages: int) -> list:
    """
    Split text into overlapping chunks by page markers.

    Args:
        text: Full document text with page markers
        max_chars: Maximum characters per chunk
        overlap_pages: Number of pages to overlap between chunks

    Returns:
        List of chunk dicts: [{"text": "...", "start_page": 1, "end_page": 20}, ...]
    """
    # Find all page markers
    page_pattern = r'--- Page (\d+) ---'
    pages = []
    current_pos = 0

    for match in re.finditer(page_pattern, text):
        page_num = int(match.group(1))
        if pages:
            # Store previous page's content
            pages[-1]['text'] = text[current_pos:match.start()]
        pages.append({'page': page_num, 'start_pos': match.start()})
        current_pos = match.start()

    # Add last page
    if pages:
        pages[-1]['text'] = text[current_pos:]

    if not pages:
        # No page markers found, treat as single chunk
        return [{"text": text, "start_page": 1, "end_page": 1}]

    # Create chunks
    chunks = []
    chunk_start_idx = 0

    while chunk_start_idx < len(pages):
        # Build chunk starting from chunk_start_idx
        chunk_text = ""
        chunk_end_idx = chunk_start_idx

        for idx in range(chunk_start_idx, len(pages)):
            page_text = pages[idx]['text']
            if len(chunk_text) + len(page_text) > max_chars and idx > chunk_start_idx:
                # Chunk is full
                chunk_end_idx = idx - 1
                break
            chunk_text += page_text
            chunk_end_idx = idx
        else:
            # Reached end of document
            chunk_end_idx = len(pages) - 1

        chunks.append({
            "text": chunk_text,
            "start_page": pages[chunk_start_idx]['page'],
            "end_page": pages[chunk_end_idx]['page']
        })

        # Move to next chunk with overlap
        chunk_start_idx = max(chunk_start_idx + 1, chunk_end_idx - overlap_pages + 1)

        # Break if we've covered the whole document
        if chunk_end_idx == len(pages) - 1:
            break

    return chunks


def _merge_overlapping_topics(topics: list) -> list:
    """
    Merge topics that appear in overlapping chunks.

    Strategy:
    1. Sort topics by start page
    2. Merge topics with similar names and overlapping page ranges
    3. Extend page ranges to cover all occurrences

    Args:
        topics: List of topic dicts from different chunks

    Returns:
        Merged list of topics
    """
    if not topics:
        return []

    # Sort by start page
    sorted_topics = sorted(topics, key=lambda t: t['start'])

    merged = []
    current = sorted_topics[0].copy()

    for topic in sorted_topics[1:]:
        # Check if this topic should be merged with current
        if _should_merge_topics(current, topic):
            # Extend the current topic's range
            current['end'] = max(current['end'], topic['end'])
            current['start'] = min(current['start'], topic['start'])
        else:
            # Save current and start a new one
            merged.append(current)
            current = topic.copy()

    # Add the last topic
    merged.append(current)

    return merged


def _should_merge_topics(topic1: dict, topic2: dict) -> bool:
    """
    Determine if two topics should be merged.

    Criteria:
    - Similar names (fuzzy match)
    - Overlapping or adjacent page ranges

    Args:
        topic1: First topic dict
        topic2: Second topic dict

    Returns:
        True if topics should be merged
    """
    # Check name similarity (simple lowercase comparison)
    name1 = topic1['name'].lower().strip()
    name2 = topic2['name'].lower().strip()

    # Exact match or one contains the other
    names_similar = (
        name1 == name2 or
        name1 in name2 or
        name2 in name1 or
        _name_similarity_score(name1, name2) > 0.7
    )

    # Check if page ranges overlap or are adjacent
    ranges_overlap = not (
        topic1['end'] < topic2['start'] - 2 or  # Allow 1-page gap
        topic2['end'] < topic1['start'] - 2
    )

    return names_similar and ranges_overlap


def _name_similarity_score(name1: str, name2: str) -> float:
    """
    Calculate similarity score between two topic names.

    Uses word overlap as a simple metric.

    Args:
        name1: First topic name
        name2: Second topic name

    Returns:
        Similarity score between 0.0 and 1.0
    """
    words1 = set(name1.split())
    words2 = set(name2.split())

    if not words1 or not words2:
        return 0.0

    intersection = words1 & words2
    union = words1 | words2

    return len(intersection) / len(union) if union else 0.0


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
