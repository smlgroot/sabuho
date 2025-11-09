"""
LLM-based topic identification using OpenAI for semantic understanding.

This module uses GPT models to intelligently identify document topics by analyzing:
- Header text content and semantic meaning
- Font size, bold, position, and other styling metadata
- Context and relationships between headers
- Topics that span multiple pages

Unlike structure-based approaches, this can understand:
- Synonymous or related topics across pages
- Hierarchical topic relationships
- Semantic topic boundaries (not just font-based)
"""
import json
import re
from typing import List, Dict
from openai import OpenAI


def identify_topics_with_llm(client: OpenAI, ocr_text: str, total_pages: int) -> List[Dict]:
    """
    Use OpenAI to identify topics from OCR text with header markers.

    This approach is more reliable than structure-based detection because:
    1. Understands semantic meaning of headers
    2. Can identify topics that span multiple pages
    3. Handles inconsistent formatting better
    4. Understands topic hierarchy and relationships

    Args:
        client: OpenAI client instance
        ocr_text: OCR text with enhanced header markers
        total_pages: Total number of pages in document

    Returns:
        List of topic dicts with format:
        [
            {"name": "Topic Name", "start": 1, "end": 5},
            {"name": "Another Topic", "start": 6, "end": 10},
            ...
        ]

    Raises:
        Exception: If OpenAI API call fails or returns invalid structure
    """

    # Extract just the headers and page markers for more efficient processing
    # This reduces token usage while keeping essential information
    headers_summary = _extract_headers_summary(ocr_text)

    system_prompt = """You are an expert document structure analyzer that identifies topics in educational and medical documents.

Your task:
1. Analyze the provided text which contains header markers with metadata
2. Identify the main TOPICS (major sections) of the document
3. Topics often span multiple pages and may have sub-sections
4. Use header metadata (font size, position, bold, etc.) to understand hierarchy
5. Larger font sizes and TOP position usually indicate major topic boundaries
6. Return topic names with their start and end page numbers

Header marker format:
### [HEADER, SIZE=20.0pt, BOLD, TOP, SHORT, FONT=Arial] Header Text

Guidelines for topic identification:
- Focus on MAJOR topics, not every single header
- A topic should be substantial (usually at least 1-2 pages)
- Topics with similar font sizes and formatting are at the same level
- Largest headers (18pt+) are usually main topics
- Medium headers (14-17pt) might be sub-topics or continuations
- Consider semantic meaning: "Introduction", "Chapter 1", "Conclusion" are topics
- Be aware that topics can span multiple pages
- Don't create separate topics for every page - look for true topic boundaries
- If a header appears on multiple pages with similar styling, it's likely one continuous topic

Return topics in chronological order (by start page)."""

    user_prompt = f"""Analyze this document and identify the main topics with their page ranges.

Document has {total_pages} pages total.

Headers and structure:
{headers_summary}

You MUST return ONLY a valid JSON object (no other text) with this EXACT structure:
{{
  "topics": [
    {{"name": "Topic name", "start": 1, "end": 5}},
    {{"name": "Another topic", "start": 6, "end": 10}}
  ]
}}

Important:
- Start and end page numbers are 1-indexed (first page is 1)
- Topics should not overlap
- Cover the entire document (start from page 1 to page {total_pages})
- Use descriptive topic names based on header content
- If no clear topics exist, create broad topics like "Section 1", "Section 2", etc.
- Return ONLY the JSON object, no markdown formatting or additional text"""

    try:
        print("[llm_topic_identifier] Calling OpenAI to identify topics...")
        response = client.chat.completions.create(
            model='gpt-3.5-turbo',  # Faster and cheaper for topic identification
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_prompt}
            ],
            max_tokens=2000,  # Reduced - topic lists don't need many tokens
            temperature=0.1,  # Low temperature for consistent results
            response_format={"type": "json_object"}  # Simple JSON mode for gpt-3.5-turbo
        )

        result = json.loads(response.choices[0].message.content)

        # Validate structure
        if 'topics' not in result:
            raise ValueError("OpenAI response missing 'topics' key")

        topics = result['topics']

        # Validate each topic
        for topic in topics:
            if 'name' not in topic or 'start' not in topic or 'end' not in topic:
                raise ValueError(f"Topic missing required keys: {topic}")
            if topic['start'] < 1 or topic['end'] > total_pages:
                raise ValueError(f"Topic page range invalid: {topic}")
            if topic['start'] > topic['end']:
                raise ValueError(f"Topic start page after end page: {topic}")

        # Sort topics by start page
        topics.sort(key=lambda x: x['start'])

        print(f"[llm_topic_identifier] Successfully identified {len(topics)} topics")
        for topic in topics:
            print(f"  - {topic['name']} (pages {topic['start']}-{topic['end']})")

        return topics

    except json.JSONDecodeError as e:
        raise Exception(f"Failed to parse OpenAI response as JSON: {e}")
    except Exception as e:
        raise Exception(f"LLM topic identification failed: {e}")


