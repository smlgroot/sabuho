# Tests

## Setup

```bash
cd aws/sabuho-process-document-hub
pip install -r requirements.txt

# Configure aws/.env with your settings
# Tests automatically load variables from aws/.env
```

## Environment Variables

Edit `aws/.env` and set:
```bash
SUPABASE_URL=http://127.0.0.1:54321  # From `supabase status`
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
TEST_PDF_PATH=/path/to/test.pdf
TEST_RESOURCE_SESSION_ID=session-uuid  # For AI tests
```

## Run Tests

```bash
pytest              # All tests
pytest -m ocr       # OCR only
pytest -m ai        # AI only
pytest -s           # Show output
```

## Test Order

1. **OCR** → Creates `.ocr.txt` file
2. **Topic Identification** → Creates topics/domains (needs OCR output)
3. **Question Generation** → Creates questions (needs topics)
