"""
Text processor module for Python Supabase Edge Function
Handles text analysis with OpenAI API only
"""

import os
from typing import Dict, Any, Tuple, List
from datetime import datetime
import openai
from supabase import Client
import tempfile
import json
import time
import tiktoken
import asyncio
from dataclasses import dataclass
import traceback

prompt_system = """
You are an expert at analyzing study documentation and generating high-quality practice quiz questions.

Given the Input PDF File, extract as many relevant practice questions as possible. For each question:

- Write a clear, concise question based on the text.
- Provide at least 3 multiple-choice answer options.
- Mark the correct answer.
- Optionally, include 1-2 plausible distractor (incorrect) answers per question.
- Include the exact sentence or excerpt from the Input PDF File used to create the question.
- Do NOT include explanations or references unless specifically requested.

The text is divided in "pages" with the legend "--- Page <page_number> ---".

Generate as many relevant questions as possible per === TOPIC section.

The text is in Spanish. DO NOT translate the text.

Output your results as a JSON object with a "questions" array, where each question object contains:

- "question": The quiz question as a string.
- "options": An array of answer options (minimum 3).
- "correct_answer_index": The index of the correct answer in the options array.
- "source_text": The specific sentence or excerpt from the Input PDF File the question is based on.

Format your output as follows:

{
  "questions": [
    {
      "question": "What is the capital of France?",
      "options": [
        "Paris",
        "London",
        "Berlin"
      ],
      "correct_answer_index": 0,
      "source_text": "Paris is the capital city of France."
    },
    {
      "question": "Which of the following is NOT a mammal?",
      "options": [
        "Whale",
        "Crocodile",
        "Bat"
      ],
      "correct_answer_index": 1,
      "source_text": "Examples of mammals include whales and bats."
    }
  ]
}

"""

@dataclass
class RateLimitConfig:
    requests_per_minute: int = 500
    tokens_per_minute: int = 200000
    max_tokens_per_request: int = 16385  # gpt-4o-mini context limit minus some buffer
    
