"""Test for PDF text extraction with OCR."""
import os
import time
import tracemalloc
import pytest

from ocr.pdf_text_extraction import extract_text_with_pymupdf_and_ocr
from supabase_client import (
    save_resource_session_processing_ocr,
    save_resource_session_ocr_completed,
    save_resource_session_error
)


@pytest.mark.ocr
@pytest.mark.integration
@pytest.mark.slow
def test_text_extraction(supabase_client, test_pdf_path, capsys):
    """
    Test text extraction from a PDF file.

    Args:
        supabase_client: Supabase client fixture
        test_pdf_path: Path to test PDF file fixture
        capsys: Pytest fixture to capture stdout/stderr
    """
    print("=" * 80, flush=True)
    print("PDF Text Extraction Test", flush=True)
    print("=" * 80, flush=True)
    print(f"PDF File: {test_pdf_path}", flush=True)
    print(flush=True)

    session_id = None

    try:
        # Read PDF file into memory buffer
        with open(test_pdf_path, 'rb') as f:
            pdf_buffer = f.read()

        print(f"Loaded PDF: {len(pdf_buffer)} bytes ({len(pdf_buffer)/1024:.2f} KB)", flush=True)
        print(flush=True)

        # Verify buffer is not empty
        assert len(pdf_buffer) > 0, "PDF buffer is empty"

        # Extract filename for resource_sessions
        filename = os.path.basename(test_pdf_path)

        # Create new session in Supabase with 'processing' status
        session = save_resource_session_processing_ocr(
            supabase=supabase_client,
            file_path=test_pdf_path,
            name=filename
        )

        # Check if session creation succeeded
        if session is None:
            pytest.fail("Failed to create Supabase session - connection may have timed out. Check SUPABASE_URL and network connectivity.")

        session_id = session.get('id')
        assert session_id is not None, "Session created but missing 'id' field"
        print(f"Created new session in Supabase: {session_id}", flush=True)
        print(flush=True)

        # Extract text using the extraction module
        print("Starting text extraction...", flush=True)
        print("(This may take several minutes for large PDFs with OCR)", flush=True)
        print("-" * 80, flush=True)

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

        print("-" * 80)
        print()

        # Display performance metrics
        print("PERFORMANCE METRICS:")
        print("=" * 80)
        print(f"Execution time: {elapsed_time:.2f} seconds")
        print(f"Current memory: {current / 1024 / 1024:.2f} MB")
        print(f"Peak memory: {peak / 1024 / 1024:.2f} MB")
        print()

        # Verify extracted text
        assert extracted_text is not None, "No text extracted"
        assert len(extracted_text) > 0, "Extracted text is empty"

        # Display results
        print("RESULTS:")
        print("=" * 80)
        print(f"Total extracted text: {len(extracted_text)} characters")
        print()

        # Save extracted text to file with .ocr.txt extension
        output_file_path = f"{test_pdf_path}.ocr.txt"
        with open(output_file_path, 'w', encoding='utf-8') as f:
            f.write(extracted_text)
        print(f"Saved extracted text to: {output_file_path}")
        print()

        # Verify file was written
        assert os.path.exists(output_file_path), "Output file was not created"

        # Update Supabase record with 'ocr_completed' status
        result = save_resource_session_ocr_completed(
            supabase=supabase_client,
            session_id=session_id
        )
        assert result is not None, "Failed to update session status"
        print(f"Updated session {session_id} to 'ocr_completed' status in Supabase")
        print()

        # Display extracted text preview
        print("EXTRACTED TEXT PREVIEW (first 500 chars):")
        print("-" * 80)
        print(extracted_text[:500])
        if len(extracted_text) > 500:
            print("...")
        print()

        print("=" * 80)
        print("Test completed successfully!")
        print("=" * 80)

    except Exception as error:
        print("=" * 80)
        print(f"ERROR: {str(error)}")
        print("=" * 80)
        import traceback
        error_trace = traceback.format_exc()
        traceback.print_exc()

        # Update Supabase record with error status
        if session_id:
            try:
                result = save_resource_session_error(
                    supabase=supabase_client,
                    session_id=session_id,
                    error_message=f"{str(error)}\n\n{error_trace}"
                )
                print()
                if result:
                    print(f"Updated session {session_id} to 'error' status in Supabase")
                else:
                    print(f"Failed to update session {session_id} to 'error' status")
            except Exception as supabase_error:
                print(f"Could not update Supabase error status: {supabase_error}")
        else:
            print("No session ID available to update with error")

        # Re-raise the exception so pytest marks the test as failed
        pytest.fail(f"Test failed: {str(error)}")
