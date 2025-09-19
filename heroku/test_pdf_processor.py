#!/usr/bin/env python3
"""
Test script for Python PDF processor
Usage: python test_pdf_processor.py <method> <pdf_path>

Examples:
clear && python test_pdf_processor.py process_pdf_document 610ffbd6-0209-4703-b673-0807db6837cb

clear && python test_pdf_processor.py extract_text_with_pymupdf_and_ocr b9f9ce79-5d15-4baf-bc98-9ae798f5b54c/9655c072-da66-4bef-916d-60b75db262df_1755884738462.pdf
clear && python test_pdf_processor.py identify_document_topics b9f9ce79-5d15-4baf-bc98-9ae798f5b54c/9655c072-da66-4bef-916d-60b75db262df_1755884738462-extracted.txt
clear && python test_pdf_processor.py extract_topic_texts b9f9ce79-5d15-4baf-bc98-9ae798f5b54c/9655c072-da66-4bef-916d-60b75db262df_1755884738462-extracted.txt /tmp/topics.json
clear && python test_pdf_processor.py process_text_document_with_openai b9f9ce79-5d15-4baf-bc98-9ae798f5b54c/9655c072-da66-4bef-916d-60b75db262df_1755884738462-extracted.txt /tmp/topics.json
"""
from dotenv import load_dotenv
# Load environment variables
load_dotenv('../.env.local')

import os
import sys
import asyncio
import traceback
from supabase import create_client, Client
from pdf_processor import extract_text_with_pymupdf_and_ocr, download_file_from_supabase, save_extraction_result_to_supabase, extract_topic_texts, process_pdf_document
from openai_processing import process_text_document_with_openai
from openai_topic_range_id import identify_document_topics
import json

print(f"envs: {os.getenv('SUPABASE_URL')}")
print(f"envs: {os.getenv('SUPABASE_ANON_KEY')}")
print(f"envs: {os.getenv('SUPABASE_SERVICE_ROLE_KEY')}")

def get_supabase_client() -> Client:
    """Create authenticated Supabase client"""
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_anon_key = os.getenv('SUPABASE_ANON_KEY')
    supabase_service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

    if not supabase_url or not supabase_anon_key:
        raise Exception('Missing SUPABASE_URL or SUPABASE_ANON_KEY')

    # Simulate authorization header (similar to index.ts)
    # Use service role key for full access (recommended for testing)
    # or Bearer token from a logged-in user
    auth_header = f"Bearer {supabase_service_key}" if supabase_service_key else f"Bearer {supabase_anon_key}"
    
    print(f"Using auth header: {auth_header[:20]}...")

    # Create client with authorization header (similar to index.ts pattern)
    supabase = create_client(
        supabase_url,
        supabase_service_key
    )
    
    # Set the authorization header after client creation
    # supabase.auth.set_session({"access_token": supabase_service_key if supabase_service_key else supabase_anon_key})
    
    return supabase

