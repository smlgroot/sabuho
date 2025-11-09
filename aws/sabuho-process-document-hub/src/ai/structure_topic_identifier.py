"""
Structure-based topic identification using font formatting markers.

This module identifies topics from OCR text by analyzing document structure:
- Font size (larger fonts = headings)
- Bold markers (bold text = likely headings)
- Position in document (earlier = likely title/header)

This approach is inspired by pdf.tocgen and TSHD algorithms which achieve
96%+ accuracy by using structural cues rather than semantic content.

Benefits:
- Fast (no ML models needed)
- Reliable (based on document formatting)
- Predictable (font size determines hierarchy)
- Simple (minimal dependencies)
"""
from typing import Dict, List, Tuple
import re


def identify_topics_structure(text: str) -> Dict:
    """
    Identify topics from text using structural formatting markers.

    This function analyzes header markers embedded in OCR text:
    - ### [HEADER, SIZE=14pt] Title
    - ### [HEADER, SIZE=14pt] [BOLD] Title

    Args:
        text: Full OCR text with page markers (--- Page X ---)
              and header markers (### [HEADER, SIZE=Xpt])

    Returns:
        Dict with format: {"topics": [{"name": "...", "start": 1, "end": 5}, ...]}

    Example:
        >>> text = "--- Page 1 ---\\n### [HEADER, SIZE=18pt] Introduction\\n..."
        >>> result = identify_topics_structure(text)
        >>> print(result)
        {"topics": [{"name": "Introduction", "start": 1, "end": 5}, ...]}
    """
    print("[structure_topic_identifier] Starting structure-based topic identification...")

    # Step 1: Extract all headers with their metadata
    headers = _extract_headers(text)

    if not headers:
        print("[structure_topic_identifier] No headers found, using fallback")
        return _fallback_single_topic(text)

    print(f"[structure_topic_identifier] Found {len(headers)} headers")

    # Debug: Print all headers with their details
    print("[structure_topic_identifier] Header details:")
    for i, h in enumerate(headers[:20]):  # Show first 20
        print(f"  {i+1}. Page {h['page']}, Size {h['size']}pt, Bold={h['bold']}: {h['text'][:60]}")
    if len(headers) > 20:
        print(f"  ... and {len(headers) - 20} more headers")

    # Step 2: Determine heading levels based on font sizes
    headers_with_levels = _assign_heading_levels(headers)

    # Step 3: Build topics from top-level headers
    topics = _build_topics_from_headers(headers_with_levels, text)

    print(f"[structure_topic_identifier] Identified {len(topics)} topics")

    # Print topics for visibility
    for topic in topics:
        print(f"  - {topic['name']} (pages {topic['start']}-{topic['end']})")

    return {"topics": topics}


def _extract_headers(text: str) -> List[Dict]:
    """
    Extract all header markers from text with their metadata.

    Looks for patterns like:
    - ### [HEADER, SIZE=14pt] Title
    - ### [HEADER, SIZE=14pt] [BOLD] Title

    Args:
        text: Full OCR text

    Returns:
        List of header dicts with keys: text, size, bold, page, position
    """
    headers = []

    # Parse text to track current page
    current_page = 1
    lines = text.split('\n')
    position = 0

    for line in lines:
        position += len(line) + 1  # +1 for newline

        # Check for page marker
        page_match = re.match(r'--- Page (\d+) ---', line)
        if page_match:
            current_page = int(page_match.group(1))
            continue

        # Check for header marker
        # Pattern: ### [HEADER, SIZE=14pt] [BOLD] Title
        header_match = re.match(
            r'### \[HEADER, SIZE=([\d.]+)pt\](?:\s*\[BOLD\])?\s*(.+)',
            line
        )

        if header_match:
            font_size = float(header_match.group(1))
            header_text = header_match.group(2).strip()
            is_bold = '[BOLD]' in line

            # Only consider headers with reasonable size (>= 11pt)
            # Smaller fonts are likely body text, not headers
            if font_size < 11.0:
                continue

            # Skip empty headers
            if not header_text or len(header_text) < 2:
                continue

            # Clean header text
            header_text = _clean_header_text(header_text)

            if header_text:
                headers.append({
                    'text': header_text,
                    'size': font_size,
                    'bold': is_bold,
                    'page': current_page,
                    'position': position
                })

    return headers


def _clean_header_text(text: str) -> str:
    """
    Clean header text by removing artifacts and normalizing.

    Args:
        text: Raw header text

    Returns:
        Cleaned header text
    """
    # Remove special characters except spaces, hyphens, and accented letters
    cleaned = re.sub(r'[^\w\s\-áéíóúñüÁÉÍÓÚÑÜ]', '', text)

    # Normalize whitespace
    cleaned = ' '.join(cleaned.split())

    # Truncate if too long
    if len(cleaned) > 80:
        cleaned = cleaned[:77] + "..."

    # Capitalize first letter
    if cleaned:
        cleaned = cleaned[0].upper() + cleaned[1:]

    return cleaned