def _extract_headers_summary(ocr_text: str) -> str:
    """
    Extract headers and page markers from OCR text for efficient LLM processing.

    This reduces token usage by only sending headers (not body text) to the LLM.

    Args:
        ocr_text: Full OCR text with header markers

    Returns:
        String containing only page markers and headers
    """
    lines = ocr_text.split('\n')
    summary_lines = []

    for line in lines:
        # Keep page markers
        if line.startswith('--- Page'):
            summary_lines.append(line)
        # Keep header markers
        elif line.startswith('### [HEADER'):
            summary_lines.append(line)
        # Skip regular body text to reduce tokens

    # Add some context lines if summary is too sparse
    if len(summary_lines) < 10:
        # Fall back to including more content
        return ocr_text[:10000]  # First 10k chars as fallback

    return '\n'.join(summary_lines)


def identify_topics_with_llm_chunked(client: OpenAI, ocr_text: str, total_pages: int,
                                     chunk_size: int = 50) -> List[Dict]:
    """
    Identify topics using LLM with chunked processing for very large documents.

    For documents with many pages, this processes them in chunks and then
    combines the results intelligently to handle topics spanning chunk boundaries.

    Args:
        client: OpenAI client instance
        ocr_text: OCR text with header markers
        total_pages: Total number of pages
        chunk_size: Number of pages per chunk (default 50)

    Returns:
        List of topic dicts (same format as identify_topics_with_llm)
    """
    # If document is small enough, use single-pass approach
    if total_pages <= chunk_size:
        return identify_topics_with_llm(client, ocr_text, total_pages)

    print(f"[llm_topic_identifier] Document has {total_pages} pages, using chunked processing...")

    # Split document into chunks by page markers
    page_pattern = r'--- Page (\d+) ---'
    pages = re.split(page_pattern, ocr_text)

    # Process chunks
    all_topics = []
    chunk_start = 1

    while chunk_start <= total_pages:
        chunk_end = min(chunk_start + chunk_size - 1, total_pages)

        # Extract text for this chunk
        chunk_text = _extract_page_range(ocr_text, chunk_start, chunk_end)

        # Identify topics in this chunk
        chunk_topics = identify_topics_with_llm(client, chunk_text, chunk_end - chunk_start + 1)

        # Adjust page numbers to absolute (not chunk-relative)
        for topic in chunk_topics:
            topic['start'] += chunk_start - 1
            topic['end'] += chunk_start - 1

        all_topics.extend(chunk_topics)
        chunk_start = chunk_end + 1

    # Merge adjacent topics with same name (topics spanning chunks)
    merged_topics = _merge_adjacent_topics(all_topics)

    print(f"[llm_topic_identifier] Merged {len(all_topics)} chunk topics into {len(merged_topics)} final topics")

    return merged_topics


def _extract_page_range(ocr_text: str, start_page: int, end_page: int) -> str:
    """
    Extract text for a specific page range and renumber pages to be 1-based.

    This is important for chunked processing - the LLM needs to see pages 1-N,
    not the absolute page numbers.
    """
    lines = []
    current_page = 0
    include = False

    for line in ocr_text.split('\n'):
        if line.startswith('--- Page'):
            match = re.search(r'--- Page (\d+) ---', line)
            if match:
                current_page = int(match.group(1))
                include = start_page <= current_page <= end_page

                if include:
                    # Renumber to be relative (1-based for this chunk)
                    relative_page = current_page - start_page + 1
                    lines.append(f'--- Page {relative_page} ---')
                    continue

        if include:
            lines.append(line)

    return '\n'.join(lines)


def _merge_adjacent_topics(topics: List[Dict]) -> List[Dict]:
    """
    Merge adjacent topics with the same name.

    This handles topics that span multiple chunks and were split.
    """
    if not topics:
        return []

    merged = []
    current = topics[0].copy()

    for i in range(1, len(topics)):
        next_topic = topics[i]

        # If same name and adjacent pages, merge them
        if (current['name'].lower() == next_topic['name'].lower() and
            next_topic['start'] <= current['end'] + 2):  # Allow 1-page gap
            current['end'] = max(current['end'], next_topic['end'])
        else:
            # Different topic, save current and start new
            merged.append(current)
            current = next_topic.copy()

    # Don't forget the last topic
    merged.append(current)

    return merged
