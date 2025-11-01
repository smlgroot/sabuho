"""
OpenAI API client for topic identification and question generation.
"""
import os
import json
from openai import OpenAI


def create_openai_client() -> OpenAI:
    """
    Create and return an OpenAI client instance.

    Returns:
        OpenAI client

    Raises:
        KeyError: If OPENAI_API_KEY is not set
    """
    api_key = os.environ['OPENAI_API_KEY']  # Required - will raise KeyError if not set

    return OpenAI(api_key=api_key)


def call_openai_for_topics(client: OpenAI, text: str) -> dict:
    """
    Call OpenAI to identify document topics and their page ranges.

    Args:
        client: OpenAI client instance
        text: Full document text with page markers

    Returns:
        Dict with format: {"topics": [{"name": "...", "start": 1, "end": 5}, ...]}

    Raises:
        Exception: If OpenAI API call fails or returns invalid JSON
    """
    system_prompt = """You are a helpful assistant that analyzes educational documents and identifies main topics or chapters along with their page ranges.

Your task:
1. Identify distinct topics, chapters, or major sections in the document
2. Determine the page range for each topic based on page markers like "--- Page X ---"
3. Use clear, descriptive names for each topic
4. Ensure page ranges are logical and don't overlap unnecessarily

Return a JSON object with this exact structure:
{
  "topics": [
    {"name": "Topic or Chapter Name", "start": 1, "end": 5},
    {"name": "Another Topic", "start": 6, "end": 10}
  ]
}

Guidelines:
- Topics should be meaningful sections (chapters, major themes, etc.)
- Page ranges should be consecutive and cover the document
- Use Spanish names if the document is in Spanish
- If no clear topics are found, create logical groupings based on content
"""

    user_prompt = f"""Identify the main topics and their page ranges in this document:

{text}

Return the result as JSON."""

    try:
        response = client.chat.completions.create(
            model='gpt-3.5-turbo',  # Faster/cheaper for topic identification
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_prompt}
            ],
            max_tokens=4000,
            temperature=0.1,
            response_format={"type": "json_object"}
        )

        result = json.loads(response.choices[0].message.content)

        # Validate structure
        if 'topics' not in result:
            raise ValueError("OpenAI response missing 'topics' key")

        for topic in result['topics']:
            if 'name' not in topic or 'start' not in topic or 'end' not in topic:
                raise ValueError(f"Invalid topic structure: {topic}")

        print(f"Successfully identified {len(result['topics'])} topics")
        return result

    except json.JSONDecodeError as e:
        raise Exception(f"Failed to parse OpenAI response as JSON: {e}")
    except Exception as e:
        raise Exception(f"OpenAI API call failed: {e}")


def call_openai_for_questions(client: OpenAI, batch_content: str, batch_topics: list) -> list:
    """
    Call OpenAI to generate quiz questions for a batch of topics.

    Args:
        client: OpenAI client instance
        batch_content: Formatted text containing multiple topics
        batch_topics: List of topic dicts in this batch (for context)

    Returns:
        List of question dicts with format:
        [
            {
                "question": "Question text",
                "options": ["Option A", "Option B", "Option C"],
                "correct_answer_index": 0,
                "source_text": "Excerpt from document",
                "topic_name": "Topic this question belongs to"
            },
            ...
        ]

    Raises:
        Exception: If OpenAI API call fails or returns invalid JSON
    """
    system_prompt = """You are an expert educational content creator that generates high-quality multiple-choice quiz questions from educational materials.

Your task:
1. Generate as many meaningful practice questions as possible from the provided text
2. Each question should test understanding of key concepts
3. Provide at least 3 multiple-choice options per question
4. Mark the correct answer with its index (0-based)
5. Include a brief source text excerpt showing where the answer can be found
6. If the text is in Spanish, generate questions in Spanish

Return a JSON object with this exact structure:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer_index": 0,
      "source_text": "Brief relevant excerpt from the source text"
    }
  ]
}

Guidelines:
- Generate diverse questions covering different concepts
- Avoid ambiguous or trick questions
- Options should be plausible but clearly distinguishable
- Source text should be concise but sufficient to verify the answer
- Generate 3-8 questions per topic depending on content richness
"""

    topic_names = [t['name'] for t in batch_topics]
    user_prompt = f"""Generate quiz questions for these topics: {', '.join(topic_names)}

Content:
{batch_content}

Return the result as JSON."""

    try:
        response = client.chat.completions.create(
            model='gpt-4o-mini',  # Better quality for question generation
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_prompt}
            ],
            max_tokens=12000,
            temperature=0.1,
            response_format={"type": "json_object"}
        )

        result = json.loads(response.choices[0].message.content)

        # Validate structure
        if 'questions' not in result:
            raise ValueError("OpenAI response missing 'questions' key")

        questions = result['questions']
        for q in questions:
            required_keys = ['question', 'options', 'correct_answer_index', 'source_text']
            for key in required_keys:
                if key not in q:
                    raise ValueError(f"Question missing required key '{key}': {q}")

        print(f"Successfully generated {len(questions)} questions for {len(batch_topics)} topics")
        return questions

    except json.JSONDecodeError as e:
        raise Exception(f"Failed to parse OpenAI response as JSON: {e}")
    except Exception as e:
        raise Exception(f"OpenAI API call failed: {e}")
