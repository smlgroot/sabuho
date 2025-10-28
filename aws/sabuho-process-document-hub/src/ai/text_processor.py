"""
Text processing utilities for extracting topic texts and creating batches.
"""
import re
import tiktoken


def extract_topic_texts(full_text: str, topics_map: dict) -> list:
    """
    Extract text for each topic based on page ranges.

    Args:
        full_text: The full OCR text with page markers (e.g., "--- Page 1 ---")
        topics_map: Dict with format {"topics": [{"name": "...", "start": 1, "end": 5}, ...]}

    Returns:
        List of dicts: [{"name": "Topic Name", "text": "...", "start": 1, "end": 5}, ...]
    """
    topics = topics_map.get('topics', [])
    if not topics:
        print("Warning: No topics found in topics_map")
        return []

    # Parse the text into pages
    pages = _parse_text_into_pages(full_text)

    topic_texts = []
    for topic in topics:
        name = topic['name']
        start_page = topic['start']
        end_page = topic['end']

        # Extract text for this page range
        topic_text = _extract_pages_text(pages, start_page, end_page)

        topic_texts.append({
            'name': name,
            'text': topic_text,
            'start': start_page,
            'end': end_page
        })

    return topic_texts


def _parse_text_into_pages(full_text: str) -> dict:
    """
    Parse full text into a dictionary mapping page numbers to text content.

    Args:
        full_text: Text with page markers like "--- Page 1 ---"

    Returns:
        Dict mapping page number to text: {1: "page 1 content", 2: "page 2 content", ...}
    """
    pages = {}

    # Split by page markers
    page_pattern = r'--- Page (\d+) ---'
    parts = re.split(page_pattern, full_text)

    # parts[0] is text before first page marker (usually empty)
    # parts[1] is page number, parts[2] is content, parts[3] is next page number, etc.
    for i in range(1, len(parts), 2):
        if i + 1 < len(parts):
            page_num = int(parts[i])
            page_content = parts[i + 1].strip()
            pages[page_num] = page_content

    return pages


def _extract_pages_text(pages: dict, start_page: int, end_page: int) -> str:
    """
    Extract concatenated text from a range of pages.

    Args:
        pages: Dict mapping page numbers to text content
        start_page: Starting page number (inclusive)
        end_page: Ending page number (inclusive)

    Returns:
        Concatenated text from the page range
    """
    texts = []
    for page_num in range(start_page, end_page + 1):
        if page_num in pages:
            texts.append(pages[page_num])

    return '\n\n'.join(texts)


def create_batches(topic_texts: list, max_tokens: int = 16385) -> list:
    """
    Create batches of topics that fit within token limits.

    Args:
        topic_texts: List of topic dicts with 'name' and 'text' keys
        max_tokens: Maximum tokens per batch (default: 16385 for gpt-4o-mini)

    Returns:
        List of batches, each containing list of topic dicts
    """
    encoding = tiktoken.encoding_for_model("gpt-4o-mini")

    batches = []
    current_batch = []
    current_token_count = 0

    # Reserve tokens for system prompt and response
    reserved_tokens = 2000
    effective_max = max_tokens - reserved_tokens

    for topic in topic_texts:
        topic_text = topic['text']
        topic_name = topic['name']

        # Count tokens for this topic (include name in the count)
        combined_text = f"{topic_name}\n{topic_text}"
        topic_tokens = len(encoding.encode(combined_text))

        # Check if adding this topic would exceed the limit
        if current_token_count + topic_tokens > effective_max:
            # Save current batch if it has content
            if current_batch:
                batches.append(current_batch)

            # Start new batch with this topic
            current_batch = [topic]
            current_token_count = topic_tokens
        else:
            # Add to current batch
            current_batch.append(topic)
            current_token_count += topic_tokens

    # Add remaining batch
    if current_batch:
        batches.append(current_batch)

    return batches


def count_tokens(text: str) -> int:
    """
    Count the number of tokens in a text string.

    Args:
        text: Text to count tokens for

    Returns:
        Number of tokens
    """
    encoding = tiktoken.encoding_for_model("gpt-4o-mini")
    return len(encoding.encode(text))


def format_batch_content(batch: list) -> str:
    """
    Format a batch of topics into a single text string for OpenAI.

    Args:
        batch: List of topic dicts with 'name' and 'text' keys

    Returns:
        Formatted string with all topics
    """
    parts = []
    for topic in batch:
        parts.append(f"--- Topic: {topic['name']} ---")
        parts.append(topic['text'])
        parts.append("")  # Empty line between topics

    return '\n'.join(parts)
