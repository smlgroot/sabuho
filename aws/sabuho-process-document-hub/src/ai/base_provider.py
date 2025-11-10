"""
Base LLM Provider Interface

This module defines the abstract interface that all LLM providers must implement.
It allows for seamless switching between different LLM providers (OpenAI, DeepSeek, etc.)
while maintaining a consistent API.
"""

import os
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
from dataclasses import dataclass


@dataclass
class ChatMessage:
    """Represents a chat message in the conversation."""
    role: str  # 'system', 'user', or 'assistant'
    content: str


@dataclass
class CompletionConfig:
    """Configuration for LLM completion requests."""
    model: str
    messages: List[ChatMessage]
    max_tokens: int
    temperature: float = 0.1
    response_format: Optional[Dict[str, Any]] = None
    json_mode: bool = False


@dataclass
class CompletionResponse:
    """Response from LLM completion."""
    content: str
    model: str
    usage: Optional[Dict[str, int]] = None
    raw_response: Optional[Any] = None


class BaseLLMProvider(ABC):
    """
    Abstract base class for LLM providers.

    All LLM providers (OpenAI, DeepSeek, Claude, etc.) must implement this interface
    to ensure consistent behavior across the application.
    """

    def __init__(self, api_key: str):
        """
        Initialize the provider with an API key.

        Args:
            api_key: The API key for authentication
        """
        self.api_key = api_key

    @abstractmethod
    def create_chat_completion(self, config: CompletionConfig) -> CompletionResponse:
        """
        Create a chat completion using the provider's API.

        Args:
            config: Configuration for the completion request

        Returns:
            CompletionResponse containing the generated text and metadata

        Raises:
            Exception: If the API call fails
        """
        pass

    @abstractmethod
    def count_tokens(self, text: str, model: str) -> int:
        """
        Count the number of tokens in a text string for a specific model.

        Args:
            text: The text to tokenize
            model: The model identifier

        Returns:
            Number of tokens
        """
        pass

    @abstractmethod
    def get_model_context_limit(self, model: str) -> int:
        """
        Get the context window size (token limit) for a specific model.

        Args:
            model: The model identifier

        Returns:
            Maximum number of tokens the model can handle
        """
        pass

    @abstractmethod
    def get_max_output_tokens(self, model: str) -> int:
        """
        Get the maximum output tokens allowed for a specific model.

        Args:
            model: The model identifier

        Returns:
            Maximum number of output tokens allowed
        """
        pass

    @abstractmethod
    def supports_structured_output(self) -> bool:
        """
        Check if the provider supports structured/strict JSON output.

        Returns:
            True if structured output is supported, False otherwise
        """
        pass

    def get_default_topic_model(self) -> str:
        """
        Get the default model to use for topic identification.

        Returns:
            Model identifier string
        """
        return self._get_default_models()['topic']

    def get_default_question_model(self) -> str:
        """
        Get the default model to use for question generation.

        Returns:
            Model identifier string
        """
        return self._get_default_models()['question']

    def get_batch_token_limit(self, model: str) -> int:
        """
        Get the recommended batch token limit for input.

        This method provides automatic environment variable configuration for all providers
        without requiring each provider to implement its own logic.

        **How it works:**
        1. Derives provider name from class name (e.g., "GroqProvider" -> "GROQ")
        2. Constructs env var name: {PROVIDER_NAME}_BATCH_TOKEN_LIMIT
        3. Reads from environment variable if set
        4. Falls back to provider's get_default_batch_token_limit() if not set

        **For provider implementers:**
        - You don't need to override this method
        - Only override get_default_batch_token_limit() if you need custom defaults
        - The environment variable reading is handled automatically

        **Examples:**
        - GroqProvider reads GROQ_BATCH_TOKEN_LIMIT
        - OpenAIProvider reads OPENAI_BATCH_TOKEN_LIMIT
        - DeepSeekProvider reads DEEPSEEK_BATCH_TOKEN_LIMIT

        Args:
            model: The model identifier

        Returns:
            Recommended maximum input tokens per batch
        """
        # Get provider name from class (e.g., "GroqProvider" -> "GROQ")
        provider_name = self.__class__.__name__.replace('Provider', '').upper()
        env_var_name = f"{provider_name}_BATCH_TOKEN_LIMIT"

        # Try to read from environment variable
        env_value = os.environ.get(env_var_name)
        if env_value:
            try:
                limit = int(env_value)
                # Validate range (1K to 100K tokens)
                return max(1000, min(limit, 100000))
            except (ValueError, TypeError):
                pass

        # Fall back to provider-specific default
        return self.get_default_batch_token_limit(model)

    def get_default_batch_token_limit(self, model: str) -> int:
        """
        Get the default batch token limit when no env var is set.

        Providers can override this method to provide custom defaults
        (e.g., Groq's free tier requires smaller batches).

        Default implementation: 80% of (context_limit - max_output_tokens)

        Args:
            model: The model identifier

        Returns:
            Default batch token limit
        """
        context_limit = self.get_model_context_limit(model)
        max_output = self.get_max_output_tokens(model)
        # Use 80% of available context after reserving space for output
        return int((context_limit - max_output) * 0.8)

    @abstractmethod
    def _get_default_models(self) -> Dict[str, str]:
        """
        Get the default models for different tasks.

        Returns:
            Dictionary mapping task names to model identifiers
        """
        pass

    def __str__(self) -> str:
        """String representation of the provider."""
        return f"{self.__class__.__name__}"
