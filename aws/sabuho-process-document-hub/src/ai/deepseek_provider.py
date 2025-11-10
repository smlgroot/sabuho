"""
DeepSeek LLM Provider Implementation

DeepSeek provides an OpenAI-compatible API, so we can reuse the OpenAI client
with DeepSeek-specific models and endpoints.
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


class DeepSeekProvider(BaseLLMProvider):
    """
    DeepSeek implementation of the LLM provider interface.

    DeepSeek uses an OpenAI-compatible API, allowing us to use the same client
    but with DeepSeek models and endpoints.
    """

    # DeepSeek API endpoint
    BASE_URL = "https://api.deepseek.com"

    # Model configuration
    MODELS = {
        'topic': 'deepseek-chat',       # DeepSeek's general chat model
        'question': 'deepseek-chat',     # Same model for both tasks (cost-effective)
    }

    # Context limits (in tokens)
    # DeepSeek models typically support large context windows
    CONTEXT_LIMITS = {
        'deepseek-chat': 64000,          # 64K context window
        'deepseek-coder': 64000,
    }

    def __init__(self, api_key: str, base_url: str = None):
        """
        Initialize DeepSeek provider.

        Args:
            api_key: DeepSeek API key
            base_url: Optional base URL (defaults to DeepSeek's API endpoint)
        """
        super().__init__(api_key)
        self.base_url = base_url or self.BASE_URL
        self.client = OpenAI(
            api_key=api_key,
            base_url=self.base_url
        )

    def create_chat_completion(self, config: CompletionConfig) -> CompletionResponse:
        """
        Create a chat completion using DeepSeek's API.

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
            # Note: DeepSeek may not support strict JSON schema like OpenAI
            # We'll use simple JSON mode if requested
            if config.json_mode or config.response_format:
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
            raise Exception(f"DeepSeek API call failed: {e}")

    def count_tokens(self, text: str, model: str) -> int:
        """
        Count tokens for DeepSeek models.

        Note: DeepSeek uses a similar tokenization to OpenAI.
        We use tiktoken with a fallback encoding for estimation.

        Args:
            text: The text to tokenize
            model: The model identifier

        Returns:
            Number of tokens (approximate)
        """
        try:
            # Use cl100k_base encoding (similar to GPT-4)
            encoding = tiktoken.get_encoding("cl100k_base")
            return len(encoding.encode(text))
        except Exception as e:
            # Very rough fallback: ~4 chars per token
            return len(text) // 4

    def get_model_context_limit(self, model: str) -> int:
        """
        Get the context window size for a DeepSeek model.

        Args:
            model: The model identifier

        Returns:
            Maximum number of tokens
        """
        return self.CONTEXT_LIMITS.get(model, 64000)  # Default to 64K

    def get_max_output_tokens(self, model: str) -> int:
        """
        Get the maximum output tokens for a DeepSeek model.

        DeepSeek has a hard limit of 8192 tokens for max_tokens parameter.

        Args:
            model: The model identifier

        Returns:
            Maximum number of output tokens (8192 for DeepSeek)
        """
        return 8192  # DeepSeek's maximum output token limit

    def supports_structured_output(self) -> bool:
        """
        DeepSeek supports JSON mode but not strict JSON schema (as of now).

        Returns:
            False (no strict schema support)
        """
        return False

    def _get_default_models(self) -> Dict[str, str]:
        """
        Get the default DeepSeek models for different tasks.

        Returns:
            Dictionary mapping task names to model identifiers
        """
        return self.MODELS.copy()

    def create_json_mode_request(self) -> Dict:
        """
        Create a JSON mode request format for DeepSeek.

        Returns:
            Response format dict for JSON mode
        """
        return {"type": "json_object"}
