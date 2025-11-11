"""
LLM Client for question generation using configurable providers.

This module provides a provider-agnostic interface for question generation.
It replaces the OpenAI-specific client with a flexible provider system.
"""

import json
from typing import List, Dict
from .provider_factory import get_llm_provider
from .base_provider import BaseLLMProvider, ChatMessage, CompletionConfig


def get_question_generation_schema() -> Dict:
    """
    Get the JSON schema for question generation.

    This schema defines the expected structure for quiz questions.

    Returns:
        JSON schema dict
    """
    return {
        "type": "object",
        "properties": {
            "questions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "topic_name": {"type": "string"},
                        "question": {"type": "string"},
                        "options": {
                            "type": "array",
                            "items": {"type": "string"}
                        },
                        "correct_answer_index": {"type": "integer"},
                        "source_text": {"type": "string"}
                    },
                    "required": ["topic_name", "question", "options", "correct_answer_index", "source_text"],
                    "additionalProperties": False
                }
            }
        },
        "required": ["questions"],
        "additionalProperties": False
    }


def generate_questions_with_llm(provider: BaseLLMProvider, batch_content: str, batch_topics: list) -> list:
    """
    Call LLM provider to generate quiz questions for a batch of topics.

    Args:
        provider: LLM provider instance
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
        Exception: If LLM API call fails or returns invalid JSON
    """
    system_prompt = """You are an expert educational content creator that generates high-quality multiple-choice quiz questions from educational materials.

Your task:
1. Generate questions for ALL topics provided in the content
2. Generate the MAXIMUM number of questions possible from each topic
3. Each question should test understanding of concepts from the content
4. Provide at least 3 multiple-choice options per question
5. Mark the correct answer with its index (0-based)
6. Include a brief source text excerpt showing where the answer can be found
7. Label each question with the exact topic name it belongs to
8. If the text is in Spanish, generate questions in Spanish

CRITICAL: You MUST return valid JSON. Use double quotes (") for all strings, not single quotes (').

Return a JSON object with this exact structure:
{
  "questions": [
    {
      "topic_name": "Exact topic name from the input",
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer_index": 0,
      "source_text": "Brief relevant excerpt from the source text"
    }
  ]
}

JSON FORMATTING RULES (CRITICAL):
- Use double quotes (") for all property names and string values
- Never use single quotes (')
- Ensure all brackets are properly closed: { }, [ ]
- Use proper comma separation between items
- Property names must be: topic_name, question, options, correct_answer_index, source_text
- The "options" field must be an array of strings: ["string1", "string2", "string3"]
- The "correct_answer_index" must be an integer: 0, 1, 2, or 3
- Escape special characters in strings (quotes, backslashes, etc.)

Guidelines:
- Maximize the number of questions - more questions = better learning coverage
- Generate questions from EVERY topic in the batch
- Extract multiple different concepts from each topic to create diverse questions
- Questions should test facts, definitions, relationships, and applications from the content
- Avoid ambiguous or trick questions
- Options should be plausible but clearly distinguishable
- Source text should be concise but sufficient to verify the answer
- Use the exact topic name provided in the input

REMEMBER: Your response must be valid, parseable JSON with proper syntax!
"""

    topic_names = [t['name'] for t in batch_topics]
    user_prompt = f"""Generate quiz questions for these topics: {', '.join(topic_names)}

Content:
{batch_content}

IMPORTANT: Return ONLY valid JSON with double quotes. No markdown, no code blocks, just pure JSON."""

    try:
        # Get the appropriate model for question generation
        model = provider.get_default_question_model()

        # Get provider-specific max output tokens
        max_tokens = provider.get_max_output_tokens(model)
        print(f"[llm_client] Using {provider} with model {model} (max_tokens: {max_tokens})")

        # Prepare messages
        messages = [
            ChatMessage(role='system', content=system_prompt),
            ChatMessage(role='user', content=user_prompt)
        ]

        # Create config
        config = CompletionConfig(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.1,
        )

        # Handle structured output based on provider capabilities
        if provider.supports_structured_output():
            # Use strict schema for providers that support it (OpenAI, Groq)
            from .openai_provider import OpenAIProvider
            from .groq_provider import GroqProvider

            if isinstance(provider, (OpenAIProvider, GroqProvider)):
                schema = get_question_generation_schema()
                config.response_format = provider.create_structured_schema(
                    "question_generation",
                    schema
                )
        else:
            # Use simple JSON mode for others (DeepSeek)
            config.json_mode = True

        # Make the API call
        response = provider.create_chat_completion(config)

        # Parse response
        try:
            result = json.loads(response.content)
        except json.JSONDecodeError as e:
            # Provide helpful error message with partial content
            content_preview = response.content[:500] if len(response.content) > 500 else response.content
            raise Exception(
                f"Failed to parse LLM response as JSON: {e}\n"
                f"Response preview: {content_preview}\n"
                f"Provider: {provider.__class__.__name__}\n"
                f"Hint: The model may need a clearer prompt or different configuration."
            )

        # Validate structure
        if 'questions' not in result:
            raise ValueError("LLM response missing 'questions' key")

        questions = result['questions']
        for q in questions:
            required_keys = ['topic_name', 'question', 'options', 'correct_answer_index', 'source_text']
            for key in required_keys:
                if key not in q:
                    raise ValueError(f"Question missing required key '{key}': {q}")

        print(f"Successfully generated {len(questions)} questions for {len(batch_topics)} topics")
        return questions

    except json.JSONDecodeError as e:
        # Already handled above with better error message
        raise
    except Exception as e:
        raise Exception(f"LLM API call failed: {e}")


# Convenience function for backward compatibility
def call_openai_for_questions(client, batch_content: str, batch_topics: list) -> list:
    """
    Legacy function for backward compatibility.

    This function is deprecated. Use generate_questions_with_llm instead.

    Args:
        client: Ignored (kept for compatibility)
        batch_content: Formatted text containing multiple topics
        batch_topics: List of topic dicts in this batch

    Returns:
        List of question dicts
    """
    provider = get_llm_provider()
    return generate_questions_with_llm(provider, batch_content, batch_topics)
