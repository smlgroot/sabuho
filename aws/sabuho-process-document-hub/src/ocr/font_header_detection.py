"""
Font-based header detection module for enhanced topic identification.

This module extracts font size metadata from PDF pages and identifies
text lines that are likely headers based on their font size relative
to the median font size in the document.
"""
from typing import List, Dict, Tuple
import statistics


class TextLine:
    """Represents a line of text with its font metadata"""

    def __init__(self, text: str, font_size: float, font_name: str = "", is_bold: bool = False):
        self.text = text.strip()
        self.font_size = font_size
        self.font_name = font_name
        self.is_bold = is_bold
        self.is_header = False


def extract_text_with_font_info(page) -> List[TextLine]:
    """
    Extract text from a PDF page with font size information.

    Uses PyMuPDF's page.get_text("dict") to extract structured text
    that includes font metadata for each text span.

    Args:
        page: PyMuPDF page object

    Returns:
        List[TextLine]: List of text lines with font information
    """
    text_lines = []

    try:
        # Get structured text with font information
        text_dict = page.get_text("dict")

        # Iterate through blocks (text blocks on the page)
        for block in text_dict.get("blocks", []):
            # Skip image blocks, only process text blocks
            if block.get("type") != 0:  # 0 = text block, 1 = image block
                continue

            # Iterate through lines in the block
            for line in block.get("lines", []):
                line_text = ""
                line_font_sizes = []
                line_font_names = []
                line_is_bold = False

                # Iterate through spans (text with same formatting)
                for span in line.get("spans", []):
                    text = span.get("text", "")
                    font_size = span.get("size", 0)
                    font_name = span.get("font", "")
                    font_flags = span.get("flags", 0)

                    # Check if text is bold (bit 4 in flags)
                    is_bold = bool(font_flags & (1 << 4))

                    line_text += text
                    line_font_sizes.append(font_size)
                    line_font_names.append(font_name)
                    if is_bold:
                        line_is_bold = True

                # Only add non-empty lines
                if line_text.strip():
                    # Use the maximum font size in the line (headers usually have consistent larger fonts)
                    avg_font_size = max(line_font_sizes) if line_font_sizes else 0
                    most_common_font = max(set(line_font_names), key=line_font_names.count) if line_font_names else ""

                    text_line = TextLine(
                        text=line_text,
                        font_size=avg_font_size,
                        font_name=most_common_font,
                        is_bold=line_is_bold
                    )
                    text_lines.append(text_line)

    except Exception as e:
        print(f"[WARNING] Failed to extract font info: {e}")
        # Fallback to simple text extraction
        text = page.get_text("text")
        if text.strip():
            for line in text.split('\n'):
                if line.strip():
                    text_lines.append(TextLine(text=line, font_size=12.0))  # Default size

    return text_lines


def detect_headers(text_lines: List[TextLine], threshold_multiplier: float = 1.2) -> List[TextLine]:
    """
    Identify which text lines are likely headers based on font size.

    Strategy:
    1. Calculate median font size across all text lines
    2. Mark lines with font size > (median * threshold_multiplier) as headers
    3. Also consider bold text that's larger than average

    Args:
        text_lines: List of TextLine objects
        threshold_multiplier: Multiplier for median font size (default 1.2 = 20% larger)

    Returns:
        List[TextLine]: Same list with is_header flag set appropriately
    """
    if not text_lines:
        return text_lines

    # Collect all font sizes
    font_sizes = [line.font_size for line in text_lines if line.font_size > 0]

    if not font_sizes:
        return text_lines

    # Calculate median and mean font sizes
    median_size = statistics.median(font_sizes)
    mean_size = statistics.mean(font_sizes)

    # Calculate header threshold (20% larger than median by default)
    header_threshold = median_size * threshold_multiplier

    print(f"[font_header_detection] Median font size: {median_size:.2f}pt, "
          f"Mean: {mean_size:.2f}pt, Header threshold: {header_threshold:.2f}pt")

    # Mark headers
    header_count = 0
    for line in text_lines:
        # Primary criterion: font size significantly larger than median
        if line.font_size >= header_threshold:
            line.is_header = True
            header_count += 1
        # Secondary criterion: bold text that's larger than average
        elif line.is_bold and line.font_size >= mean_size:
            line.is_header = True
            header_count += 1

    print(f"[font_header_detection] Identified {header_count} potential headers out of {len(text_lines)} lines")

    return text_lines


def format_text_with_header_markers(text_lines: List[TextLine], page_num: int) -> str:
    """
    Format text lines into a string with header markers for AI processing.

    Headers are marked with "### [HEADER, SIZE=Xpt]" prefix to help AI
    identify topic boundaries.

    Args:
        text_lines: List of TextLine objects with is_header flags set
        page_num: Page number (1-indexed) for the page marker

    Returns:
        str: Formatted text with page marker and header annotations
    """
    output_lines = [f"--- Page {page_num} ---"]

    for line in text_lines:
        if line.is_header:
            # Mark headers with size information
            header_marker = f"### [HEADER, SIZE={line.font_size:.1f}pt]"
            if line.is_bold:
                header_marker += " [BOLD]"
            output_lines.append(f"{header_marker} {line.text}")
        else:
            output_lines.append(line.text)

    return "\n".join(output_lines)


def extract_page_text_with_headers(page, page_num: int) -> str:
    """
    Main function to extract text from a page with header detection.

    This is a convenience function that combines all steps:
    1. Extract text with font information
    2. Detect headers based on font size
    3. Format with header markers

    Args:
        page: PyMuPDF page object
        page_num: Page number (1-indexed)

    Returns:
        str: Formatted text with header markers
    """
    # Extract text with font info
    text_lines = extract_text_with_font_info(page)

    if not text_lines:
        return f"--- Page {page_num} ---\n"

    # Detect headers
    text_lines = detect_headers(text_lines)

    # Format with markers
    return format_text_with_header_markers(text_lines, page_num)
