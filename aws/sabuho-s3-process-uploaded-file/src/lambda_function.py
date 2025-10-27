import json
import boto3
import fitz  # PyMuPDF
import io

# Try to import OCR dependencies (optional)
# NOTE: pytesseract requires tesseract binary to be installed
# In Lambda, add tesseract via a Lambda layer for OCR to work
try:
    import pytesseract
    from PIL import Image
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    print("[WARNING] pytesseract or PIL not available. OCR will be skipped.")

def extract_text_from_image_with_ocr(page, img_info, page_num: int, img_num: int) -> str:
    """Extract text from a specific image in a PDF page using OCR with pytesseract"""
    if not OCR_AVAILABLE:
        return ""

    try:
        # Get the image object reference
        xref = img_info[0]  # The image reference number

        # Extract the image from the PDF
        base_image = page.parent.extract_image(xref)
        image_bytes = base_image["image"]

        # Convert to PIL Image
        pil_image = Image.open(io.BytesIO(image_bytes))

        # Use pytesseract to extract text from the image
        # Use PSM 6 (single uniform block of text) for better results on individual images
        custom_config = r'--oem 3 --psm 6'
        ocr_text = pytesseract.image_to_string(pil_image, config=custom_config)

        return ocr_text

    except pytesseract.TesseractNotFoundError:
        # Tesseract binary not installed - skip OCR silently
        print(f"[WARNING] Tesseract binary not found. Skipping OCR for page {page_num}, image {img_num}")
        return ""
    except Exception as error:
        print(f"[WARNING] OCR failed for page {page_num}, image {img_num}: {str(error)}")
        return ""

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

def extract_text_with_pymupdf_and_ocr(pdf_buffer: bytes) -> tuple:
    """Extract text from PDF using PyMuPDF and OCR for images with pytesseract

    Returns:
        tuple: (extracted_text, extracted_text_from_images, ocr_pages) where:
        - extracted_text: text extracted directly from PDF using PyMuPDF
        - extracted_text_from_images: text extracted from images using OCR
        - ocr_pages: list of page numbers that had images processed with OCR
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed

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

        print(f"[END][extract_text_with_pymupdf_and_ocr] Extracted {len(extracted_text)} characters of text from {total_pages} pages")
        if extracted_text_from_images:
            print(f"[END][extract_text_with_pymupdf_and_ocr] Extracted {len(extracted_text_from_images)} characters from images on {len(ocr_pages)} pages")

        return extracted_text, extracted_text_from_images, ocr_pages

    except Exception as error:
        raise Exception(f"[extract_text_with_pymupdf_and_ocr] [error: {str(error)}]")

def lambda_handler(event, context):
    import os

    try:
        # Check if running locally (for testing)
        is_local = os.getenv('AWS_SAM_LOCAL', 'false') == 'true'
        local_test_file = os.getenv('LOCAL_TEST_FILE', None)

        print(f"[lambda_handler] is_local: {is_local}")
        print(f"[lambda_handler] local_test_file: {local_test_file}")

        # Process S3 event records
        for record in event['Records']:
            bucket = record['s3']['bucket']['name']
            key = record['s3']['object']['key']
            print(f"[lambda_handler] New file uploaded: {key} in bucket: {bucket}")

            # Download PDF from S3 or use local file for testing
            if is_local and local_test_file and os.path.exists(local_test_file):
                print(f"[lambda_handler] Running locally - using test file: {local_test_file}")
                with open(local_test_file, 'rb') as f:
                    pdf_buffer = f.read()
                print(f"[lambda_handler] Loaded local PDF: {len(pdf_buffer)} bytes")
            else:
                s3_client = boto3.client('s3')
                response = s3_client.get_object(Bucket=bucket, Key=key)
                pdf_buffer = response['Body'].read()
                print(f"[lambda_handler] Downloaded PDF from S3: {len(pdf_buffer)} bytes")

            # Extract text with PyMuPDF and OCR (now with parallel processing)
            extracted_text, extracted_text_from_images, ocr_pages = extract_text_with_pymupdf_and_ocr(pdf_buffer)

            print(f"[lambda_handler] Text extraction completed: {len(extracted_text)} characters")
            if extracted_text_from_images:
                print(f"[lambda_handler] OCR extracted {len(extracted_text_from_images)} characters from images on {len(ocr_pages)} pages")

            # TODO: Save extraction results to Supabase or S3
            # For now, just return the results
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': 'PDF processed successfully',
                    'extracted_text_length': len(extracted_text),
                    'extracted_image_text_length': len(extracted_text_from_images),
                    'ocr_pages': ocr_pages
                })
            }

    except Exception as error:
        print(f"[lambda_handler] Error: {str(error)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'message': 'Error processing PDF',
                'error': str(error)
            })
        }
