"""
OpenAI LLM Provider Implementation
"""

import json
import tiktoken
from typing import Dict
from openai import OpenAI

from .base_provider import (
    BaseLLMProvider,
    ChatMessage,
    CompletionConfig,
    CompletionResponse
)


class OpenAIProvider(BaseLLMProvider):
    """
    OpenAI implementation of the LLM provider interface.
    """

    # Model configuration
    MODELS = {
        'topic': 'gpt-3.5-turbo',      # Fast and cost-effective for topic identification
        'question': 'gpt-4o-mini',      # Better quality for question generation
    }

    # Context limits (in tokens)
    CONTEXT_LIMITS = {
        'gpt-3.5-turbo': 16385,
        'gpt-4o-mini': 128000,
        'gpt-4o': 128000,
        'gpt-4-turbo': 128000,
    }

    def __init__(self, api_key: str, base_url: str = None):
        """
        Initialize OpenAI provider.

        Args:
            api_key: OpenAI API key
            base_url: Optional base URL for API calls (for compatible APIs)
        """
        super().__init__(api_key)
        self.client = OpenAI(
            api_key=api_key,
            base_url=base_url
        )

    def create_chat_completion(self, config: CompletionConfig) -> CompletionResponse:
        """
        Create a chat completion using OpenAI's API.

        Args:
            config: Configuration for the completion request

        Returns:
            CompletionResponse containing the generated text and metadata

        Raises:
            Exception: If the API call fails
        """
        try:
            # Convert ChatMessage objects to dicts
            messages = [
                {'role': msg.role, 'content': msg.content}
                for msg in config.messages
            ]

            # Build request parameters
            request_params = {
                'model': config.model,
                'messages': messages,
                'max_tokens': config.max_tokens,
                'temperature': config.temperature,
            }

            # Handle response format
            if config.response_format:
                request_params['response_format'] = config.response_format
            elif config.json_mode:
                # Simple JSON mode (not strict)
                request_params['response_format'] = {"type": "json_object"}

            # Make the API call
            response = self.client.chat.completions.create(**request_params)

            # Extract response data
            content = response.choices[0].message.content
            usage = {
                'prompt_tokens': response.usage.prompt_tokens,
                'completion_tokens': response.usage.completion_tokens,
                'total_tokens': response.usage.total_tokens,
            } if response.usage else None

            return CompletionResponse(
                content=content,
                model=response.model,
                usage=usage,
                raw_response=response
            )

        except Exception as e:
            raise Exception(f"OpenAI API call failed: {e}")

    def count_tokens(self, text: str, model: str) -> int:
        """
        Count tokens using tiktoken.

        Args:
            text: The text to tokenize
            model: The model identifier

        Returns:
            Number of tokens
        """
        try:
            encoding = tiktoken.encoding_for_model(model)
            return len(encoding.encode(text))
        except Exception:
            # Fallback to a default encoding if model not found
            encoding = tiktoken.get_encoding("cl100k_base")
            return len(encoding.encode(text))

    def get_model_context_limit(self, model: str) -> int:
        """
        Get the context window size for an OpenAI model.

        Args:
            model: The model identifier

        Returns:
            Maximum number of tokens
        """
        return self.CONTEXT_LIMITS.get(model, 8192)  # Default fallback

    def get_max_output_tokens(self, model: str) -> int:
        """
        Get the maximum output tokens for an OpenAI model.

        OpenAI models generally support high output token limits.

        Args:
            model: The model identifier

        Returns:
            Maximum number of output tokens
        """
        # OpenAI models have generous output token limits
        return 16000  # Safe limit for most OpenAI models

    def supports_structured_output(self) -> bool:
        """
        OpenAI supports structured output (strict JSON schema).

        Returns:
            True
        """
        return True

    def _get_default_models(self) -> Dict[str, str]:
        """
        Get the default OpenAI models for different tasks.

        Returns:
            Dictionary mapping task names to model identifiers
        """
        return self.MODELS.copy()

    def create_structured_schema(self, name: str, schema: Dict) -> Dict:
        """
        Create a structured output schema in OpenAI's format.

        Args:
            name: Schema name
            schema: JSON schema definition

        Returns:
            OpenAI-formatted schema
        """
        return {
            "type": "json_schema",
            "json_schema": {
                "name": name,
                "strict": True,
                "schema": schema
            }
        }
