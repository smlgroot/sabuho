import json
import boto3
import fitz  # PyMuPDF
import io

# Try to import OCR dependencies (optional)
try:
    import pytesseract
    from PIL import Image
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    print("[WARNING] pytesseract or PIL not available. OCR will be skipped.")

async def extract_text_from_image_with_ocr(page, img_info, page_num: int, img_num: int) -> str:
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

    except Exception as error:
        raise Exception(f"OCR failed for page {page_num}, image {img_num}: {str(error)}")

async def extract_text_with_pymupdf_and_ocr(pdf_buffer: bytes) -> tuple:
    """Extract text from PDF using PyMuPDF and OCR for images with pytesseract

    Returns:
        tuple: (extracted_text, extracted_text_from_images, ocr_pages) where:
        - extracted_text: text extracted directly from PDF using PyMuPDF
        - extracted_text_from_images: text extracted from images using OCR
        - ocr_pages: list of page numbers that had images processed with OCR
    """
    print(f"[START][extract_text_with_pymupdf_and_ocr] [buffer_size: {len(pdf_buffer)} bytes]")
    if not OCR_AVAILABLE:
        print(f"[WARNING][extract_text_with_pymupdf_and_ocr] OCR not available - will extract text only with PyMuPDF")

    try:
        # Open PDF from memory buffer
        doc = fitz.open(stream=pdf_buffer, filetype="pdf")

        text_content = []
        image_text_content = []
        ocr_pages = []
        total_pages = doc.page_count
        print(f"[extract_text_with_pymupdf_and_ocr] Processing {total_pages} pages")

        # Process each page
        for page_num in range(total_pages):
            page = doc[page_num]

            # Always extract text with PyMuPDF
            text = page.get_text()
            if text.strip():
                text_content.append(f"--- Page {page_num + 1} ---\n{text}")
                print(f"[extract_text_with_pymupdf_and_ocr] Page {page_num + 1}: Extracted {len(text)} characters of text")

            # Check for images on this page (only process if OCR is available)
            if OCR_AVAILABLE:
                image_list = page.get_images()
                if image_list:
                    print(f"[extract_text_with_pymupdf_and_ocr] Page {page_num + 1}: Found {len(image_list)} image(s)")

                    # Extract text from each image using OCR
                    page_image_texts = []
                    for img_index, img in enumerate(image_list):
                        try:
                            image_text = await extract_text_from_image_with_ocr(page, img, page_num + 1, img_index + 1)
                            if image_text.strip():
                                page_image_texts.append(f"Image {img_index + 1}: {image_text.strip()}")
                                print(f"[extract_text_with_pymupdf_and_ocr] Page {page_num + 1}, Image {img_index + 1}: Extracted {len(image_text)} characters with OCR")
                        except Exception as ocr_error:
                            print(f"[extract_text_with_pymupdf_and_ocr] Page {page_num + 1}, Image {img_index + 1}: OCR failed - {str(ocr_error)}")

                    if page_image_texts:
                        image_text_content.append(f"--- Page {page_num + 1} Images ---\n" + "\n".join(page_image_texts))
                        ocr_pages.append(page_num + 1)

            if (page_num + 1) % 10 == 0:  # Progress update every 10 pages
                print(f"[extract_text_with_pymupdf_and_ocr] Processed {page_num + 1}/{total_pages} pages")

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
    import asyncio
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

            # Extract text with PyMuPDF and OCR
            loop = asyncio.get_event_loop()
            extracted_text, extracted_text_from_images, ocr_pages = loop.run_until_complete(
                extract_text_with_pymupdf_and_ocr(pdf_buffer)
            )

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
