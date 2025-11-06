"""PDF text extraction module using PyMuPDF with OCR engines and parallel processing"""
import fitz  # PyMuPDF
from concurrent.futures import ThreadPoolExecutor, as_completed
from ocr.ocr_processing import get_ocr_engine, OCR_AVAILABLE


def process_single_page(doc, page_num: int, total_pages: int, progress_callback) -> tuple:
    """Process a single page using the configured OCR engine

    This delegates to the OCR engine's extract_text_from_page method,
    which handles the specific strategy for that engine (e.g., Tesseract
    extracts text then OCR's images separately, PaddleOCR does full-page
    OCR for scanned documents).

    Args:
        doc: PyMuPDF document object
        page_num: Page number (0-indexed)
        total_pages: Total number of pages
        progress_callback: Callback function(stage, current, total)

    Returns:
        tuple: (page_num, text_content, image_text_content, has_images)
    """
    page = doc[page_num]
    engine = get_ocr_engine()

    if engine is None:
        # No OCR engine available - fall back to PyMuPDF text extraction only
        text = page.get_text("text")
        if text.strip():
            text_content = f"--- Page {page_num + 1} ---\n{text}"
            print(f"[process_single_page] Page {page_num + 1}: Extracted {len(text)} characters (no OCR)")
            return page_num, text_content, None, False
        else:
            return page_num, None, None, False

    # Use the engine's extract_text_from_page method
    text_content, image_text_content, has_images = engine.extract_text_from_page(
        page,
        page_num,
        total_pages,
        progress_callback
    )

    return page_num, text_content, image_text_content, has_images


def extract_text_with_pymupdf_and_ocr(pdf_buffer: bytes, progress_callback) -> str:
    """Extract text from PDF using PyMuPDF and configured OCR engine

    Strategy (depends on selected OCR engine):
    - PaddleOCR: Fast text extraction with PyMuPDF for native PDFs,
                 full-page OCR for scanned documents, individual image OCR
    - Tesseract: PyMuPDF text extraction, then OCR embedded images separately

    Args:
        pdf_buffer: PDF file content as bytes
        progress_callback: Callback function(stage, current, total) to report progress

    Returns:
        str: Combined text extracted from PDF (both direct text and OCR from images)
    """
    engine = get_ocr_engine()
    engine_name = engine.get_engine_name() if engine else "none"

    print(f"[START][extract_text_with_pymupdf_and_ocr] [buffer_size: {len(pdf_buffer)} bytes] [engine: {engine_name}]")

    if not OCR_AVAILABLE:
        print(f"[WARNING][extract_text_with_pymupdf_and_ocr] No OCR engine available - will extract text only with PyMuPDF")

    try:
        # Open PDF from memory buffer
        doc = fitz.open(stream=pdf_buffer, filetype="pdf")

        total_pages = doc.page_count
        print(f"[extract_text_with_pymupdf_and_ocr] Processing {total_pages} pages with parallel processing")

        # Process pages in parallel using ThreadPoolExecutor
        # Use max 4 workers to balance speed and resource usage in Lambda
        max_workers = min(4, total_pages)
        text_content = [None] * total_pages
        image_text_content = [None] * total_pages
        ocr_pages = []

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all pages for processing
            future_to_page = {
                executor.submit(process_single_page, doc, page_num, total_pages, progress_callback): page_num
                for page_num in range(total_pages)
            }

            completed = 0
            # Process results as they complete
            for future in as_completed(future_to_page):
                page_num, text_result, image_text_result, has_images = future.result()

                # Store results in order
                if text_result:
                    text_content[page_num] = text_result
                if image_text_result:
                    image_text_content[page_num] = image_text_result
                    ocr_pages.append(page_num + 1)

                completed += 1

                # For PaddleOCR, report progress here (engine handles its own progress internally)
                # For Tesseract, the engine reports granular progress internally
                if engine_name == 'paddleocr':
                    progress_callback('ocr_page', completed, total_pages)

                if completed % 10 == 0:  # Progress update every 10 pages
                    print(f"[extract_text_with_pymupdf_and_ocr] Processed {completed}/{total_pages} pages")

        # Filter out None values and preserve page order
        text_content = [t for t in text_content if t]
        image_text_content = [t for t in image_text_content if t]
        ocr_pages.sort()  # Sort OCR pages

        doc.close()

        extracted_text = "\n\n".join(text_content)
        extracted_text_from_images = "\n\n".join(image_text_content)

        # Combine both text sources
        combined_text_parts = []
        if extracted_text:
            combined_text_parts.append(extracted_text)
        if extracted_text_from_images:
            combined_text_parts.append(extracted_text_from_images)

        combined_text = "\n\n".join(combined_text_parts)

        print(f"[END][extract_text_with_pymupdf_and_ocr] Extracted {len(extracted_text)} characters of text from {total_pages} pages")
        if extracted_text_from_images:
            print(f"[END][extract_text_with_pymupdf_and_ocr] Extracted {len(extracted_text_from_images)} characters from images on {len(ocr_pages)} pages")
        print(f"[END][extract_text_with_pymupdf_and_ocr] Total combined text: {len(combined_text)} characters")

        return combined_text

    except Exception as error:
        raise Exception(f"[extract_text_with_pymupdf_and_ocr] [error: {str(error)}]")
