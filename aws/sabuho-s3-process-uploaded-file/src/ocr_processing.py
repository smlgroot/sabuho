"""OCR processing module for extracting text from images in PDFs"""
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
