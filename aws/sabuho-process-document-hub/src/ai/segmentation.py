"""
Text segmentation module for splitting documents into meaningful segments.

This module splits text using:
- Heading-like lines (numbered headings, uppercase, larger font markers)
- Paragraph boundaries
- Merges short paragraphs to create coherent segments
"""
import re
from typing import List, Dict


def segment_text(text: str, min_segment_length: int = 100) -> List[Dict[str, any]]:
    """
    Segment text into meaningful chunks using heading patterns and paragraphs.

    Args:
        text: Full OCR text with page markers and possible header markers
        min_segment_length: Minimum character length for a segment (shorter ones get merged)

    Returns:
        List of segment dicts: [{"text": "...", "page": 1, "type": "header|content"}, ...]
    """
    print(f"[segmentation] Starting text segmentation with min_length={min_segment_length}...")

    # Parse text into pages first
    pages = _parse_text_into_pages(text)

    if not pages:
        print("[segmentation] No pages found, treating as single document")
        return [{"text": text.strip(), "page": 1, "type": "content"}]

    # Extract segments from each page
    all_segments = []
    for page_num in sorted(pages.keys()):
        page_content = pages[page_num]
        page_segments = _extract_segments_from_page(page_content, page_num)
        all_segments.extend(page_segments)

    print(f"[segmentation] Extracted {len(all_segments)} raw segments")

    # Merge short segments
    merged_segments = _merge_short_segments(all_segments, min_segment_length)

    print(f"[segmentation] Final segment count after merging: {len(merged_segments)}")

    return merged_segments


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


def _extract_segments_from_page(page_content: str, page_num: int) -> List[Dict[str, any]]:
    """
    Extract segments from a single page using heading patterns.

    Identifies segments by:
    - Font header markers: ### [HEADER, SIZE=Xpt] Text
    - Numbered headings: 1. Text, 1.1 Text, etc.
    - All-caps lines (likely headings)
    - Paragraph boundaries (double newlines)

    Args:
        page_content: Content of a single page
        page_num: Page number

    Returns:
        List of segment dicts
    """
    segments = []

    # Split by double newlines first to get paragraphs
    paragraphs = re.split(r'\n\s*\n', page_content)

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        # Determine segment type
        segment_type = _classify_segment(para)

        segments.append({
            "text": para,
            "page": page_num,
            "type": segment_type
        })

    return segments


def _classify_segment(text: str) -> str:
    """
    Classify a text segment as header or content.

    Headers are identified by:
    - Font header markers: ### [HEADER, SIZE=Xpt]
    - Numbered sections: 1., 1.1, (a), etc.
    - All uppercase text (shorter than 100 chars)
    - Short lines ending without punctuation

    Args:
        text: Text segment to classify

    Returns:
        "header" or "content"
    """
    # Check for font header markers
    if re.match(r'### \[HEADER, SIZE=[\d.]+pt\]', text):
        return "header"

    # Get first line for heading checks
    first_line = text.split('\n')[0].strip()

    # Check for numbered headings (1., 1.1, I., (a), etc.)
    if re.match(r'^(\d+\.)+\s+[A-Z]', first_line):  # 1.1 Introduction
        return "header"
    if re.match(r'^[IVXLCDM]+\.\s+[A-Z]', first_line):  # I. Introduction
        return "header"
    if re.match(r'^\([a-z0-9]+\)\s+[A-Z]', first_line):  # (a) Section
        return "header"

    # Check for all-caps headings (short lines)
    if len(first_line) < 100 and first_line.isupper() and len(first_line.split()) > 1:
        return "header"

    # Check for short lines without ending punctuation (likely headings)
    if len(first_line) < 80 and not first_line.endswith(('.', '!', '?', ':')):
        # But make sure it has some capitalized words
        words = first_line.split()
        if len(words) > 0 and sum(1 for w in words if w[0].isupper()) / len(words) > 0.5:
            return "header"

    return "content"


def _merge_short_segments(segments: List[Dict[str, any]], min_length: int) -> List[Dict[str, any]]:
    """
    Merge short segments with adjacent segments to create coherent chunks.

    Strategy:
    - Keep headers separate (they're important boundaries)
    - Merge short content segments with following content
    - Ensure minimum segment length for better embeddings

    Args:
        segments: List of segment dicts
        min_length: Minimum character length for segments

    Returns:
        List of merged segments
    """
    if not segments:
        return []

    merged = []
    i = 0

    while i < len(segments):
        current = segments[i].copy()
        current_text = current["text"]

        # If this is a header, keep it but mark it specially
        if current["type"] == "header":
            # Try to merge header with following content
            if i + 1 < len(segments) and segments[i + 1]["type"] == "content":
                next_seg = segments[i + 1]
                current["text"] = f"{current_text}\n\n{next_seg['text']}"
                current["type"] = "content"  # Now it's content with a header
                i += 2
            else:
                i += 1
            merged.append(current)
            continue

        # For content segments, merge until we reach min_length
        while len(current_text) < min_length and i + 1 < len(segments):
            next_seg = segments[i + 1]

            # Don't merge across page boundaries if pages are far apart
            if abs(next_seg["page"] - current["page"]) > 1:
                break

            # If next is a header, stop merging
            if next_seg["type"] == "header":
                break

            # Merge content
            current_text = f"{current_text}\n\n{next_seg['text']}"
            current["text"] = current_text
            i += 1

        merged.append(current)
        i += 1

    return merged
