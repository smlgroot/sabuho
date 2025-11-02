"""OCR processing module for extracting text from images using PaddleOCR"""
import io
import numpy as np

# Try to import PaddleOCR dependencies
try:
    from paddleocr import PaddleOCR
    from PIL import Image
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    print("[WARNING] PaddleOCR or PIL not available. OCR will be skipped.")


# Initialize PaddleOCR once (singleton pattern for better performance)
_ocr_instance = None


def get_ocr_instance():
    """Get or create PaddleOCR instance (singleton)"""
    global _ocr_instance
    if _ocr_instance is None and OCR_AVAILABLE:
        try:
            # Initialize PaddleOCR 3.x with Spanish language
            # use_doc_orientation_classify: Document angle detection
            # use_textline_orientation: Text line orientation classification
            _ocr_instance = PaddleOCR(
                lang='es',
                use_doc_orientation_classify=True,
                use_doc_unwarping=False,
                use_textline_orientation=True
            )
            print("[INFO] PaddleOCR initialized successfully with Spanish language")
        except Exception as e:
            print(f"[ERROR] Failed to initialize PaddleOCR: {str(e)}")
            return None
    return _ocr_instance


def extract_text_from_image_with_ocr(page, img_info, page_num: int, img_num: int) -> str:
    """Extract text from a specific image in a PDF page using PaddleOCR

    Args:
        page: PyMuPDF page object
        img_info: Image information tuple from get_images()
        page_num: Page number for logging
        img_num: Image number for logging

    Returns:
        str: Extracted text from the image
    """
    if not OCR_AVAILABLE:
        return ""

    ocr = get_ocr_instance()
    if ocr is None:
        return ""

    try:
        # Get the image object reference
        xref = img_info[0]  # The image reference number

        # Extract the image from the PDF
        base_image = page.parent.extract_image(xref)
        image_bytes = base_image["image"]

        # Convert to PIL Image
        pil_image = Image.open(io.BytesIO(image_bytes))

        # Convert PIL Image to numpy array for PaddleOCR
        img_array = np.array(pil_image)

        # Run PaddleOCR 3.x on the image using predict() method
        result = ocr.predict(img_array)

        # Extract text from PaddleOCR 3.x result
        # Result is a list of result objects with detected text
        if result and len(result) > 0:
            text_lines = []
            for res in result:
                # Each result object has text content
                if hasattr(res, 'text'):
                    text_lines.append(res.text)
                elif hasattr(res, 'dt_polys'):
                    # Fallback: extract from structured result
                    for item in res.rec_text:
                        text_lines.append(item)

            ocr_text = "\n".join(text_lines)
            return ocr_text

        return ""

    except Exception as error:
        print(f"[WARNING] OCR failed for page {page_num}, image {img_num}: {str(error)}")
        return ""


def extract_text_from_page_image(page, page_num: int) -> str:
    """Extract text from an entire PDF page rendered as an image using PaddleOCR

    This is useful for pages that are scanned images or have complex layouts.

    Args:
        page: PyMuPDF page object
        page_num: Page number for logging

    Returns:
        str: Extracted text from the page
    """
    if not OCR_AVAILABLE:
        return ""

    ocr = get_ocr_instance()
    if ocr is None:
        return ""

    try:
        # Render page to image (pixmap) at 2x resolution for better OCR accuracy
        # matrix = fitz.Matrix(2, 2) creates a 2x zoom
        import fitz
        mat = fitz.Matrix(2, 2)
        pix = page.get_pixmap(matrix=mat)

        # Convert pixmap to PIL Image
        img_data = pix.tobytes("png")
        pil_image = Image.open(io.BytesIO(img_data))

        # Convert PIL Image to numpy array for PaddleOCR
        img_array = np.array(pil_image)

        # Run PaddleOCR 3.x on the page image using predict() method
        result = ocr.predict(img_array)

        # Extract text from PaddleOCR 3.x result
        # Result is a list of result objects with detected text
        if result and len(result) > 0:
            text_lines = []
            for res in result:
                # Each result object has text content
                if hasattr(res, 'text'):
                    text_lines.append(res.text)
                elif hasattr(res, 'dt_polys'):
                    # Fallback: extract from structured result
                    for item in res.rec_text:
                        text_lines.append(item)

            ocr_text = "\n".join(text_lines)
            return ocr_text

        return ""

    except Exception as error:
        print(f"[WARNING] Page OCR failed for page {page_num}: {str(error)}")
        return ""
