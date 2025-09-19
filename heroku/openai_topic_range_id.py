import os
import openai
import json
from typing import Any

prompt_system ='''You are a document analyzer. Your task is to identify the main topics or sections in a document and determine which pages each topic covers.

Analyze the provided text and return a JSON object with the following structure:
{
  "topics": [
    {
      "name": "Name of the topic/section",
      "start": number,
      "end": number,
    }
  ]
}

Look for:
- Chapter titles or section headers
- Major topic transitions
- Page indicators in the text (e.g., "--- Page X ---")
- Logical content groupings

IMPORTANT: Ignore indexes or tables of contents - focus only on the actual content sections.

Be thorough and identify all major topics/sections in the document.'''

async def identify_document_topics(input_text: str) -> dict[str, Any]:
    """
    Identify main topics/sections in a document and their page ranges
    """
    print(f"[identify_document_topics] Starting topic identification")
    
    try:
        # Process with OpenAI to identify topics
        topics_result = await __identify_topics_with_openai(input_text)
        
        print(f"[identify_document_topics] Topics analysis: {topics_result}")
        
        return json.loads(topics_result)
        
    except Exception as error:
        print(f"[identify_document_topics] Error: {str(error)}")
        raise error

async def __identify_topics_with_openai(input_text: str) -> str:
    """Process text with OpenAI to identify document topics and page ranges"""
    print(f"[START][identify_topics_with_openai] Processing text with OpenAI")
    
    openai_api_key = os.getenv('OPENAI_API_KEY')
    
    if not openai_api_key:
        raise Exception('Missing OpenAI API key')
    
    client = openai.OpenAI(api_key=openai_api_key)
    
    try:
        response = client.chat.completions.create(
            model='gpt-4.1-mini',
            messages=[
                {
                    'role': 'system',
                    'content': prompt_system
                },
                {
                    'role': 'user',
                    'content': f'Identify the main topics and their page ranges in this text:\n\n{input_text}'
                }
            ],
            max_tokens=4000,
            temperature=0.1,
            response_format={ "type": "json_object" }
        )
        
        topics_result = response.choices[0].message.content
        print(f"[identify_topics_with_openai] Topic identification completed")
        
        return topics_result
        
    except Exception as error:
        raise Exception(f"OpenAI API error: {str(error)}")
