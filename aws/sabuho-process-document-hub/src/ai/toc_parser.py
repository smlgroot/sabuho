"""
Table of Contents (TOC) parser for automatic topic detection.

This module detects and parses table of contents (índice) from Spanish educational
documents, providing instant topic identification without LLM calls.
"""
import re
from typing import List, Dict, Optional


# Spanish keywords that indicate a table of contents
TOC_KEYWORDS = [
    'ÍNDICE',
    'INDICE',
    'TABLA DE CONTENIDO',
    'TABLA DE CONTENIDOS',
    'CONTENIDO',
    'CONTENIDOS',
    'ÍNDICE GENERAL',
    'INDICE GENERAL'
]


def detect_and_parse_toc(ocr_text: str, total_pages: int) -> Optional[Dict]:
    """
    Detect and parse table of contents from document text.

    This is much faster than LLM-based topic detection and should be tried first.
    Works well with Spanish educational documents that have índice sections.

    Args:
        ocr_text: Full OCR text with page markers
        total_pages: Total number of pages in document

    Returns:
        Dict with format {"topics": [{"name": "...", "start": 1, "end": 5}, ...]}
        or None if no valid TOC found

    Example TOC format detected:
        ÍNDICE
        PÁGINAS
        DEFINICIONES DE FAMILIA 3
        DEFINICIONES DE MEDICINA FAMILIAR 4
        ...
    """
    print("[toc_parser] Attempting to detect table of contents...")

    # Step 1: Find TOC section (must be in first 5 pages)
    toc_section = _extract_toc_section(ocr_text)
    if not toc_section:
        print("[toc_parser] No table of contents detected")
        return None

    print("[toc_parser] Found potential table of contents section")

    # Step 2: Parse TOC entries (topic name + page number)
    toc_entries = _parse_toc_entries(toc_section)
    if not toc_entries or len(toc_entries) < 3:
        print(f"[toc_parser] Insufficient TOC entries found ({len(toc_entries)}), skipping TOC parsing")
        return None

    print(f"[toc_parser] Parsed {len(toc_entries)} TOC entries")

    # Step 3: Convert to topics with page ranges
    topics = _convert_toc_to_topics(toc_entries, total_pages)
    if not topics:
        print("[toc_parser] Failed to convert TOC to topics")
        return None

    print(f"[toc_parser] Successfully created {len(topics)} topics from TOC")
    for topic in topics:
        print(f"  - {topic['name']} (pages {topic['start']}-{topic['end']})")

    return {"topics": topics}


def _extract_toc_section(ocr_text: str) -> Optional[str]:
    """
    Extract the table of contents section from the document.

    TOC is typically found in the first few pages and starts with keywords
    like "ÍNDICE" or "TABLA DE CONTENIDO".

    Returns:
        TOC section text or None if not found
    """
    lines = ocr_text.split('\n')

    # Only search first 5 pages (TOC is usually early in document)
    max_line = min(len(lines), 500)  # ~100 lines per page estimate

    toc_start_idx = None
    toc_end_idx = None

    # Find TOC start
    for i, line in enumerate(lines[:max_line]):
        line_upper = line.strip().upper()

        # Check if line contains TOC keyword
        for keyword in TOC_KEYWORDS:
            if keyword in line_upper:
                # Make sure it's not just part of a larger sentence
                # TOC keyword should be on its own line or at start
                if (line_upper == keyword or
                    line_upper.startswith(keyword + ' ') or
                    line_upper.startswith(keyword + '\n')):
                    toc_start_idx = i
                    print(f"[toc_parser] Found TOC keyword '{keyword}' at line {i}")
                    break

        if toc_start_idx is not None:
            break

    if toc_start_idx is None:
        return None

    # Find TOC end (when we hit a page marker or content starts)
    # TOC typically ends within 100-200 lines
    toc_end_idx = min(toc_start_idx + 200, len(lines))

    # Look for clear end markers
    for i in range(toc_start_idx + 1, min(toc_start_idx + 300, len(lines))):
        line = lines[i].strip()

        # End if we hit a new page beyond page 5
        if line.startswith('--- Page'):
            page_num_match = re.search(r'--- Page (\d+) ---', line)
            if page_num_match and int(page_num_match.group(1)) > 5:
                toc_end_idx = i
                break

        # End if we hit a major header that's not part of TOC
        # (TOC entries are shorter and have page numbers)
        if (line.startswith('### [HEADER') and
            'SIZE=20' in line and  # Large header
            i > toc_start_idx + 30):  # After some TOC content
            toc_end_idx = i
            break

    toc_section = '\n'.join(lines[toc_start_idx:toc_end_idx])
    return toc_section


