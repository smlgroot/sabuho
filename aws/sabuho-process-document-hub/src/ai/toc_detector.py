"""
Probabilistic table of contents (TOC) detector using feature-based scoring.

Instead of hardcoding formats, this uses ML-inspired heuristics to detect
TOC-like patterns that work across different document layouts.
"""
import re
from typing import List, Dict, Optional, Tuple


def detect_toc_probabilistic(ocr_text: str, total_pages: int) -> Optional[Dict]:
    """
    Detect and parse TOC using probabilistic feature-based scoring.

    This approach doesn't rely on exact formats. Instead, it scores sections
    based on TOC-like features and extracts the most likely TOC.

    Features used for scoring:
    - High density of numbers (page references)
    - Sequential/increasing page numbers
    - Short, consistent line lengths (TOC entries are concise)
    - Repeated structural patterns
    - Early in document (first 10 pages)
    - High concentration of uppercase text

    Args:
        ocr_text: Full OCR text
        total_pages: Total document pages

    Returns:
        {"topics": [...]} or None if no TOC detected
    """
    print("[toc_detector] Using probabilistic TOC detection...")

    # Step 1: Split document into sections (by page)
    sections = _split_into_sections(ocr_text, max_pages=10)
    if not sections:
        print("[toc_detector] No sections found")
        return None

    # Step 2: Score each section for TOC likelihood
    best_section = None
    best_score = 0

    for section in sections:
        score = _score_toc_likelihood(section)
        if score > best_score:
            best_score = score
            best_section = section

    print(f"[toc_detector] Best section score: {best_score:.2f}")

    # Minimum threshold for considering it a TOC
    # Lowered to 0.4 to handle edge cases (repeated page numbers, sub-items)
    if best_score < 0.4:
        print("[toc_detector] No section scored high enough to be TOC")
        return None

    print("[toc_detector] ✓ Found likely TOC section")

    # Step 3: Extract topic-page pairs from best section
    entries = _extract_topic_page_pairs(best_section)
    if len(entries) < 3:
        print(f"[toc_detector] Only found {len(entries)} entries, need at least 3")
        return None

    print(f"[toc_detector] ✓ Extracted {len(entries)} topic-page pairs")

    # Step 4: Convert to topic format with ranges
    topics = _convert_to_topics(entries, total_pages)
    if not topics:
        return None

    print(f"[toc_detector] ✓ Created {len(topics)} topics")
    for topic in topics[:10]:
        print(f"  - {topic['name']} (pages {topic['start']}-{topic['end']})")
    if len(topics) > 10:
        print(f"  ... and {len(topics) - 10} more")

    return {"topics": topics}


def _split_into_sections(ocr_text: str, max_pages: int = 10) -> List[str]:
    """
    Split document into page-based sections (only first N pages).

    Args:
        ocr_text: Full document text
        max_pages: Only look at first N pages for TOC

    Returns:
        List of section texts
    """
    sections = []
    current_section = []
    page_count = 0

    for line in ocr_text.split('\n'):
        if line.startswith('--- Page'):
            if current_section:
                sections.append('\n'.join(current_section))
            current_section = []
            page_count += 1

            if page_count > max_pages:
                break
        else:
            current_section.append(line)

    if current_section and page_count <= max_pages:
        sections.append('\n'.join(current_section))

    return sections


