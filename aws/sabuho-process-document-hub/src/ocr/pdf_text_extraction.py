"""PDF text extraction module using PyMuPDF with parallel processing"""
import fitz  # PyMuPDF
from concurrent.futures import ThreadPoolExecutor, as_completed
from ocr.ocr_processing import extract_text_from_image_with_ocr, OCR_AVAILABLE


def process_single_page(doc, page_num: int, total_pages: int) -> tuple:
    """Process a single page: extract text and OCR images

    Returns:
        tuple: (page_num, text_content, image_text_content, has_images)
    """
    page = doc[page_num]

    # Extract text with PyMuPDF (optimized with "text" mode for speed)
    text = page.get_text("text")
    text_content = None
    if text.strip():
        text_content = f"--- Page {page_num + 1} ---\n{text}"
        print(f"[process_single_page] Page {page_num + 1}: Extracted {len(text)} characters of text")

    # Check for images on this page (only process if OCR is available)
    image_text_content = None
    has_images = False
    if OCR_AVAILABLE:
        image_list = page.get_images()
        if image_list:
            has_images = True
            print(f"[process_single_page] Page {page_num + 1}: Found {len(image_list)} image(s)")

            # Extract text from each image using OCR
            page_image_texts = []
            for img_index, img in enumerate(image_list):
                try:
                    image_text = extract_text_from_image_with_ocr(page, img, page_num + 1, img_index + 1)
                    if image_text.strip():
                        page_image_texts.append(f"Image {img_index + 1}: {image_text.strip()}")
                        print(f"[process_single_page] Page {page_num + 1}, Image {img_index + 1}: Extracted {len(image_text)} characters with OCR")
                except Exception as ocr_error:
                    print(f"[process_single_page] Page {page_num + 1}, Image {img_index + 1}: OCR failed - {str(ocr_error)}")

            if page_image_texts:
                image_text_content = f"--- Page {page_num + 1} Images ---\n" + "\n".join(page_image_texts)

    return page_num, text_content, image_text_content, has_images


def extract_text_with_pymupdf_and_ocr(pdf_buffer: bytes) -> str:
    """Extract text from PDF using PyMuPDF and OCR for images with pytesseract

    Returns:
        str: Combined text extracted from PDF (both direct text and OCR from images)
    """
    print(f"[START][extract_text_with_pymupdf_and_ocr] [buffer_size: {len(pdf_buffer)} bytes]")
    if not OCR_AVAILABLE:
        print(f"[WARNING][extract_text_with_pymupdf_and_ocr] OCR not available - will extract text only with PyMuPDF")

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
                executor.submit(process_single_page, doc, page_num, total_pages): page_num
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
