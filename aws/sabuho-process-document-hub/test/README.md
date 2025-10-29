# Tests for sabuho-process-document-hub

This directory contains pytest-based tests for the document processing Lambda function.

## Setup

1. Navigate to the test directory:
```bash
cd aws/sabuho-process-document-hub/test
```

2. Install dependencies (pytest will use the requirements from ../src/requirements.txt):
```bash
pip install -r ../src/requirements.txt
```

3. Set required environment variables:
```bash
# Required for all tests
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Required for AI tests (topic identification and question generation)
export OPENAI_API_KEY="your-openai-api-key"
export TEST_RESOURCE_SESSION_ID="uuid-of-test-session"

# Optional: Override default test PDF path for OCR tests
export TEST_PDF_PATH="/path/to/your/test.pdf"
```

## Running Tests

### Run all tests
```bash
pytest
```

### Run specific test file
```bash
pytest ocr/test_text_extraction.py
pytest ai/test_topic_identification.py
pytest ai/test_question_generation.py
```

### Run with specific markers
```bash
# Run only OCR tests
pytest -m ocr

# Run only AI tests
pytest -m ai

# Run integration tests
pytest -m integration

# Skip slow tests
pytest -m "not slow"
```

### Run with more/less verbosity
```bash
# Quiet mode
pytest -q

# Very verbose
pytest -vv

# Show print output during tests
pytest -s
```

## Test Structure

### OCR Tests (`ocr/`)
- `test_text_extraction.py`: Tests PDF text extraction with PyMuPDF and Tesseract OCR

### AI Tests (`ai/`)
- `test_topic_identification.py`: Tests topic identification using OpenAI
- `test_question_generation.py`: Tests quiz question generation using OpenAI

### Shared Fixtures (`conftest.py`)
Common fixtures available to all tests:
- `supabase_client`: Initialized Supabase client
- `test_resource_session_id`: Test resource session UUID from environment
- `test_pdf_path`: Path to test PDF file

## Test Dependencies

Tests depend on data in specific states:

1. **OCR tests** can run independently with just a PDF file
2. **Topic identification tests** require:
   - A resource session with OCR text completed
   - Set `TEST_RESOURCE_SESSION_ID` to the session UUID
3. **Question generation tests** require:
   - A resource session with topics and domains already created
   - Run topic identification test first, then question generation

## Tips

- Tests will automatically skip if required environment variables are not set
- Tests will skip if required files (PDFs, OCR text) are not found
- Use `-s` flag to see detailed print output during test execution
- Tests create/modify data in your Supabase database - use a test database if possible
- The pytest configuration file (pytest.ini) is located in the project root directory

## Configuration

The pytest configuration file (`pytest.ini`) is located in the project root and includes:
- Test discovery patterns
- Output formatting options
- Custom markers (ocr, ai, integration, slow)
- Warning filters for unfixable upstream issues (see Dependencies section)

### Dependencies

Package versions have been updated to fix deprecation warnings:
- **Supabase**: Upgraded from 2.10.0 to 2.22.2 (fixes `gotrue` deprecation)
  - Configured custom `httpx.Client` with 60-second read/write timeouts
  - The new version uses `ClientOptions(httpx_client=...)` instead of deprecated timeout parameters
  - **IMPORTANT**: `postgrest` version must match `supabase` version (both 2.22.2)
- **PyMuPDF**: Upgraded from 1.24.14 to 1.26.5 (latest stable)

**Note**: PyMuPDF still shows SWIG-related deprecation warnings. These are upstream issues requiring PyMuPDF to be rebuilt with SWIG 4.4+. We suppress these specific warnings since they cannot be fixed on our end. See: https://github.com/pymupdf/PyMuPDF/issues/3931

## Troubleshooting

### Supabase Connection Timeout
If you see "Operation timed out" or "Failed to create Supabase session" errors:

**Quick Check:**
```bash
# Verify environment variables are set
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Test connectivity
curl -I $SUPABASE_URL
```

**Common Causes:**
1. **Network issues** - Check your internet connection
2. **Invalid credentials** - Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
3. **Firewall/VPN** - Some networks block Supabase connections
4. **Supabase project paused** - Check your Supabase dashboard

**After upgrading to Supabase 2.22.2:**
- The client now uses `ClientOptions` with 60-second timeouts (previously shorter defaults)
- If you still see timeouts, your network or Supabase instance may be slow
- Consider increasing timeouts in `src/supabase_client.py` if needed

### TypeError: SyncPostgrestClient.__init__() got an unexpected keyword argument
If you see this error:
```
TypeError: SyncPostgrestClient.__init__() got an unexpected keyword argument 'http_client'
```

**Cause**: Version mismatch between `supabase` and `postgrest` packages.

**Fix**:
```bash
pip install --upgrade supabase==2.22.2 postgrest==2.22.2
```

The `postgrest` version must exactly match the `supabase` version.

### OCR Tests Taking Too Long
OCR processing can take 5-10 minutes for large PDFs:
- Use a smaller test PDF (set TEST_PDF_PATH environment variable)
- Run with `-s` flag to see progress: `pytest -m ocr -s`
- Consider marking slow tests and skipping them: `pytest -m "not slow"`
