# PaddleOCR Implementation

## Overview

This document describes the PaddleOCR implementation for OCR processing in the Sabuho Document Processing Hub. PaddleOCR replaces the previous Tesseract OCR implementation, providing improved accuracy and better support for multiple languages and document types.

## What Changed

### Dependencies Updated

**Added:**
- `paddlepaddle==3.0.0` - PaddlePaddle deep learning framework
- `paddleocr>=3.2.0` - PaddleOCR library for text detection and recognition
- `numpy>=1.23.0` - Required for image array processing

**Removed:**
- `pytesseract==0.3.13` - No longer needed

### Dockerfile Updated

**Removed system packages:**
- `tesseract-ocr` - Tesseract OCR binary
- `tesseract-ocr-eng` - Tesseract English language pack

**Added system packages:**
- `libgomp1` - OpenMP library for parallel processing support

**Retained packages:**
- `libgl1-mesa-glx` - OpenGL library (required for OpenCV/image processing)
- `libglib2.0-0` - GLib library (required for GTK dependencies)

## Implementation Details

### Architecture

PaddleOCR uses a three-stage approach:

1. **Text Detection** - Locates text regions in images
2. **Text Recognition** - Recognizes characters in detected regions
3. **Orientation Classification** - Detects and corrects text/document orientation

### API Changes from 2.x to 3.x

**Important:** PaddleOCR 3.x has breaking changes from 2.x:

| Feature | PaddleOCR 2.x | PaddleOCR 3.x |
|---------|---------------|---------------|
| Method | `ocr.ocr(img, cls=True)` | `ocr.predict(img)` |
| Angle detection | `use_angle_cls=True` | `use_doc_orientation_classify=True` |
| GPU setting | `use_gpu=False` | Removed (use paddle.set_device) |
| Logging | `show_log=False` | Removed |
| Result format | List of tuples | Result objects with `.text` attribute |

### Processing Strategy

The implementation uses an intelligent multi-strategy approach:

#### Strategy 1: Direct Text Extraction (Fast)
- Uses PyMuPDF to extract text from native PDFs
- No OCR needed if text is already extractable
- **Used when:** Page has >50 characters of extractable text

#### Strategy 2: Full-Page OCR (Scanned Documents)
- Renders entire PDF page as an image at 2x resolution
- Applies PaddleOCR to the full page image
- **Used when:** Page has <50 characters of extractable text (likely scanned)

#### Strategy 3: Embedded Image OCR
- Extracts individual images embedded in PDF pages
- Applies PaddleOCR to each image separately
- **Used when:** Page has extractable text but also contains embedded images

### Code Structure

#### `src/ocr/ocr_processing.py`

**Key Functions:**

```python
get_ocr_instance()
```
- Singleton pattern for PaddleOCR initialization
- Initializes once and reuses across all pages
- Configuration: English language, CPU mode, angle classification enabled

```python
extract_text_from_image_with_ocr(page, img_info, page_num, img_num)
```
- Extracts text from individual embedded images
- Converts images to numpy arrays for PaddleOCR processing
- Returns concatenated text lines

```python
extract_text_from_page_image(page, page_num)
```
- Renders entire PDF page as 2x resolution image
- Applies PaddleOCR to full page
- Returns concatenated text lines

#### `src/ocr/pdf_text_extraction.py`

**Modified Function:**

```python
process_single_page(doc, page_num, total_pages)
```
- Implements the intelligent three-strategy approach
- Determines which OCR strategy to use based on page content
- Maintains parallel processing with ThreadPoolExecutor

### Performance Considerations

**Optimizations:**
- Singleton PaddleOCR instance (initialize once, reuse many times)
- Parallel page processing with ThreadPoolExecutor (max 4 workers)
- Smart strategy selection (avoid OCR when not needed)
- 2x resolution for page rendering (balances quality vs performance)

**Memory Usage:**
- PaddleOCR models are loaded once at initialization
- Page processing is parallelized but limited to 4 workers to control memory
- Images are processed as numpy arrays (efficient)

## Configuration

### PaddleOCR Settings

Current configuration in `ocr_processing.py`:

```python
PaddleOCR(
    lang='es',                          # Spanish language model (change as needed)
    use_doc_orientation_classify=True,  # Document angle detection
    use_doc_unwarping=False,            # Document perspective correction (disabled for speed)
    use_textline_orientation=True       # Text line orientation classification
)
```

**Important:** PaddleOCR 3.x has a completely different API from 2.x. Parameters like `use_angle_cls`, `show_log`, and `use_gpu` from 2.x are no longer valid.

**Note:** PaddleOCR 3.x uses CPU by default. GPU support requires additional device configuration through PaddlePaddle's device API.

### Supported Languages

PaddleOCR 3.x (PP-OCRv5) supports 106+ languages. To add support for additional languages, modify the `lang` parameter:

