"""Abstract base class for OCR engines"""
from abc import ABC, abstractmethod
from typing import Tuple, Optional, Callable


class OCREngine(ABC):
    """Abstract base class defining the interface for OCR engines

    Both Tesseract and PaddleOCR engines must implement this interface
    to ensure consistent behavior and return formats across different engines.
    """

    @abstractmethod
    def is_available(self) -> bool:
        """Check if the OCR engine is available and properly initialized

        Returns:
            bool: True if engine is available, False otherwise
        """
        pass

    @abstractmethod
    def get_engine_name(self) -> str:
        """Get the name of this OCR engine

        Returns:
            str: Engine name (e.g., 'tesseract', 'paddleocr')
        """
        pass

    @abstractmethod
    def extract_text_from_page(
        self,
        page,
        page_num: int,
        total_pages: int,
        progress_callback: Optional[Callable[[str, int, int], None]] = None
    ) -> Tuple[Optional[str], Optional[str], bool]:
        """Extract text from a PDF page using this OCR engine

        This is the main method that processes a page. Different engines may have
        different internal strategies (e.g., text extraction + image OCR for Tesseract,
        full-page OCR for PaddleOCR), but they must all return the same format.

        Args:
            page: PyMuPDF page object
            page_num: Current page number (0-indexed)
            total_pages: Total number of pages in document
            progress_callback: Optional callback function(stage: str, current: int, total: int)
                             to report progress. Different engines may report different
                             granularity of progress (e.g., Tesseract reports text extraction
                             and image OCR separately, PaddleOCR reports page-level progress)

        Returns:
            Tuple[Optional[str], Optional[str], bool]:
                - text_content: Main text extracted from page (may include page header)
                - image_text_content: Text extracted from embedded images (may include header)
                - has_images: Whether the page contained embedded images that were processed
        """
        pass

    @abstractmethod
    def extract_text_from_image_with_ocr(
        self,
        page,
        img_info,
        page_num: int,
        img_num: int
    ) -> str:
        """Extract text from a specific embedded image in a PDF page

        This method is called for individual images embedded within a PDF page.

        Args:
            page: PyMuPDF page object
            img_info: Image information tuple from get_images()
            page_num: Page number for logging (1-indexed)
            img_num: Image number for logging (1-indexed)

        Returns:
            str: Extracted text from the image
        """
        pass