def _parse_toc_entries(toc_section: str) -> List[Dict]:
    """
    Parse individual TOC entries from the TOC section.

    Looks for patterns like:
    - "TOPIC NAME 3"
    - "TOPIC NAME .... 3"
    - "TOPIC NAME                 3"
    - "TOPIC NAME 3-5"
    - Topic and page on separate lines (common in Spanish documents):
      "DEFINICIONES DE FAMILIA"
      "3"

    Returns:
        List of dicts with {"name": "Topic Name", "page": 3}
    """
    entries = []
    lines = toc_section.split('\n')

    # Clean all lines first
    cleaned_lines = []
    for line in lines:
        # Skip empty lines
        if not line.strip():
            continue

        # Skip header lines (ÍNDICE, PÁGINAS, etc.)
        line_upper = line.strip().upper()
        if any(keyword in line_upper for keyword in TOC_KEYWORDS):
            continue
        if line_upper in ['PÁGINA', 'PÁGINAS', 'PAG', 'PAGS', 'PÁG', 'PÁGS']:
            continue

        # Skip page markers
        if line.startswith('--- Page'):
            continue

        # Remove header markers if present
        clean_line = re.sub(r'### \[HEADER[^\]]*\]\s*', '', line)
        clean_line = re.sub(r'\[BOLD\]', '', clean_line)
        clean_line = clean_line.strip()

        if clean_line:
            cleaned_lines.append(clean_line)

    # Parse entries
    i = 0
    while i < len(cleaned_lines):
        line = cleaned_lines[i]

        # Pattern 1: Topic name followed by page number on SAME line
        # Examples: "DEFINICIONES DE FAMILIA 3", "CHAPTER 1 .... 15"
        match = re.search(r'^(.+?)\s*[.\s]+(\d+)(?:-\d+)?$', line)

        if match:
            topic_name = match.group(1).strip()
            page_num = int(match.group(2))

            if len(topic_name) >= 3 and not topic_name.isdigit() and page_num >= 1:
                entries.append({"name": topic_name, "page": page_num})
            i += 1
            continue

        # Pattern 2: Topic and number on SEPARATE lines (common format!)
        # Current line is topic, next line is page number
        if i + 1 < len(cleaned_lines):
            next_line = cleaned_lines[i + 1].strip()

            # Check if next line is just a number (page number)
            if re.match(r'^\d+(?:-\d+)?$', next_line):
                topic_name = line.strip()
                page_num = int(next_line.split('-')[0])

                if len(topic_name) >= 3 and not topic_name.isdigit() and page_num >= 1:
                    entries.append({"name": topic_name, "page": page_num})
                    i += 2  # Skip both lines
                    continue

        # Pattern 3: Simple format without dots (just topic and number separated by space)
        # Example: "DEFINICIONES DE FAMILIA 3"
        parts = line.rsplit(maxsplit=1)
        if len(parts) == 2:
            topic_name, page_str = parts

            # Check if last part is a number or page range
            if re.match(r'^\d+(?:-\d+)?$', page_str):
                page_num = int(page_str.split('-')[0])

                if len(topic_name) >= 3 and page_num >= 1:
                    entries.append({"name": topic_name.strip(), "page": page_num})

        i += 1

    return entries


def _convert_toc_to_topics(toc_entries: List[Dict], total_pages: int) -> List[Dict]:
    """
    Convert TOC entries to topic format with page ranges.

    TOC entries have start pages. We infer end pages by looking at the next entry.

    Args:
        toc_entries: List of {"name": "...", "page": X}
        total_pages: Total pages in document

    Returns:
        List of {"name": "...", "start": X, "end": Y}
    """
    if not toc_entries:
        return []

    # Sort by page number
    sorted_entries = sorted(toc_entries, key=lambda x: x['page'])

    topics = []
    for i, entry in enumerate(sorted_entries):
        start_page = entry['page']

        # Calculate end page
        if i < len(sorted_entries) - 1:
            # End is one page before next topic starts
            next_start = sorted_entries[i + 1]['page']
            end_page = next_start - 1
        else:
            # Last topic goes to end of document
            end_page = total_pages

        # Validate page range
        if end_page < start_page:
            end_page = start_page  # At least 1 page

        topics.append({
            "name": entry['name'],
            "start": start_page,
            "end": end_page
        })

    return topics


def is_toc_available(ocr_text: str) -> bool:
    """
    Quick check if document likely has a table of contents.

    Useful for deciding whether to try TOC parsing or go straight to LLM.

    Args:
        ocr_text: OCR text to check

    Returns:
        True if TOC keywords found in first 5 pages
    """
    # Check first ~500 lines (roughly 5 pages)
    lines = ocr_text.split('\n')[:500]
    text_sample = '\n'.join(lines).upper()

    return any(keyword in text_sample for keyword in TOC_KEYWORDS)
