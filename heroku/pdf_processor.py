"""
PDF processor module for Python Supabase Edge Function
Handles PDF processing with PyMuPDF and OpenAI analysis
"""

import os
import json
import time
import asyncio
from typing import Any
from datetime import datetime
import fitz  # PyMuPDF
import openai
from supabase import Client
import io
from openai_processing import process_text_document_with_openai
import pytesseract
from PIL import Image
import re
from openai_topic_range_id import identify_document_topics
import boto3
# pytesseract.pytesseract.tesseract_cmd = '/usr/bin/tesseract'

async def process_pdf_document(supabase_client: Client, resource_session_id: str):
    """
    Main function to process a PDF document through the complete pipeline
    """
    print(f"[process_pdf_document] Starting processing for: {resource_session_id}")

    try:
        resource_session = supabase_client.table("resource_sessions").select("*").eq("id", resource_session_id).execute()
        if not resource_session.data:
            raise Exception(f"No resource_session found with id: {resource_session_id}")

        resource_session = resource_session.data[0]

        print(f"[process_pdf_document] [ResourceSession] [id: {resource_session['id']}]")
        print(f"[process_pdf_document] [ResourceSession] [file_path: {resource_session['file_path']}]")
        print(f"[process_pdf_document] [ResourceSession] [name: {resource_session['name']}]")

        pdf_file_path = resource_session['file_path']

        await update_resource_session_status(supabase_client, resource_session_id, "uploading")

        # Download PDF from S3 (file_path now contains S3 key)
        pdf_buffer = await download_file_from_s3(pdf_file_path)
        print(f"[process_pdf_document] Downloaded PDF from S3: {len(pdf_buffer)} bytes")

        # Update status to decoding
        await update_resource_session_status(supabase_client, resource_session_id, "decoding")

        # Extract text with PyMuPDF and OCR for images
        extracted_text, extracted_text_from_images, ocr_pages = await extract_text_with_pymupdf_and_ocr(pdf_buffer)
        print(f"[process_pdf_document] Text extraction completed: {len(extracted_text)} characters")
        if extracted_text_from_images:
            print(f"[process_pdf_document] OCR extracted {len(extracted_text_from_images)} characters from images on {len(ocr_pages)} pages")

        # Save extraction result to Supabase Storage
        extraction_output_path = await save_extraction_result_to_supabase(
            supabase_client,
            pdf_file_path,
            extracted_text
        )
        print(f"[process_pdf_document] Extraction result saved: {extraction_output_path}")

        # Save extracted_text_from_images in resource_sessions.unparsable column
        await save_unparsable_text_to_supabase(supabase_client, resource_session_id, extracted_text_from_images)

        # Update status to ai_processing
        await update_resource_session_status(supabase_client, resource_session_id, "ai_processing")

        # Identify document topics {"topics": [{"name": "Name of the topic/section", "start": number, "end": number, } ] }
        topics_map = await identify_document_topics(extracted_text)
        print(f"[process_pdf_document] Topics result: {topics_map}")

        # Save topics map to resource_sessions table
        await save_topics_map_to_resource_session(supabase_client, resource_session_id, topics_map)
        print(f"[process_pdf_document] [Topics map] [saved to resource_session]")

        # Create resource_session_domains records (one per topic)
        await create_resource_session_domains(supabase_client, resource_session_id, topics_map)
        print(f"[process_pdf_document] [resource_session_domains] [created]")

        # Extract topic texts
        topic_to_text = extract_topic_texts(extracted_text, topics_map)
        print(f"[process_pdf_document] [Topic to text] [count: {len(topic_to_text)}]")

        # Process topic to text with OpenAI {"total_topics_processed": 26, "batches_processed": 4, "quiz_questions": [{"question":"", "options": [], "correct_answer_index": 0, "source_text": "" } ] }
        analysis_result = await process_text_document_with_openai(supabase_client, topic_to_text)
        print(f"[process_pdf_document] OpenAI analysis completed")

        # Note: Questions are not created here in the new flow
        # They will be created when user saves the quiz in the admin panel
        print(f"[process_pdf_document] Generated {len(analysis_result['quiz_questions'])} questions")

        # Update resource_session status to completed
        await update_resource_session_status(supabase_client, resource_session_id, "completed")
        print(f"[process_pdf_document] [ResourceSession] [status: completed]")

        print(f"[process_pdf_document] Processing completed successfully")

    except Exception as error:
        print(f"[process_pdf_document] Error: {str(error)}")
        # Update status to failed on error
        try:
            await update_resource_session_status(supabase_client, resource_session_id, "failed")
        except:
            pass
        raise error