def _score_toc_likelihood(section: str) -> float:
    """
    Score a section for TOC likelihood using multiple features.

    Returns score between 0.0 (definitely not TOC) and 1.0 (very likely TOC).

    Features (with adaptive weights):
    - Number density: TOCs have many page numbers
    - Sequential numbers: Page refs should increase
    - Line length consistency: TOC entries are similar length
    - Uppercase density: TOC entries often all-caps
    - Pattern repetition: Similar structure repeated
    - TOC keyword presence: Boost if contains ÍNDICE/CONTENIDO
    - Header markers: Use font size/position metadata
    """
    lines = [l.strip() for l in section.split('\n') if l.strip()]
    if len(lines) < 5:  # Too short to be a TOC
        return 0.0

    # Check for TOC keywords and header markers
    has_toc_keyword = _has_toc_keyword(section)
    has_large_header = _has_large_header_marker(section)

    # Clean lines (remove header markers but keep for analysis)
    clean_lines = []
    raw_lines = []
    for line in lines:
        raw_lines.append(line)
        clean = re.sub(r'### \[HEADER[^\]]*\]\s*', '', line)
        clean = re.sub(r'\[BOLD\]', '', clean).strip()
        if clean:
            clean_lines.append(clean)

    if len(clean_lines) < 5:
        return 0.0

    # Adaptive weights based on document characteristics
    weights = _calculate_adaptive_weights(section, has_toc_keyword, has_large_header)

    score = 0.0

    # Feature 1: Number density (what % of lines have numbers)
    lines_with_numbers = sum(1 for line in clean_lines if re.search(r'\d+', line))
    number_density = lines_with_numbers / len(clean_lines)
    score += number_density * weights['number_density']

    # Feature 2: Sequential numbers (are page numbers increasing or staying same?)
    # Repeated page numbers are OK (sub-topics on same page)
    numbers = []
    for line in clean_lines:
        match = re.search(r'\b(\d+)\b', line)
        if match:
            numbers.append(int(match.group(1)))

    if len(numbers) >= 3:
        # Check if mostly non-decreasing (same or increasing)
        # This allows repeated page numbers (common with sub-topics)
        non_decreasing_count = sum(1 for i in range(len(numbers)-1) if numbers[i+1] >= numbers[i])
        sequential_score = non_decreasing_count / (len(numbers) - 1)

        # Also check that numbers don't jump too wildly (max 20 pages between entries)
        jumps = [numbers[i+1] - numbers[i] for i in range(len(numbers)-1) if numbers[i+1] > numbers[i]]
        if jumps:
            max_jump = max(jumps)
            if max_jump > 20:
                sequential_score *= 0.5  # Penalize if jumps are too large

        score += sequential_score * weights['sequential_numbers']

    # Feature 3: Line length consistency (TOC entries similar length)
    line_lengths = [len(line) for line in clean_lines]
    if line_lengths:
        avg_len = sum(line_lengths) / len(line_lengths)
        variance = sum((l - avg_len) ** 2 for l in line_lengths) / len(line_lengths)
        std_dev = variance ** 0.5

        # Lower variance = more consistent = more likely TOC
        consistency_score = max(0, 1 - (std_dev / avg_len)) if avg_len > 0 else 0
        score += consistency_score * weights['line_consistency']

    # Feature 4: Uppercase density (TOC entries often uppercase)
    uppercase_chars = sum(1 for line in clean_lines for c in line if c.isupper())
    total_chars = sum(1 for line in clean_lines for c in line if c.isalpha())
    uppercase_density = uppercase_chars / total_chars if total_chars > 0 else 0
    score += uppercase_density * weights['uppercase_density']

    # Feature 5: Pattern repetition (similar structures)
    # Count how many lines match pattern: text + number
    pattern_matches = sum(1 for line in clean_lines
                         if re.search(r'^[A-ZÁ-Ú\s]+\s*\d+$|^\d+$', line.upper()))
    pattern_score = pattern_matches / len(clean_lines)
    score += pattern_score * weights['pattern_repetition']

    # Bonus for strong TOC indicators
    if has_toc_keyword:
        score += 0.15  # Big boost if section starts with ÍNDICE/CONTENIDO
        print(f"[toc_detector]   + TOC keyword bonus: +0.15")

    if has_large_header:
        score += 0.05  # Small boost for prominent header
        print(f"[toc_detector]   + Large header bonus: +0.05")

    return min(score, 1.0)  # Cap at 1.0


def _has_toc_keyword(section: str) -> bool:
    """Check if section contains TOC keywords like ÍNDICE or CONTENIDO."""
    toc_keywords = [
        'ÍNDICE', 'INDICE', 'TABLA DE CONTENIDO', 'CONTENIDO', 'CONTENTS',
        'TABLE OF CONTENTS', 'INDEX'
    ]

    first_lines = section.split('\n')[:5]  # Check first 5 lines
    for line in first_lines:
        clean = re.sub(r'### \[HEADER[^\]]*\]\s*', '', line)
        clean = re.sub(r'\[BOLD\]', '', clean).strip().upper()

        for keyword in toc_keywords:
            if keyword in clean:
                return True

    return False


def _has_large_header_marker(section: str) -> bool:
    """Check if section starts with a large header (18pt+)."""
    first_lines = section.split('\n')[:3]

    for line in first_lines:
        # Look for header markers with large font size
        match = re.search(r'SIZE=(\d+\.?\d*)pt', line)
        if match:
            size = float(match.group(1))
            if size >= 18.0:
                return True

    return False


def _calculate_adaptive_weights(section: str, has_toc_keyword: bool,
                                has_large_header: bool) -> Dict[str, float]:
    """
    Calculate adaptive weights based on document characteristics.

    Different documents have different TOC patterns:
    - Some use all-caps (high uppercase weight)
    - Some use consistent formatting (high consistency weight)
    - Some have keywords (boost number density importance)

    Args:
        section: The section text being analyzed
        has_toc_keyword: Whether ÍNDICE/CONTENIDO found
        has_large_header: Whether large header marker found

    Returns:
        Dict of feature weights that sum to ~1.0
    """
    # Base weights (work for most documents)
    weights = {
        'number_density': 0.30,
        'sequential_numbers': 0.25,
        'line_consistency': 0.15,
        'uppercase_density': 0.15,
        'pattern_repetition': 0.15
    }

    # If TOC keyword found, prioritize number density and pattern
    if has_toc_keyword:
        weights['number_density'] = 0.35  # More important
        weights['sequential_numbers'] = 0.30
        weights['uppercase_density'] = 0.10  # Less important (format varies)
        weights['line_consistency'] = 0.10
        weights['pattern_repetition'] = 0.15

    # If large header, slightly boost pattern recognition
    if has_large_header:
        weights['pattern_repetition'] = 0.20
        weights['line_consistency'] = 0.10

    return weights


