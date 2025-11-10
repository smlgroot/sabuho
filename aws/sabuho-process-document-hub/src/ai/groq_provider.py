"""
Groq LLM Provider Implementation

Groq provides an OpenAI-compatible API with ultra-fast inference through
custom LPU (Language Processing Unit) hardware. Groq delivers 10-20x faster
token generation compared to standard GPU-based providers.

Speed: 800+ tokens/second
Cost: $0.10-$0.99 per million tokens (30-50% cheaper than OpenAI)
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


class GroqProvider(BaseLLMProvider):
    """
    Groq implementation of the LLM provider interface.

    Uses OpenAI-compatible API endpoints with Groq's LPU-accelerated models.
    Provides significantly faster inference speeds (814+ tokens/sec) compared
    to traditional GPU providers.
    """

    # Groq API endpoint (OpenAI-compatible)
    BASE_URL = "https://api.groq.com/openai/v1"

    # Model configuration
    # Groq specializes in fast inference of open-source models
    # Updated January 2025: llama-3.1 deprecated in favor of llama-3.3
    MODELS = {
        'topic': 'llama-3.3-70b-versatile',      # Fast, high-quality topic identification
        'question': 'llama-3.3-70b-versatile',   # Same model for consistency
    }

    # Alternative models (if you want to test different options):
    # 'llama-3.1-8b-instant': Ultra-fast, lower quality (8B parameters)
    # 'llama-3.3-70b-specdec': Speculative decoding variant for even faster inference
    # 'mixtral-8x7b-32768': Good balance of speed and quality
    # 'gemma2-9b-it': Fast, cost-effective

    # Context limits (in tokens)
    CONTEXT_LIMITS = {
        'llama-3.3-70b-versatile': 131072,  # 128K context window
        'llama-3.3-70b-specdec': 131072,    # 128K context window (faster variant)
        'llama-3.1-8b-instant': 131072,
        'mixtral-8x7b-32768': 32768,
        'gemma2-9b-it': 8192,
    }

    def __init__(self, api_key: str, base_url: str = None):
        """
        Initialize Groq provider.

        Args:
            api_key: Groq API key (get from console.groq.com)
            base_url: Optional base URL (defaults to Groq's API endpoint)
        """
        super().__init__(api_key)
        self.base_url = base_url or self.BASE_URL
        self.client = OpenAI(
            api_key=api_key,
            base_url=self.base_url
        )

    def create_chat_completion(self, config: CompletionConfig) -> CompletionResponse:
        """
        Create a chat completion using Groq's ultra-fast API.

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
            # Groq supports structured outputs like OpenAI
            if config.response_format:
                request_params['response_format'] = config.response_format
            elif config.json_mode:
                # Simple JSON mode
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
            raise Exception(f"Groq API call failed: {e}")

    def count_tokens(self, text: str, model: str) -> int:
        """
        Count tokens for Groq models.

        Groq uses Llama and Mixtral models which have similar tokenization
        to GPT models. We use tiktoken with cl100k_base for estimation.

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
        Get the context window size for a Groq model.

        Args:
            model: The model identifier

        Returns:
            Maximum number of tokens
        """
        return self.CONTEXT_LIMITS.get(model, 32768)  # Default to 32K

    def get_max_output_tokens(self, model: str) -> int:
        """
        Get the maximum output tokens for a Groq model.

        For question generation with small batches, we use 4096 tokens
        which is sufficient and faster. Groq's hard limit is 8192.

        Args:
            model: The model identifier

        Returns:
            Maximum number of output tokens (4096 for efficiency)
        """
        return 4096  # Balanced between capacity and speed

    def get_default_batch_token_limit(self, model: str) -> int:
        """
        Get the default batch token limit for Groq.

        Groq free tier has 12,000 TPM limit, so we use smaller batches (3000)
        to stay well under the limit and ensure fast processing.

        Rate limits by tier:
        - Free tier: 12,000 TPM → 3,000 token batches (default)
        - Pay-as-you-go: Higher TPM → set GROQ_BATCH_TOKEN_LIMIT env var

        Args:
            model: The model identifier

        Returns:
            Default batch token limit (3000 for free tier)
        """
        # Free tier safe default
        return 3000

    def supports_structured_output(self) -> bool:
        """
        Groq supports JSON mode but not all models support strict JSON schema.

        llama-3.3-70b-versatile does not support json_schema, only json_object.
        We return False here to use simple JSON mode instead.

        Returns:
            False (use json_object mode, not strict json_schema)
        """
        return False

    def _get_default_models(self) -> Dict[str, str]:
        """
        Get the default Groq models for different tasks.

        Returns:
            Dictionary mapping task names to model identifiers
        """
        return self.MODELS.copy()

    def create_structured_schema(self, name: str, schema: Dict) -> Dict:
        """
        Create a structured output schema in Groq's format.

        Groq uses the same format as OpenAI for structured outputs.

        Args:
            name: Schema name
            schema: JSON schema definition

        Returns:
            Groq-formatted schema (same as OpenAI)
        """
        return {
            "type": "json_schema",
            "json_schema": {
                "name": name,
                "strict": True,
                "schema": schema
            }
        }

    def create_json_mode_request(self) -> Dict:
        """
        Create a JSON mode request format for Groq.

        Returns:
            Response format dict for JSON mode
        """
        return {"type": "json_object"}
