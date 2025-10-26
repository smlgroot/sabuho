# S3 PDF Processor Lambda Function

This Lambda function processes PDF files uploaded to S3, extracting text using PyMuPDF and optionally performing OCR on embedded images.

## Deployment Options

### Option 1: Deploy with SAM (Recommended)

1. Install dependencies and build:
```bash
cd /Users/smlg/projects/me/sabuho/aws/sabuho-s3-process-uploaded-file
sam build
```

2. Deploy:
```bash
sam deploy --guided
```

### Option 2: Manual Deployment

1. Install dependencies in a package directory:
```bash
cd src
pip install -r requirements.txt -t ./package
cp lambda_function.py ./package/
cd package
zip -r ../deployment-package.zip .
```

2. Upload the zip file to AWS Lambda through the console or AWS CLI.

## OCR Setup (Optional)

The function will work without OCR, extracting only text that's embedded in the PDF. To enable OCR for images:

1. Add a Lambda Layer with Tesseract OCR:
   - Use a pre-built layer like: `arn:aws:lambda:us-east-1:770693421928:layer:Klayers-p313-Pillow:1`
   - Or create a custom layer with Tesseract binary

2. The function will automatically detect if OCR is available and use it.

## Configuration

Make sure to:
1. Increase Lambda timeout (current: 3 seconds) to at least 60-300 seconds depending on PDF size
2. Increase memory allocation (current: 128 MB) to at least 512-1024 MB for processing larger PDFs
3. Add S3 read permissions to the Lambda execution role

## Dependencies

- **PyMuPDF** (fitz): PDF text extraction
- **Pillow** (PIL): Image processing for OCR
- **pytesseract**: Python wrapper for Tesseract OCR
- **boto3**: AWS SDK (included in Lambda runtime)