- `'en'` - English
- `'ch'` - Simplified Chinese (default for 5-language model)
- `'chinese_cht'` - Traditional Chinese
- `'japan'` - Japanese
- `'korean'` - Korean
- `'fr'` or `'french'` - French
- `'german'` - German
- `'es'` or `'spanish'` - Spanish (current configuration)
- `'pt'` or `'portuguese'` - Portuguese
- `'it'` or `'italian'` - Italian
- `'ru'` or `'russian'` - Russian
- `'th'` - Thai
- `'ar'` - Arabic
- And many more...

**Examples:**

```python
# Spanish
ocr = PaddleOCR(lang='es')

# French
ocr = PaddleOCR(lang='fr')

# Simplified Chinese
ocr = PaddleOCR(lang='ch')
```

### GPU Support

PaddleOCR 3.x has changed GPU configuration. To enable GPU acceleration, you need to configure PaddlePaddle's device settings before initializing PaddleOCR:

```python
import paddle
paddle.set_device('gpu:0')  # Use first GPU

# Then initialize PaddleOCR with 3.x API
ocr = PaddleOCR(
    lang='es',
    use_doc_orientation_classify=True,
    use_doc_unwarping=False,
    use_textline_orientation=True
)
```

**Requirements:**
- CUDA-enabled environment
- GPU resources available
- PaddlePaddle GPU version: `pip install paddlepaddle-gpu`

**Default:** PaddleOCR uses CPU automatically if no device is set.

## Testing

### Running Tests

```bash
# Run OCR tests
pytest test/ocr/test_text_extraction.py -v

# Run with markers
pytest -m ocr -v
pytest -m integration -v
```

### Test Coverage

The existing test suite (`test/ocr/test_text_extraction.py`) works without modification:
- Tests the high-level `extract_text_with_pymupdf_and_ocr()` function
- Measures performance (execution time, memory usage)
- Validates output format and saves to `.ocr.txt` files
- Updates Supabase session status

## Building and Deployment

### Local Docker Build

```bash
# Build image
docker build -t sabuho-processor .

# Run locally
docker-compose up
```

### Production Deployment (AWS ECS)

```bash
# Build for linux/amd64
docker buildx build --platform linux/amd64 -t ortosaurio/sabuho:latest .

# Authenticate with ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  801935245468.dkr.ecr.us-east-1.amazonaws.com

# Tag and push
docker tag ortosaurio/sabuho:latest \
  801935245468.dkr.ecr.us-east-1.amazonaws.com/ortosaurio/sabuho:latest

docker push 801935245468.dkr.ecr.us-east-1.amazonaws.com/ortosaurio/sabuho:latest

# Update ECS service
aws ecs update-service --cluster <cluster-name> --service <service-name> --force-new-deployment
```

### First Run Notes

On first initialization, PaddleOCR will:
1. Download pre-trained models (~10-50 MB depending on language)
2. Cache models in `~/.paddleocr/`
3. Subsequent runs will use cached models

**Container Persistence:** In production, consider mounting a volume for `~/.paddleocr/` to persist model cache across container restarts.

## Benefits Over Tesseract

1. **Better Accuracy** - PaddleOCR uses deep learning models vs Tesseract's traditional OCR
2. **Multi-Language Support** - 109+ languages with single API
3. **Layout Understanding** - Better handling of complex document layouts
4. **Orientation Detection** - Automatically detects and corrects text rotation
5. **No System Dependencies** - Pure Python implementation, no binary dependencies
6. **Active Development** - Regular updates and improvements from PaddlePaddle team

## Troubleshooting

### Common Issues

**Issue: "Unknown argument: use_gpu" or "Unknown argument: show_log" or "Unknown argument: use_angle_cls"**
- You're using PaddleOCR 2.x parameter names with PaddleOCR 3.x
- PaddleOCR 3.x has a completely different API
- **Solution:** Use the correct 3.x parameters:
  - ❌ `use_angle_cls=True` → ✅ `use_doc_orientation_classify=True`
  - ❌ `use_gpu=False` → ✅ Remove (CPU is default in 3.x)
  - ❌ `show_log=False` → ✅ Remove (not available in 3.x)

**Issue: "PaddleOCR or PIL not available"**
- Ensure `paddleocr` and `Pillow` are installed: `pip install paddleocr Pillow`
- Check Python version (requires 3.8+)

**Issue: Model download fails**
- Check internet connectivity
- Verify firewall allows HTTPS to PaddlePaddle CDN
- Manually download models and place in `~/.paddleocr/`

**Issue: Out of memory**
- Reduce `max_workers` in `pdf_text_extraction.py`
- Lower page rendering resolution (change Matrix(2,2) to Matrix(1,1))
- Process fewer pages concurrently

**Issue: Slow performance**
- Enable GPU if available (`use_gpu=True`)
- Reduce page resolution for faster processing
- Skip OCR for pages with extractable text

## References

- [PaddleOCR GitHub](https://github.com/PaddlePaddle/PaddleOCR)
- [PaddleOCR Documentation](https://www.paddleocr.ai/)
- [Supported Languages](https://github.com/PaddlePaddle/PaddleOCR/blob/main/doc/doc_en/multi_languages_en.md)
- [Model Zoo](https://github.com/PaddlePaddle/PaddleOCR/blob/main/doc/doc_en/models_list_en.md)
