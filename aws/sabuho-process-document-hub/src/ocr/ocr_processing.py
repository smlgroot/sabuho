"""OCR processing module - Factory for OCR engines"""
import os
from typing import Optional
from ocr_engines.base import OCREngine
from ocr_engines.tesseract import TesseractEngine

# Determine which OCR engine to use from environment variable
OCR_ENGINE_TYPE = os.environ.get('OCR_ENGINE', 'tesseract').lower()

# Global engine instance (singleton)
_ocr_engine: Optional[OCREngine] = None


def get_ocr_engine() -> Optional[OCREngine]:
    """Get or create the OCR engine instance based on OCR_ENGINE environment variable

    Returns:
        OCREngine: The configured OCR engine instance, or None if unavailable
    """
    global _ocr_engine

    if _ocr_engine is None:
        # Instantiate the appropriate engine based on configuration
        if OCR_ENGINE_TYPE == 'tesseract':
            engine = TesseractEngine()
            if engine.is_available():
                _ocr_engine = engine
                print(f"[INFO] OCR Engine: Tesseract initialized successfully")
            else:
                print(f"[ERROR] Tesseract selected but not available. Check dependencies.")
        else:
            print(f"[ERROR] Unknown OCR_ENGINE value: {OCR_ENGINE_TYPE}. Only 'tesseract' is supported.")

    return _ocr_engine


# Backward compatibility: Check if any OCR is available
def is_ocr_available() -> bool:
    """Check if OCR functionality is available

    Returns:
        bool: True if an OCR engine is available and working
    """
    engine = get_ocr_engine()
    return engine is not None and engine.is_available()


# Export OCR_AVAILABLE for backward compatibility with existing code
OCR_AVAILABLE = is_ocr_available()


def extract_text_from_image_with_ocr(page, img_info, page_num: int, img_num: int) -> str:
    """Extract text from a specific image in a PDF page using configured OCR engine

    This is a convenience function that routes to the selected OCR engine.

    Args:
        page: PyMuPDF page object
        img_info: Image information tuple from get_images()
        page_num: Page number for logging (1-indexed)
        img_num: Image number for logging (1-indexed)

    Returns:
        str: Extracted text from the image
    """
    engine = get_ocr_engine()
    if engine is None:
        return ""

    return engine.extract_text_from_image_with_ocr(page, img_info, page_num, img_num)


def extract_text_from_page_image(page, page_num: int) -> str:
    """Extract text from an entire PDF page rendered as an image

    Note: Tesseract engine does not support efficient full-page OCR.
    This function is kept for backward compatibility but returns empty string.

    Args:
        page: PyMuPDF page object
        page_num: Page number for logging (1-indexed)

    Returns:
        str: Empty string (full-page OCR not supported)
    """
    print(f"[WARNING] Full-page OCR not supported. Use embedded image OCR instead.")
    return ""
