"""
Heuristic-based topic identification using font header markers.

This module identifies topics from OCR text by analyzing header markers
that were added during OCR processing (### [HEADER, SIZE=Xpt]).

This approach is:
- Fast (no API calls)
- Free (no OpenAI costs)
- Reliable (no context length issues)
- Works offline
"""
import re
from typing import List, Dict


def identify_topics_from_headers(text: str) -> dict:
    """
    Identify topics from header markers in OCR text.

    Args:
        text: Full OCR text with page markers and header markers
              Format: "--- Page X ---" and "### [HEADER, SIZE=Xpt] Header Text"

    Returns:
        Dict with format: {"topics": [{"name": "...", "start": 1, "end": 5}, ...]}
    """
    print("[heuristic_topic_identifier] Starting header-based topic identification...")

    # Parse text into structured format
    pages = _parse_text_into_pages(text)

    if not pages:
        print("[heuristic_topic_identifier] No pages found in text")
        return {"topics": []}

    # Extract headers with their page numbers
    headers = _extract_headers_with_pages(pages)

    if not headers:
        print("[heuristic_topic_identifier] No headers found, creating single topic")
        # Create a single topic covering the entire document
        page_nums = sorted(pages.keys())
        return {
            "topics": [{
                "name": "Document Content",
                "start": page_nums[0] if page_nums else 1,
                "end": page_nums[-1] if page_nums else 1
            }]
        }

    # Convert headers to topics with page ranges
    topics = _create_topics_from_headers(headers, max(pages.keys()))

    print(f"[heuristic_topic_identifier] Identified {len(topics)} topics from {len(headers)} headers")

    # Print topics for visibility (one line per topic)
    for topic in topics:
        print(f"  - {topic['name']} (pages {topic['start']}-{topic['end']})")

    return {"topics": topics}


def _parse_text_into_pages(text: str) -> Dict[int, str]:
    """
    Parse text into pages using page markers.

    Args:
        text: Full text with "--- Page X ---" markers

    Returns:
        Dict mapping page number to page content
    """
    pages = {}
    page_pattern = r'--- Page (\d+) ---'
    parts = re.split(page_pattern, text)

    # parts[0] is text before first marker
    # parts[1] is page number, parts[2] is content, etc.
    for i in range(1, len(parts), 2):
        if i + 1 < len(parts):
            page_num = int(parts[i])
            page_content = parts[i + 1]
            pages[page_num] = page_content

    return pages


def _extract_headers_with_pages(pages: Dict[int, str]) -> List[Dict]:
    """
    Extract all headers from pages with their page numbers and font sizes.

    Args:
        pages: Dict mapping page numbers to content

    Returns:
        List of header dicts: [{"text": "Header", "page": 1, "size": 14.0}, ...]
    """
    headers = []
    header_pattern = r'### \[HEADER, SIZE=([\d.]+)pt\](?:\s*\[BOLD\])?\s*(.+)'

    for page_num in sorted(pages.keys()):
        page_content = pages[page_num]

        # Find all headers on this page
        for match in re.finditer(header_pattern, page_content):
            font_size = float(match.group(1))
            header_text = match.group(2).strip()

            if header_text:  # Only include non-empty headers
                headers.append({
                    "text": header_text,
                    "page": page_num,
                    "size": font_size
                })

    return headers


def _create_topics_from_headers(headers: List[Dict], max_page: int) -> List[Dict]:
    """
    Convert headers into topics with page ranges.

    Strategy:
    - Each header marks the start of a new topic
    - Topic extends until the next header (or end of document)
    - Filter out minor headers (subheadings) by font size

    Args:
        headers: List of header dicts with text, page, and size
        max_page: Maximum page number in document

    Returns:
        List of topic dicts: [{"name": "...", "start": 1, "end": 5}, ...]
    """
    if not headers:
        return []

    # Identify major headers (larger font sizes are more important)
    # Use a threshold to filter out subheadings
    font_sizes = [h["size"] for h in headers]
    avg_header_size = sum(font_sizes) / len(font_sizes)

    # Consider headers at or above average size as major topics
    major_headers = [h for h in headers if h["size"] >= avg_header_size]

    if not major_headers:
        # If filtering removed all headers, use all of them
        major_headers = headers

    print(f"[heuristic_topic_identifier] Found {len(major_headers)} major headers out of {len(headers)} total headers")

    # Create topics from major headers
    topics = []
    for i, header in enumerate(major_headers):
        topic_name = _clean_header_text(header["text"])
        topic_start = header["page"]

        # Topic extends to the page before the next header
        if i + 1 < len(major_headers):
            topic_end = major_headers[i + 1]["page"] - 1
            # Ensure start <= end
            if topic_end < topic_start:
                topic_end = topic_start
        else:
            # Last topic extends to end of document
            topic_end = max_page

        topics.append({
            "name": topic_name,
            "start": topic_start,
            "end": topic_end
        })

    # Merge very short topics (1 page) with adjacent topics if they seem related
    topics = _merge_short_topics(topics)

    return topics


def _clean_header_text(text: str) -> str:
    """
    Clean header text to create a proper topic name.

    Args:
        text: Raw header text

    Returns:
        Cleaned topic name
    """
    # Remove common prefixes/numbers
    text = re.sub(r'^\d+[\.\)]\s*', '', text)  # Remove "1.", "2)", etc.
    text = re.sub(r'^[IVXLCDM]+[\.\)]\s*', '', text)  # Remove Roman numerals

    # Trim whitespace
    text = text.strip()

    # Capitalize first letter if not already
    if text and not text[0].isupper():
        text = text[0].upper() + text[1:]

    return text


def _merge_short_topics(topics: List[Dict]) -> List[Dict]:
    """
    Merge very short topics (1 page) with adjacent topics.

    This helps avoid fragmentation from minor section headers.

    Args:
        topics: List of topic dicts

    Returns:
        Merged list of topics
    """
    if len(topics) <= 1:
        return topics

    merged = []
    i = 0

    while i < len(topics):
        current = topics[i].copy()

        # Check if current topic is very short (1 page)
        if current["end"] - current["start"] < 1 and i + 1 < len(topics):
            # Merge with next topic
            next_topic = topics[i + 1]
            current["end"] = next_topic["end"]
            current["name"] = f"{current['name']} / {next_topic['name']}"
            i += 2  # Skip next topic since we merged it
        else:
            i += 1

        merged.append(current)

    return merged