async def process_text_document_with_openai(supabase_client: Client, topic_to_text: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    Main function to process text using OpenAI API with token counting and batch processing
    """
    print(f"[process_text_document_with_openai] Starting processing for {len(topic_to_text)} topics")
    
    try:
        # Initialize rate limit configuration
        rate_config = RateLimitConfig()
        
        # Step 1: Create batches based on token limits
        batches = __create_batches(topic_to_text, rate_config.max_tokens_per_request)
        print(f"[process_text_document_with_openai] Created {len(batches)} batches for processing")
        
        # Step 2: Process each batch with rate limiting
        all_results = []
        for i, batch in enumerate(batches):
            print(f"[process_text_document_with_openai] Processing batch {i+1}/{len(batches)} with {len(batch)} topics")
            
            batch_result = await __process_batch_with_openai(batch, rate_config)
            all_results.extend(batch_result if isinstance(batch_result, list) else [batch_result])
            
            # Rate limiting: wait between batches if not the last one
            if i < len(batches) - 1:
                wait_time = 60 / rate_config.requests_per_minute
                print(f"[process_text_document_with_openai] Waiting {wait_time:.2f}s for rate limiting")
                await asyncio.sleep(wait_time)
        
        print(f"[process_text_document_with_openai] OpenAI processing completed for all batches")

        # Step 3: Save analysis result to tmp file
        combined_result = {
            "total_topics_processed": len(topic_to_text),
            "batches_processed": len(batches),
            "quiz_questions": all_results
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as tmp_file:
            json.dump(combined_result, tmp_file, indent=2)
            output_path = tmp_file.name

        print(f"[process_text_document_with_openai] Output path: {output_path}")
        

        print(f"[process_text_document_with_openai] Processing completed successfully")
        return combined_result
        
    except Exception as error:
        print(f"[process_text_document_with_openai] Error: {str(error)}")
        raise error

async def __process_batch_with_openai(batch: List[Dict[str, str]], rate_config: RateLimitConfig) -> List[Dict[str, Any]]:
    """Process a batch of topics with OpenAI API to generate quiz questions"""
    print(f"[__process_batch_with_openai] Processing batch with {len(batch)} topics")
    
    openai_api_key = os.getenv('OPENAI_API_KEY')
    
    if not openai_api_key:
        raise Exception('Missing OpenAI API key')
    
    client = openai.OpenAI(api_key=openai_api_key)
    
    try:
        # Prepare the combined text for all topics in the batch
        combined_content = ""
        for item in batch:
            topic_name = item.get('topic', 'Unknown Topic')
            text_content = item.get('text', '')
            combined_content += f"\n\n=== TOPIC: {topic_name} ===\n{text_content}\n"
        
        # Generate quiz questions from the batch
        response = client.chat.completions.create(
            model='gpt-4.1-mini',
            messages=[
                {
                    'role': 'system',
                    'content': prompt_system
                },
                {
                    'role': 'user',
                    'content': f'Generate quiz questions from this text:{combined_content}'
                }
            ],
            max_tokens=12000,
            # max_completion_tokens=12000,
            # temperature=0.1,
            response_format={"type": "json_object"}
        )
        
        analysis_result = response.choices[0].message.content
        print(f"[__process_batch_with_openai] Batch analysis completed")
        
        # Parse the JSON response
        try:
            parsed_result = json.loads(analysis_result)
            # Extract questions array from the response object
            if isinstance(parsed_result, dict) and "questions" in parsed_result:
                return parsed_result["questions"]
            else:
                print(f"[__process_batch_with_openai] Warning: Unexpected response format, expected object with 'questions' array")
                return [{"raw_response": analysis_result, "topics_processed": len(batch)}]
        except Exception as e:
            stacktrace = traceback.format_exc()
            print(f"[__process_batch_with_openai] Warning: Could not parse JSON response, returning raw text: {e}")
            print(f"[__process_batch_with_openai] Stacktrace: {stacktrace}")
            return [{"raw_response": analysis_result, "topics_processed": len(batch)}]
        
    except openai.RateLimitError as error:
        print(f"[__process_batch_with_openai] Rate limit hit: {str(error)}")
        # Implement exponential backoff
        wait_time = 60  # Wait 1 minute for rate limit
        print(f"[__process_batch_with_openai] Waiting {wait_time}s due to rate limit")
        await asyncio.sleep(wait_time)
        # Retry once
        return await __process_batch_with_openai(batch, rate_config)
        
    except Exception as error:
        raise Exception(f"OpenAI API error: {str(error)}")


def __count_tokens(text: str, model: str = "gpt-4o-mini") -> int:
    """
    Count tokens in text using tiktoken
    """
    try:
        encoding = tiktoken.encoding_for_model(model)
        return len(encoding.encode(text))
    except KeyError:
        # Fallback to cl100k_base encoding if model not found
        encoding = tiktoken.get_encoding("cl100k_base")
        return len(encoding.encode(text))

def __create_batches(topic_to_text: List[Dict[str, str]], max_tokens: int, model: str = "gpt-4o-mini") -> List[List[Dict[str, str]]]:
    """
    Create batches of topics based on token count limit
    """
    batches = []
    current_batch = []
    current_tokens = 0
    
    # Count tokens for system prompt
    system_tokens = __count_tokens(prompt_system, model)
    
    for item in topic_to_text:
        topic_name = item.get('topic', '')
        text_content = item.get('text', '')
        
        # Create the content that will be sent to OpenAI
        item_content = f"Topic: {topic_name}\n\n{text_content}"
        item_tokens = __count_tokens(item_content, model)
        
        # Check if adding this item would exceed the limit
        # Account for system prompt, user prompt structure, and response buffer
        total_tokens_needed = system_tokens + current_tokens + item_tokens + 500  # 500 buffer for prompt structure
        
        if total_tokens_needed > max_tokens and current_batch:
            # Start a new batch
            batches.append(current_batch)
            current_batch = [item]
            current_tokens = item_tokens
        else:
            current_batch.append(item)
            current_tokens += item_tokens
    
    # Add the last batch if it's not empty
    if current_batch:
        batches.append(current_batch)
    
    return batches