def _assign_heading_levels(headers: List[Dict]) -> List[Dict]:
    """
    Assign heading levels to headers based on font size.

    Strategy:
    - Find unique font sizes
    - Sort by size (descending)
    - Assign levels: largest = level 1, next = level 2, etc.
    - Headers with size >= 14pt and bold are prioritized

    Args:
        headers: List of header dicts

    Returns:
        Headers with 'level' key added
    """
    if not headers:
        return []

    # Get all unique font sizes
    font_sizes = sorted(set(h['size'] for h in headers), reverse=True)

    # Create size -> level mapping
    size_to_level = {}
    for i, size in enumerate(font_sizes):
        size_to_level[size] = i + 1

    # Assign levels to headers
    headers_with_levels = []
    for header in headers:
        header_copy = header.copy()
        header_copy['level'] = size_to_level[header['size']]
        headers_with_levels.append(header_copy)

    # Print level distribution for debugging
    level_counts = {}
    for h in headers_with_levels:
        level = h['level']
        level_counts[level] = level_counts.get(level, 0) + 1

    print(f"[structure_topic_identifier] Heading levels: {dict(sorted(level_counts.items()))}")

    return headers_with_levels


def _build_topics_from_headers(headers: List[Dict], text: str) -> List[Dict]:
    """
    Build topics from top-level headers.

    Strategy:
    - Skip title page headers (usually first 1-3 pages)
    - Use level 1 headers as topic boundaries
    - If too few level 1 headers, use level 2 as well
    - Each topic spans from its header page to the next topic's page - 1
    - Last topic spans to the end of document

    Args:
        headers: Headers with levels assigned
        text: Full text (to determine last page)

    Returns:
        List of topic dicts
    """
    if not headers:
        return []

    # Get last page number from text
    last_page = _get_last_page(text)

    # Skip title page headers (first 1-3 pages usually)
    # Title pages often have lots of large headers that aren't content sections
    title_page_threshold = 3
    content_headers = [h for h in headers if h['page'] > title_page_threshold]

    # If we filtered out too many headers, use original list
    if len(content_headers) < 3:
        print("[structure_topic_identifier] Too few headers after skipping title pages, using all headers")
        content_headers = headers

    print(f"[structure_topic_identifier] Using {len(content_headers)} headers after filtering (skipped first {title_page_threshold} pages)")

    # Determine which level to use for topics
    level_1_headers = [h for h in content_headers if h['level'] == 1]
    level_2_headers = [h for h in content_headers if h['level'] == 2]
    level_3_headers = [h for h in content_headers if h['level'] == 3]

    # Strategy: Use level 1 if we have enough, otherwise go deeper
    if len(level_1_headers) >= 5:
        topic_headers = level_1_headers
        print(f"[structure_topic_identifier] Using {len(topic_headers)} level-1 headers as topics")
    elif len(level_1_headers) + len(level_2_headers) >= 5:
        topic_headers = level_1_headers + level_2_headers
        # Sort by page and position
        topic_headers.sort(key=lambda h: (h['page'], h['position']))
        print(f"[structure_topic_identifier] Using {len(topic_headers)} level-1 and level-2 headers as topics")
    elif len(level_1_headers) + len(level_2_headers) + len(level_3_headers) >= 5:
        topic_headers = level_1_headers + level_2_headers + level_3_headers
        topic_headers.sort(key=lambda h: (h['page'], h['position']))
        print(f"[structure_topic_identifier] Using {len(topic_headers)} level-1/2/3 headers as topics")
    else:
        # Use all content headers as topics if very few
        topic_headers = content_headers[:20]  # Limit to max 20 topics
        topic_headers.sort(key=lambda h: (h['page'], h['position']))
        print(f"[structure_topic_identifier] Using {len(topic_headers)} headers of various levels as topics")

    # Build topics with page ranges
    topics = []
    for i, header in enumerate(topic_headers):
        start_page = header['page']

        # End page is the page before next topic starts, or last page
        if i + 1 < len(topic_headers):
            end_page = topic_headers[i + 1]['page'] - 1
            # Ensure end_page >= start_page
            if end_page < start_page:
                end_page = start_page
        else:
            end_page = last_page

        topics.append({
            'name': header['text'],
            'start': start_page,
            'end': end_page
        })

    # Merge topics that are too short (single page)
    topics = _merge_short_topics(topics)

    return topics


def _merge_short_topics(topics: List[Dict]) -> List[Dict]:
    """
    Merge topics that are too short (single page) with adjacent topics.

    Args:
        topics: List of topic dicts

    Returns:
        List of merged topics
    """
    if len(topics) <= 2:
        return topics

    merged = []
    i = 0

    while i < len(topics):
        current = topics[i]

        # If topic is only 1 page and not the last topic, consider merging
        if current['end'] - current['start'] == 0 and i + 1 < len(topics):
            # Merge with next topic if next is also short
            next_topic = topics[i + 1]
            if next_topic['end'] - next_topic['start'] <= 1:
                # Merge current and next
                merged_topic = {
                    'name': f"{current['name']} / {next_topic['name']}",
                    'start': current['start'],
                    'end': next_topic['end']
                }
                merged.append(merged_topic)
                i += 2
                continue

        merged.append(current)
        i += 1

    return merged


def _get_last_page(text: str) -> int:
    """
    Get the last page number from text.

    Args:
        text: Full text with page markers

    Returns:
        Last page number (or 1 if no pages found)
    """
    page_numbers = re.findall(r'--- Page (\d+) ---', text)

    if page_numbers:
        return max(int(p) for p in page_numbers)

    return 1


def _fallback_single_topic(text: str) -> Dict:
    """
    Fallback when no headers are found - create single topic.

    Args:
        text: Full text

    Returns:
        Single topic covering entire document
    """
    last_page = _get_last_page(text)

    return {
        "topics": [{
            "name": "Document Content",
            "start": 1,
            "end": last_page
        }]
    }
