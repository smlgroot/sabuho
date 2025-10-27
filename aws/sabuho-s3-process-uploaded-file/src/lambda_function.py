"""AWS Lambda handler for processing PDF files uploaded to S3"""
import json
import boto3
from pdf_text_extraction import extract_text_with_pymupdf_and_ocr

def lambda_handler(event, context):
    import os

    try:
        # Check if running locally (for testing)
        is_local = os.getenv('AWS_SAM_LOCAL', 'false') == 'true'
        local_test_file = os.getenv('LOCAL_TEST_FILE', None)

        print(f"[lambda_handler] is_local: {is_local}")
        print(f"[lambda_handler] local_test_file: {local_test_file}")

        # Process S3 event records
        for record in event['Records']:
            bucket = record['s3']['bucket']['name']
            key = record['s3']['object']['key']
            print(f"[lambda_handler] New file uploaded: {key} in bucket: {bucket}")

            # Download PDF from S3 or use local file for testing
            if is_local and local_test_file and os.path.exists(local_test_file):
                print(f"[lambda_handler] Running locally - using test file: {local_test_file}")
                with open(local_test_file, 'rb') as f:
                    pdf_buffer = f.read()
                print(f"[lambda_handler] Loaded local PDF: {len(pdf_buffer)} bytes")
            else:
                s3_client = boto3.client('s3')
                response = s3_client.get_object(Bucket=bucket, Key=key)
                pdf_buffer = response['Body'].read()
                print(f"[lambda_handler] Downloaded PDF from S3: {len(pdf_buffer)} bytes")

            # Extract text with PyMuPDF and OCR (now with parallel processing)
            extracted_text, extracted_text_from_images, ocr_pages = extract_text_with_pymupdf_and_ocr(pdf_buffer)

            print(f"[lambda_handler] Text extraction completed: {len(extracted_text)} characters")
            if extracted_text_from_images:
                print(f"[lambda_handler] OCR extracted {len(extracted_text_from_images)} characters from images on {len(ocr_pages)} pages")

            # TODO: Save extraction results to Supabase or S3
            # For now, just return the results
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': 'PDF processed successfully',
                    'extracted_text_length': len(extracted_text),
                    'extracted_image_text_length': len(extracted_text_from_images),
                    'ocr_pages': ocr_pages
                })
            }

    except Exception as error:
        print(f"[lambda_handler] Error: {str(error)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'message': 'Error processing PDF',
                'error': str(error)
            })
        }