async def main():
    """Main test function"""
    print(f"sys.argv: {sys.argv}")
    print(f"len(sys.argv): {len(sys.argv)}")
    print(f"sys.argv[0]: {sys.argv[0]}")
    print(f"sys.argv[1]: {sys.argv[1]}")
    print(f"sys.argv[2]: {sys.argv[2]}")
    print(f"sys.argv[3]: {sys.argv[3] if len(sys.argv) > 3 else ''}")
    
    if len(sys.argv) < 2:
        print("Usage: python test_pdf_processor.py <method> [<args>]")
        sys.exit(1)
    
    method_to_run = sys.argv[1]
    
    print(f"Running method: {method_to_run}")
    
    try:
        if method_to_run == 'process_pdf_document':
            if len(sys.argv) < 3:
                print("Error: process_pdf_document requires resource_id argument")
                sys.exit(1)

            supabase = get_supabase_client()
            resource_id = sys.argv[2]

            await process_pdf_document(supabase, resource_id)
            print(f"[process_pdf_document] [done]")

        elif method_to_run == 'extract_text_with_pymupdf_and_ocr':
            if len(sys.argv) < 3:
                print("Error: extract_text_with_pymupdf_and_ocr requires pdf_file_path argument")
                sys.exit(1)
            
            supabase = get_supabase_client()
            pdf_file_path = sys.argv[2]

            pdf_buffer = await download_file_from_supabase(supabase, pdf_file_path)
            
            extracted_text, extracted_text_from_images, ocr_pages = await extract_text_with_pymupdf_and_ocr(pdf_buffer)
            print(f"[extract_text_with_pymupdf_and_ocr] [extracted_text: {len(extracted_text)}]")
            print(f"[extract_text_with_pymupdf_and_ocr] [extracted_text_from_images: {len(extracted_text_from_images)}]")
            print(f"[extract_text_with_pymupdf_and_ocr] [ocr_pages: {ocr_pages}]")

            combined_text = extracted_text
            if extracted_text_from_images:
                combined_text += f"\n\n=== TEXT FROM IMAGES ===\n{extracted_text_from_images}"
            
            save_result = await save_extraction_result_to_supabase(supabase, pdf_file_path, extracted_text)
            print(f"[save_extraction_result_to_supabase] [result: {save_result}]")
            result = save_result  # For final output
            
        elif method_to_run == 'download_file_from_supabase':
            if len(sys.argv) < 3:
                print("Error: download_file_from_supabase requires s3_key argument")
                sys.exit(1)
            
            supabase = get_supabase_client()
            file_path = sys.argv[2]

            result = await download_file_from_supabase(supabase, file_path)
            print(f"[download_file_from_supabase] [result: {len(result)}]")

        elif method_to_run == 'identify_document_topics':
            if len(sys.argv) < 3:
                print("Error: identify_document_topics requires file_path argument")
                sys.exit(1)
            
            file_path = sys.argv[2]
            supabase = get_supabase_client()
            file_buffer = await download_file_from_supabase(supabase, file_path)
            input_text = file_buffer.decode('utf-8')

            result = await identify_document_topics(input_text)
            print(f"[identify_document_topics] [result: {result}]")

        elif method_to_run == 'extract_topic_texts':
            if len(sys.argv) < 4:
                print("Error: extract_topic_texts requires file_path and topics_json_path arguments")
                sys.exit(1)
            
            file_path = sys.argv[2]
            topics_json_path = sys.argv[3]

            supabase = get_supabase_client()
            raw_text_buffer = await download_file_from_supabase(supabase, file_path)
            raw_text = raw_text_buffer.decode('utf-8')

            with open(topics_json_path, 'r') as f:
                topics_json = json.load(f)

            result = extract_topic_texts(raw_text, topics_json)
            print(f"[extract_topic_texts] [result: {result}]")
            for item in result:
                print(f"[extract_topic_texts] Topic: {item['name']} - {len(item['text'])} characters")

        elif method_to_run == 'process_text_document_with_openai':
            if len(sys.argv) < 4:
                print("Error: process_text_document_with_openai requires file_path and topics_json_path arguments")
                sys.exit(1)
            
            file_path = sys.argv[2]
            topics_json_path = sys.argv[3]

            supabase = get_supabase_client()
            raw_text_buffer = await download_file_from_supabase(supabase, file_path)
            raw_text = raw_text_buffer.decode('utf-8')

            with open(topics_json_path, 'r') as f:
                topics_json = json.load(f)

            topic_to_text = extract_topic_texts(raw_text, topics_json)
            result = await process_text_document_with_openai(supabase, topic_to_text)
            print(f"[process_text_document_with_openai] Output file path: {result['outputFilePath']}")

        else:
            print(f"Unknown method: {method_to_run}")
            print("Available methods: extract_text_with_pymupdf_and_ocr, download_file_from_supabase, process_text_document_with_openai, identify_document_topics, extract_topic_texts")
            sys.exit(1)
        
        print(f"{method_to_run} completed!")

    except Exception as e:
        print(f"Test failed for {method_to_run}: {e}")
        print(f"stacktrace: {traceback.format_exc()}")
        sys.exit(1)

    print("The test is done")

if __name__ == "__main__":
    asyncio.run(main())