async def download_file_from_s3(s3_key: str) -> bytes:
    """Download file from S3 using boto3"""
    print(f"[download_file_from_s3] [s3_key: {s3_key}]")

    try:
        # Get S3 bucket name from environment
        bucket_name = os.getenv('AWS_S3_BUCKET')
        if not bucket_name:
            raise Exception("AWS_S3_BUCKET environment variable is not set")

        # Create S3 client
        s3_client = boto3.client('s3')

        # Download file from S3
        response = s3_client.get_object(Bucket=bucket_name, Key=s3_key)
        file_content = response['Body'].read()

        print(f"[download_file_from_s3] Downloaded {len(file_content)} bytes from S3")
        return file_content

    except Exception as error:
        print(f"[download_file_from_s3] [error: {str(error)}]")
        raise error

async def download_file_from_supabase(supabase_client: Client, file_path: str) -> bytes:
    """Download file from Supabase Storage"""
    print(f"[download_file_from_supabase] [file_path: {file_path}]")

    try:
        response = supabase_client.storage.from_("resources-files").download(file_path)
        if not response:
            raise Exception("Failed to download file from Supabase")
        return response
    except Exception as error:
        print(f"[download_file_from_supabase] [error: {str(error)}]")
        raise error

async def extract_text_with_pymupdf_and_ocr(pdf_buffer: bytes) -> tuple[str, str, list[int]]:
    """Extract text from PDF using PyMuPDF and OCR for images with pytesseract
    
    Returns:
        tuple: (extracted_text, extracted_text_from_images, ocr_pages) where:
        - extracted_text: text extracted directly from PDF using PyMuPDF
        - extracted_text_from_images: text extracted from images using OCR
        - ocr_pages: list of page numbers that had images processed with OCR
    """
    print(f"[START][extract_text_with_pymupdf_and_ocr] [buffer_size: {len(pdf_buffer)} bytes]")
    
    try:
        # Open PDF from memory buffer
        doc = fitz.open(stream=pdf_buffer, filetype="pdf")
        
        text_content = []
        image_text_content = []
        ocr_pages = []
        total_pages = doc.page_count
        print(f"[extract_text_with_pymupdf_and_ocr] Processing {total_pages} pages")
        
        # Process each page
        for page_num in range(total_pages):
            page = doc[page_num]
            
            # Always extract text with PyMuPDF
            text = page.get_text()
            if text.strip():
                text_content.append(f"--- Page {page_num + 1} ---\n{text}")
                print(f"[extract_text_with_pymupdf_and_ocr] Page {page_num + 1}: Extracted {len(text)} characters of text")
            
            # Check for images on this page
            image_list = page.get_images()
            if image_list:
                print(f"[extract_text_with_pymupdf_and_ocr] Page {page_num + 1}: Found {len(image_list)} image(s)")
                
                # Extract text from each image using OCR
                page_image_texts = []
                for img_index, img in enumerate(image_list):
                    try:
                        image_text = await extract_text_from_image_with_ocr(page, img, page_num + 1, img_index + 1)
                        if image_text.strip():
                            page_image_texts.append(f"Image {img_index + 1}: {image_text.strip()}")
                            print(f"[extract_text_with_pymupdf_and_ocr] Page {page_num + 1}, Image {img_index + 1}: Extracted {len(image_text)} characters with OCR")
                    except Exception as ocr_error:
                        print(f"[extract_text_with_pymupdf_and_ocr] Page {page_num + 1}, Image {img_index + 1}: OCR failed - {str(ocr_error)}")
                
                if page_image_texts:
                    image_text_content.append(f"--- Page {page_num + 1} Images ---\n" + "\n".join(page_image_texts))
                    ocr_pages.append(page_num + 1)
            
            if (page_num + 1) % 10 == 0:  # Progress update every 10 pages
                print(f"[extract_text_with_pymupdf_and_ocr] Processed {page_num + 1}/{total_pages} pages")
        
        doc.close()
        
        extracted_text = "\n\n".join(text_content)
        extracted_text_from_images = "\n\n".join(image_text_content)
        
        print(f"[END][extract_text_with_pymupdf_and_ocr] Extracted {len(extracted_text)} characters of text from {total_pages} pages")
        if extracted_text_from_images:
            print(f"[END][extract_text_with_pymupdf_and_ocr] Extracted {len(extracted_text_from_images)} characters from images on {len(ocr_pages)} pages")
        
        return extracted_text, extracted_text_from_images, ocr_pages
        
    except Exception as error:
        raise Exception(f"[extract_text_with_pymupdf_and_ocr] [error: {str(error)}]")

