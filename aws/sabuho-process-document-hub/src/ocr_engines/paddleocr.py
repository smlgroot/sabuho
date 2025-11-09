"""PaddleOCR engine implementation"""
import io
import numpy as np
from typing import Tuple, Optional, Callable
from ocr_engines.base import OCREngine
from ocr.font_header_detection import extract_page_text_with_headers

# Try to import PaddleOCR dependencies
try:
    from paddleocr import PaddleOCR as PaddleOCRLib
    from PIL import Image
    import fitz
    PADDLEOCR_AVAILABLE = True
except ImportError:
    PADDLEOCR_AVAILABLE = False
    print("[WARNING] PaddleOCR or PIL not available. PaddleOCR engine will be disabled.")


class PaddleOCREngine(OCREngine):
    """PaddleOCR implementation of OCR engine

    This engine uses PaddleOCR for text extraction with the following strategy:
    1. Extract text with PyMuPDF (fast, works for native PDFs)
    2. If page has < 50 chars, use full-page OCR (scanned documents)
    3. If page has embedded images (and not scanned), OCR each image individually

    Progress reporting: Reports 'ocr_page_X_of_Y' for each page processed
    """

    def __init__(self):
        """Initialize PaddleOCR engine"""
        self._ocr_instance = None
        self._initialized = False

    def is_available(self) -> bool:
        """Check if PaddleOCR is available"""
        return PADDLEOCR_AVAILABLE

    def get_engine_name(self) -> str:
        """Get engine name"""
        return "paddleocr"

    def _get_ocr_instance(self):
        """Get or create PaddleOCR instance (singleton pattern)"""
        if self._ocr_instance is None and PADDLEOCR_AVAILABLE:
            try:
                # Initialize PaddleOCR 3.x with Spanish language
                # use_doc_orientation_classify: Document angle detection
                # use_textline_orientation: Text line orientation classification
                self._ocr_instance = PaddleOCRLib(
                    lang='es',
                    use_doc_orientation_classify=True,
                    use_doc_unwarping=False,
                    use_textline_orientation=True
                )
                self._initialized = True
                print("[INFO] PaddleOCR initialized successfully with Spanish language")
            except Exception as e:
                print(f"[ERROR] Failed to initialize PaddleOCR: {str(e)}")
                return None
        return self._ocr_instance

    def extract_text_from_image_with_ocr(
        self,
        page,
        img_info,
        page_num: int,
        img_num: int
    ) -> str:
        """Extract text from a specific image in a PDF page using PaddleOCR

        Args:
            page: PyMuPDF page object
            img_info: Image information tuple from get_images()
            page_num: Page number for logging (1-indexed)
            img_num: Image number for logging (1-indexed)

        Returns:
            str: Extracted text from the image
        """
        if not PADDLEOCR_AVAILABLE:
            return ""

        ocr = self._get_ocr_instance()
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
            print(f"[WARNING] PaddleOCR failed for page {page_num}, image {img_num}: {str(error)}")
            return ""

    def _extract_text_from_page_image(self, page, page_num: int) -> str:
        """Extract text from an entire PDF page rendered as an image using PaddleOCR

        This is useful for pages that are scanned images or have complex layouts.

        Args:
            page: PyMuPDF page object
            page_num: Page number for logging (1-indexed)

        Returns:
            str: Extracted text from the page
        """
        if not PADDLEOCR_AVAILABLE:
            return ""

        ocr = self._get_ocr_instance()
        if ocr is None:
            return ""

        try:
            # Render page to image (pixmap) at 2x resolution for better OCR accuracy
            # matrix = fitz.Matrix(2, 2) creates a 2x zoom
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
            print(f"[WARNING] PaddleOCR page OCR failed for page {page_num}: {str(error)}")
            return ""

    def extract_text_from_page(
        self,
        page,
        page_num: int,
        total_pages: int,
        progress_callback: Optional[Callable[[str, int, int], None]] = None
    ) -> Tuple[Optional[str], Optional[str], bool]:
        """Extract text from a PDF page using PaddleOCR

        Strategy:
        1. Extract text with PyMuPDF (fast, works for native PDFs)
        2. If page has < 50 chars, use full-page OCR (scanned documents)
        3. If page has embedded images (and not scanned), OCR each image individually

        Args:
            page: PyMuPDF page object
            page_num: Current page number (0-indexed)
            total_pages: Total number of pages in document
            progress_callback: Optional callback function(stage, current, total)

        Returns:
            Tuple[Optional[str], Optional[str], bool]:
                - text_content: Main text extracted from page
                - image_text_content: Text extracted from embedded images
                - has_images: Whether the page contained embedded images
        """
        # Extract text with PyMuPDF using font-based header detection
        text_with_headers = extract_page_text_with_headers(page, page_num + 1)
        text_content = None
        page_is_scanned = False

        # Check if page has minimal extractable text (likely a scanned image)
        # Count actual content beyond the page marker
        page_marker = f"--- Page {page_num + 1} ---"
        actual_content = text_with_headers.replace(page_marker, "").strip() if text_with_headers else ""

        if actual_content and len(actual_content) > 50:
            # Page has sufficient text content
            text_content = text_with_headers
            print(f"[PaddleOCR] Page {page_num + 1}: Extracted {len(actual_content)} characters of text with header detection")
        elif PADDLEOCR_AVAILABLE:
            # Page has little/no text - likely scanned or image-based
            # Use PaddleOCR on the entire page
            print(f"[PaddleOCR] Page {page_num + 1}: Minimal text detected ({len(actual_content)} chars), using full-page OCR")
            page_is_scanned = True
            ocr_text = self._extract_text_from_page_image(page, page_num + 1)
            if ocr_text.strip():
                text_content = f"--- Page {page_num + 1} (OCR) ---\n{ocr_text}"
                print(f"[PaddleOCR] Page {page_num + 1}: Extracted {len(ocr_text)} characters with full-page OCR")

        # Check for embedded images on this page (only if not already processed as full-page OCR)
        image_text_content = None
        has_images = False
        if PADDLEOCR_AVAILABLE and not page_is_scanned:
            image_list = page.get_images()
            if image_list:
                has_images = True
                print(f"[PaddleOCR] Page {page_num + 1}: Found {len(image_list)} embedded image(s)")

                # Extract text from each embedded image using PaddleOCR
                page_image_texts = []
                for img_index, img in enumerate(image_list):
                    try:
                        image_text = self.extract_text_from_image_with_ocr(page, img, page_num + 1, img_index + 1)
                        if image_text.strip():
                            page_image_texts.append(f"Image {img_index + 1}: {image_text.strip()}")
                            print(f"[PaddleOCR] Page {page_num + 1}, Image {img_index + 1}: Extracted {len(image_text)} characters")
                    except Exception as ocr_error:
                        print(f"[PaddleOCR] Page {page_num + 1}, Image {img_index + 1}: OCR failed - {str(ocr_error)}")

                if page_image_texts:
                    image_text_content = f"--- Page {page_num + 1} Images ---\n" + "\n".join(page_image_texts)

        return text_content, image_text_content, has_images
