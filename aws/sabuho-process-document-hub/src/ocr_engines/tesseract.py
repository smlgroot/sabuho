"""Tesseract OCR engine implementation"""
import io
from typing import Tuple, Optional, Callable
from ocr_engines.base import OCREngine
from ocr.font_header_detection import extract_page_text_with_headers

# Try to import Tesseract dependencies
try:
    import pytesseract
    from PIL import Image
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    print("[WARNING] pytesseract or PIL not available. Tesseract engine will be disabled.")


class TesseractEngine(OCREngine):
    """Tesseract OCR implementation of OCR engine

    This engine uses Tesseract for text extraction with the following strategy:
    1. Extract text with PyMuPDF (fast, works for native PDFs)
    2. OCR embedded images separately and append to text
    3. Does NOT do full-page OCR (only embedded images)

    Progress reporting: Reports granular states for transparency:
    - 'text_extract_page_X_of_Y' when extracting text with PyMuPDF
    - 'ocr_image_X_of_Y_on_page_Z' when OCR'ing individual images

    Note: Despite the internal granular processing, this engine returns the same
    format as PaddleOCR to maintain interface consistency.
    """

    def __init__(self):
        """Initialize Tesseract engine"""
        self._initialized = False

    def is_available(self) -> bool:
        """Check if Tesseract is available"""
        return TESSERACT_AVAILABLE

    def get_engine_name(self) -> str:
        """Get engine name"""
        return "tesseract"

    def extract_text_from_image_with_ocr(
        self,
        page,
        img_info,
        page_num: int,
        img_num: int
    ) -> str:
        """Extract text from a specific image in a PDF page using Tesseract

        Args:
            page: PyMuPDF page object
            img_info: Image information tuple from get_images()
            page_num: Page number for logging (1-indexed)
            img_num: Image number for logging (1-indexed)

        Returns:
            str: Extracted text from the image
        """
        if not TESSERACT_AVAILABLE:
            return ""

        if not self._initialized:
            print("[INFO] Using Tesseract OCR engine")
            self._initialized = True

        try:
            # Get the image object reference
            xref = img_info[0]

            # Extract the image from the PDF
            base_image = page.parent.extract_image(xref)
            image_bytes = base_image["image"]

            # Convert to PIL Image
            pil_image = Image.open(io.BytesIO(image_bytes))

            # Use pytesseract to extract text from the image
            # Use PSM 6 (single uniform block of text) for better results
            # OEM 3 uses default OCR Engine Mode
            custom_config = r'--oem 3 --psm 6'
            ocr_text = pytesseract.image_to_string(pil_image, config=custom_config)

            return ocr_text

        except pytesseract.TesseractNotFoundError:
            print(f"[WARNING] Tesseract binary not found. Skipping OCR for page {page_num}, image {img_num}")
            return ""
        except Exception as error:
            print(f"[WARNING] Tesseract OCR failed for page {page_num}, image {img_num}: {str(error)}")
            return ""

    def extract_text_from_page(
        self,
        page,
        page_num: int,
        total_pages: int,
        progress_callback: Optional[Callable[[str, int, int], None]] = None
    ) -> Tuple[Optional[str], Optional[str], bool]:
        """Extract text from a PDF page using Tesseract

        Strategy (restoring original Tesseract behavior):
        1. Extract text with PyMuPDF first (reports 'text_extract_page_X_of_Y')
        2. OCR embedded images separately (reports 'ocr_image_X_of_Y_on_page_Z' for each)
        3. Does NOT do full-page OCR (only processes embedded images)

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
        # Step 1: Extract text with PyMuPDF and font-based header detection
        # Report granular progress for text extraction
        if progress_callback:
            progress_callback('text_extract_page', page_num + 1, total_pages)

        # Use font-based header detection to extract text with header markers
        text_with_headers = extract_page_text_with_headers(page, page_num + 1)
        text_content = None

        # Check if there's actual content beyond the page marker
        if text_with_headers and len(text_with_headers.strip()) > len(f"--- Page {page_num + 1} ---"):
            text_content = text_with_headers
            print(f"[Tesseract] Page {page_num + 1}: Extracted text with header detection ({len(text_with_headers)} characters)")
        else:
            print(f"[Tesseract] Page {page_num + 1}: No text extracted with PyMuPDF")

        # Step 2: Check for embedded images and OCR them separately
        image_text_content = None
        has_images = False

        if TESSERACT_AVAILABLE:
            image_list = page.get_images()
            if image_list:
                has_images = True
                total_images = len(image_list)
                print(f"[Tesseract] Page {page_num + 1}: Found {total_images} embedded image(s)")

                # Extract text from each embedded image using Tesseract
                page_image_texts = []
                for img_index, img in enumerate(image_list):
                    # Report granular progress for each image OCR
                    if progress_callback:
                        progress_callback(
                            f'ocr_image_{img_index + 1}_of_{total_images}_on_page',
                            page_num + 1,
                            total_pages
                        )

                    try:
                        image_text = self.extract_text_from_image_with_ocr(
                            page, img, page_num + 1, img_index + 1
                        )
                        if image_text.strip():
                            page_image_texts.append(f"Image {img_index + 1}: {image_text.strip()}")
                            print(f"[Tesseract] Page {page_num + 1}, Image {img_index + 1}: Extracted {len(image_text)} characters")
                    except Exception as ocr_error:
                        print(f"[Tesseract] Page {page_num + 1}, Image {img_index + 1}: OCR failed - {str(ocr_error)}")

                if page_image_texts:
                    image_text_content = f"--- Page {page_num + 1} Images ---\n" + "\n".join(page_image_texts)

        # Return same format as PaddleOCR for consistency
        return text_content, image_text_content, has_images