async def extract_text_from_image_with_ocr(page, img_info, page_num: int, img_num: int) -> str:
    """Extract text from a specific image in a PDF page using OCR with pytesseract"""
    try:
        # Get the image object reference
        xref = img_info[0]  # The image reference number
        
        # Extract the image from the PDF
        base_image = page.parent.extract_image(xref)
        image_bytes = base_image["image"]
        
        # Convert to PIL Image
        pil_image = Image.open(io.BytesIO(image_bytes))
        
        # Enhance image for better OCR if needed (optional)
        # You can add image preprocessing here if needed
        
        # Use pytesseract to extract text from the image
        # Use PSM 6 (single uniform block of text) for better results on individual images
        custom_config = r'--oem 3 --psm 6'
        ocr_text = pytesseract.image_to_string(pil_image, config=custom_config)
        
        return ocr_text
        
    except Exception as error:
        raise Exception(f"OCR failed for page {page_num}, image {img_num}: {str(error)}")

async def save_extraction_result_to_supabase(
    supabase_client: Client,
    original_path: str,
    extracted_text: str
) -> str:
    """Save PDF extraction result to Supabase Storage"""
    timestamp = int(datetime.now().timestamp() * 1000)
    base_name = original_path.replace('.pdf', '')
    output_path = f"{base_name}-extracted.txt"

    content = f"PDF TEXT EXTRACTION RESULT:\n{extracted_text}"
    content_bytes = content.encode('utf-8')

    try:
        supabase_client.storage.from_("resources-files").upload(
            path=output_path,
            file=content_bytes,
            file_options={"cache-control": "3600", "upsert": "true"}
        )
        return output_path
    except Exception as error:
        raise Exception(f"Failed to save extraction result to Supabase: {str(error)}")

async def save_unparsable_text_to_supabase(supabase_client: Client, resource_session_id: str, unparsable_text: str) -> str:
    """Update resource_sessions table with unparsable text"""
    try:
        # Update the resource_sessions table with the unparsable text
        result = supabase_client.table("resource_sessions").update({
            "unparsable": unparsable_text
        }).eq("id", resource_session_id).execute()

        if not result.data:
            raise Exception(f"No resource_session found with id: {resource_session_id}")

        return f"Updated resource_session {resource_session_id} with unparsable text"
    except Exception as error:
        raise Exception(f"Failed to update resource_session unparsable column: {str(error)}")

def extract_topic_texts(raw_text, topics_json: dict[str, Any]) -> list[dict[str, str]]:
    # 1. Split text into pages: returns [(page_num, text), ...]
    pages = re.split(r'--- Page (\d+) ---', raw_text)
    # First element is before any page (should be ''), then alternating numbers/text
    page_dict = {}
    for i in range(1, len(pages), 2):
        page_num = int(pages[i])
        page_text = pages[i+1].strip()
        page_dict[page_num] = page_text
    
    # 2. Process each topic to collect text for their page ranges
    results = []
    for topic in topics_json['topics']:
        topic_name = topic['name']
        start, end = topic['start'], topic['end']
        # Collect text for all relevant pages
        topic_text = []
        for page_num in range(start, end+1):
            if page_num in page_dict:
                topic_text.append(page_dict[page_num])
        full_text = "\n".join(topic_text).strip()
        results.append({'name': topic_name, 'text': full_text})
    
    return results
