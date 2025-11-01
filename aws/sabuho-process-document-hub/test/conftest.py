"""Shared pytest fixtures for all tests."""
import sys
import os
import pytest

# Add the src directory and subdirectories to the path to import modules
# This mimics the Lambda environment where all modules are in /var/task/
base_dir = os.path.dirname(__file__)
src_path = os.path.abspath(os.path.join(base_dir, '..', 'src'))
ai_path = os.path.join(src_path, 'ai')
ocr_path = os.path.join(src_path, 'ocr')

for path in [src_path, ai_path, ocr_path]:
    if path not in sys.path:
        sys.path.insert(0, path)


def pytest_configure(config):
    """
    Pytest hook that runs before test collection.
    Ensures src directory and subdirectories are in Python path.
    """
    base_dir = os.path.dirname(__file__)
    src_path = os.path.abspath(os.path.join(base_dir, '..', 'src'))
    ai_path = os.path.join(src_path, 'ai')
    ocr_path = os.path.join(src_path, 'ocr')

    for path in [src_path, ai_path, ocr_path]:
        if path not in sys.path:
            sys.path.insert(0, path)

from supabase_client import get_supabase_client


@pytest.fixture(scope="session")
def supabase_client():
    """
    Fixture that provides a Supabase client for all tests.
    Initialized once per test session.
    """
    client = get_supabase_client()
    return client


@pytest.fixture(scope="session")
def test_resource_session_id():
    """
    Fixture that provides the test resource session ID from environment.
    Used by AI-related tests.
    """
    session_id = os.getenv('TEST_RESOURCE_SESSION_ID')
    if not session_id:
        pytest.skip("TEST_RESOURCE_SESSION_ID environment variable not set")
    return session_id


@pytest.fixture
def test_pdf_path():
    """
    Fixture that provides a test PDF file path.
    Requires TEST_PDF_PATH environment variable to be set.
    """
    pdf_path = os.getenv('TEST_PDF_PATH')

    if not pdf_path:
        pytest.skip("TEST_PDF_PATH environment variable not set")

    if not os.path.exists(pdf_path):
        pytest.skip(f"Test PDF not found at: {pdf_path}")

    return pdf_path
