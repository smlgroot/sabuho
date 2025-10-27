"""Simple test for PDF text extraction with static variables"""
import sys
import os
import time
import tracemalloc

# Add the src directory to the path to import the extraction module
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from pdf_text_extraction import extract_text_with_pymupdf_and_ocr


def test_text_extraction():
    """Test text extraction with a static PDF file path"""

    # Static variables - CONFIGURE THESE
    PDF_FILE_PATH = "/Users/smlg/Downloads/compendio-familia-umf-25-tuxtla-gutierrez-chiapas-1.pdf"  # Replace with actual PDF path

    print("="*80)
    print("PDF Text Extraction Test")
    print("="*80)
    print(f"PDF File: {PDF_FILE_PATH}")
    print()

    # Check if file exists
    if not os.path.exists(PDF_FILE_PATH):
        print(f"ERROR: PDF file not found at: {PDF_FILE_PATH}")
        print("Please update PDF_FILE_PATH in this test file to point to a valid PDF")
        return

    try:
        # Read PDF file into memory buffer
        with open(PDF_FILE_PATH, 'rb') as f:
            pdf_buffer = f.read()

        print(f"✓ Loaded PDF: {len(pdf_buffer)} bytes ({len(pdf_buffer)/1024:.2f} KB)")
        print()

        # Extract text using the extraction module
        print("Starting text extraction...")
        print("-"*80)

        # Start memory tracking
        tracemalloc.start()
        start_time = time.perf_counter()

        extracted_text = extract_text_with_pymupdf_and_ocr(pdf_buffer)

        # Calculate elapsed time
        end_time = time.perf_counter()
        elapsed_time = end_time - start_time

        # Get memory usage
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()

        print("-"*80)
        print()

        # Display performance metrics
        print("PERFORMANCE METRICS:")
        print("="*80)
        print(f"⏱  Execution time: {elapsed_time:.2f} seconds")
        print(f"💾 Current memory: {current / 1024 / 1024:.2f} MB")
        print(f"💾 Peak memory: {peak / 1024 / 1024:.2f} MB")
        print()

        # Display results
        print("RESULTS:")
        print("="*80)
        print(f"✓ Total extracted text: {len(extracted_text)} characters")
        print()

        # Save extracted text to file with .ocr.txt extension (similar to Lambda)
        output_file_path = f"{PDF_FILE_PATH}.ocr.txt"
        with open(output_file_path, 'w', encoding='utf-8') as f:
            f.write(extracted_text)
        print(f"✓ Saved extracted text to: {output_file_path}")
        print()

        # Display extracted text preview
        if extracted_text:
            print("EXTRACTED TEXT PREVIEW (first 500 chars):")
            print("-"*80)
            print(extracted_text[:500])
            if len(extracted_text) > 500:
                print("...")
            print()
        else:
            print("⚠ No text extracted from PDF")
            print()

        print("="*80)
        print("✓ Test completed successfully!")
        print("="*80)

    except Exception as error:
        print("="*80)
        print(f"✗ ERROR: {str(error)}")
        print("="*80)
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    test_text_extraction()