async def save_analysis_result_to_supabase_create_questions(supabase_client: Client, resource: dict[str, Any], quiz_questions: list[dict[str, Any]]) -> int:
    """Save analysis result to Supabase and create questions"""
    try:
        domain_id = resource['domain_id']
        author_id = resource['author_id']
        
        # Create questions and options for each quiz question
        created_questions = []
        for quiz_question in quiz_questions:
            # Prepare options array with correct answer marked
            options = quiz_question.get('options', [])
            correct_answer_index = quiz_question.get('correct_answer_index', 0)
            
            # Format options array with correct answer marked
            formatted_options = []
            for index, option_text in enumerate(options):
                if index == correct_answer_index:
                    formatted_options.append(f"{option_text} [correct]")
                else:
                    formatted_options.append(option_text)
            
            # Create the question record with options included
            question_data = {
                "domain_id": domain_id,
                "type": "multiple_choice",
                "body": quiz_question['question'],
                "explanation": quiz_question.get('source_text', ''),
                "difficulty": "medium",  # Default difficulty
                "author_id": author_id,
                "resource_id": resource['id'],
                "options": formatted_options
            }
            
            question_result = supabase_client.table("questions").insert(question_data).execute()
            
            if not question_result.data:
                raise Exception(f"Failed to create question: {quiz_question['question']}")
            
            question_id = question_result.data[0]['id']
            created_questions.append(question_id)
        
        print(f"[save_analysis_result_to_supabase_create_questions] Created {len(created_questions)} questions with options")
        
        return len(created_questions)
    except Exception as error:
        raise Exception(f"Failed to update resource analysis result: {str(error)}")

async def save_topics_map_to_resource_session(supabase_client: Client, resource_session_id: str, topics_map: dict[str, Any]) -> str:
    """Save topics map to resource_sessions table"""
    try:
        # Save the topics map to the resource_sessions table
        result = supabase_client.table("resource_sessions").update({
            "topic_page_range": topics_map
        }).eq("id", resource_session_id).execute()

        if not result.data:
            raise Exception(f"No resource_session found with id: {resource_session_id}")

        return f"Updated resource_session {resource_session_id} with topics map"
    except Exception as error:
        raise Exception(f"Failed to update resource_session topics map: {str(error)}")

async def create_resource_session_domains(supabase_client: Client, resource_session_id: str, topics_map: dict[str, Any]) -> int:
    """Create resource_session_domains records from topics map

    Args:
        supabase_client: Supabase client instance
        resource_session_id: ID of the resource session
        topics_map: Dictionary with structure {"topics": [{"name": "...", "start": 4, "end": 5}, ...]}

    Returns:
        Number of domains created
    """
    try:
        topics = topics_map.get('topics', [])
        if not topics:
            print(f"[create_resource_session_domains] No topics found in topics_map")
            return 0

        # Prepare domain records to insert
        domain_records = []
        for topic in topics:
            domain_record = {
                "resource_session_id": resource_session_id,
                "name": topic.get('name', 'Unnamed Topic'),
                "page_range_start": topic.get('start', 0),
                "page_range_end": topic.get('end', 0)
            }
            domain_records.append(domain_record)

        # Insert all domain records at once
        result = supabase_client.table("resource_session_domains").insert(domain_records).execute()

        if not result.data:
            raise Exception(f"Failed to create resource_session_domains")

        created_count = len(result.data)
        print(f"[create_resource_session_domains] Created {created_count} resource_session_domains")

        return created_count
    except Exception as error:
        raise Exception(f"Failed to create resource_session_domains: {str(error)}")

async def update_resource_session_status(supabase_client: Client, resource_session_id: str, status: str) -> str:
    """Update resource_session status"""
    try:
        result = supabase_client.table("resource_sessions").update({
            "status": status
        }).eq("id", resource_session_id).execute()

        if not result.data:
            raise Exception(f"No resource_session found with id: {resource_session_id}")

        return f"Updated resource_session {resource_session_id} with status {status}"

    except Exception as error:
        raise Exception(f"Failed to update resource_session status: {str(error)}")