def _extract_topic_page_pairs(section: str) -> List[Dict]:
    """
    Extract topic-page pairs from a TOC section.

    Uses flexible pattern matching that works with multiple formats.

    Returns:
        List of {"name": "Topic", "page": 5}
    """
    lines = section.split('\n')
    clean_lines = []

    # Clean and filter lines
    for line in lines:
        clean = re.sub(r'### \[HEADER[^\]]*\]\s*', '', line)
        clean = re.sub(r'\[BOLD\]', '', clean).strip()

        # Skip common header words and sub-item markers
        clean_upper = clean.upper()
        skip_keywords = [
            'ÍNDICE', 'INDICE', 'TABLA DE CONTENIDO', 'CONTENIDO', 'CONTENTS',
            'PÁGINA', 'PÁGINAS', 'PAG', 'PAGS', 'PÁG', 'PÁGS',
            'DESCRIPCIÓN:', 'DESCRIPCION:', 'DESCRIPTION:',
            'EJEMPLO:', 'EXAMPLE:', 'EJEMPLO DE LA PETICIÓN:',
            'RESPUESTA:', 'RESPONSE:', 'NOTA:', 'NOTE:'
        ]
        if any(clean_upper.startswith(kw) or clean_upper == kw for kw in skip_keywords):
            continue

        if clean:
            clean_lines.append(clean)

    entries = []
    i = 0

    while i < len(clean_lines):
        line = clean_lines[i]

        # Skip if line is just a number (unless it's after a topic)
        if re.match(r'^\d+$', line):
            # Could be page number on separate line
            if i > 0 and entries and entries[-1].get('page') is None:
                # Previous line might be topic
                pass
            i += 1
            continue

        # Try to extract topic and page from current line and maybe next
        result = _extract_single_entry(clean_lines, i)
        if result:
            entry, lines_consumed = result
            entries.append(entry)
            i += lines_consumed
        else:
            i += 1

    return entries


def _extract_single_entry(lines: List[str], idx: int) -> Optional[Tuple[Dict, int]]:
    """
    Try to extract a single topic-page entry starting at index.

    Returns:
        ({"name": "...", "page": N}, lines_consumed) or None
    """
    if idx >= len(lines):
        return None

    line = lines[idx]

    # Pattern 1: Topic and page on same line
    # "TOPIC NAME 5" or "TOPIC NAME ... 5" or "1. TOPIC NAME 5"
    # Remove leading numbers/bullets
    clean = re.sub(r'^\d+[\.\)]\s*', '', line)

    # Try to find number at end
    match = re.search(r'^(.+?)\s*[.\s]*(\d+)$', clean)
    if match:
        topic = match.group(1).strip()
        page = int(match.group(2))

        if len(topic) >= 3 and 1 <= page <= 1000:
            return ({"name": topic, "page": page}, 1)

    # Pattern 2: Topic on this line, page on next line
    if idx + 1 < len(lines):
        next_line = lines[idx + 1].strip()

        # Next line is just a number
        if re.match(r'^\d+$', next_line):
            topic = re.sub(r'^\d+[\.\)]\s*', '', line).strip()
            page = int(next_line)

            if len(topic) >= 3 and 1 <= page <= 1000:
                return ({"name": topic, "page": page}, 2)

    return None


def _convert_to_topics(entries: List[Dict], total_pages: int) -> List[Dict]:
    """
    Convert topic-page entries to topic ranges.

    Args:
        entries: [{"name": "...", "page": N}, ...]
        total_pages: Total pages in document

    Returns:
        [{"name": "...", "start": N, "end": M}, ...]
    """
    if not entries:
        return []

    # Sort by page
    sorted_entries = sorted(entries, key=lambda x: x['page'])

    topics = []
    for i, entry in enumerate(sorted_entries):
        start = entry['page']

        # End is one before next topic starts, or end of document
        if i < len(sorted_entries) - 1:
            end = sorted_entries[i + 1]['page'] - 1
        else:
            end = total_pages

        # Ensure valid range
        if end < start:
            end = start

        topics.append({
            "name": entry['name'],
            "start": start,
            "end": end
        })

    return topics
