"""
LLM Provider Factory

This module provides a factory for creating and managing LLM provider instances.
It handles provider selection based on environment configuration.
"""

import os
from typing import Optional
from .base_provider import BaseLLMProvider
from .openai_provider import OpenAIProvider
from .deepseek_provider import DeepSeekProvider
from .groq_provider import GroqProvider


class ProviderFactory:
    """
    Factory class for creating LLM provider instances.

    The factory reads the LLM_PROVIDER environment variable to determine
    which provider to instantiate. It ensures only one provider is active
    at a time.
    """

    # Supported providers
    PROVIDERS = {
        'openai': OpenAIProvider,
        'deepseek': DeepSeekProvider,
        'groq': GroqProvider,
    }

    # Environment variable configuration keys
    ENV_PROVIDER = 'LLM_PROVIDER'
    ENV_API_KEYS = {
        'openai': 'OPENAI_API_KEY',
        'deepseek': 'DEEPSEEK_API_KEY',
        'groq': 'GROQ_API_KEY',
    }
    ENV_BASE_URLS = {
        'openai': 'OPENAI_BASE_URL',  # Optional override
        'deepseek': 'DEEPSEEK_BASE_URL',  # Optional override
        'groq': 'GROQ_BASE_URL',  # Optional override
    }

    # Singleton instance
    _instance: Optional[BaseLLMProvider] = None
    _current_provider_name: Optional[str] = None

    @classmethod
    def create_provider(cls, provider_name: str = None) -> BaseLLMProvider:
        """
        Create an LLM provider instance.

        Args:
            provider_name: Provider name ('openai', 'deepseek', etc.)
                          If None, reads from LLM_PROVIDER env var

        Returns:
            Configured LLM provider instance

        Raises:
            ValueError: If provider name is invalid or unsupported
            KeyError: If required API key is not set
        """
        # Determine provider name
        if provider_name is None:
            provider_name = os.environ.get(cls.ENV_PROVIDER, 'openai').lower()
        else:
            provider_name = provider_name.lower()

        # Validate provider
        if provider_name not in cls.PROVIDERS:
            supported = ', '.join(cls.PROVIDERS.keys())
            raise ValueError(
                f"Unsupported LLM provider: '{provider_name}'. "
                f"Supported providers: {supported}"
            )

        # Get API key (required)
        api_key_env = cls.ENV_API_KEYS.get(provider_name)
        if not api_key_env:
            raise ValueError(f"No API key configuration for provider: {provider_name}")

        api_key = os.environ.get(api_key_env)
        if not api_key:
            raise KeyError(
                f"API key not found. Please set {api_key_env} environment variable."
            )

        # Get optional base URL override
        base_url_env = cls.ENV_BASE_URLS.get(provider_name)
        base_url = os.environ.get(base_url_env) if base_url_env else None

        # Instantiate provider
        provider_class = cls.PROVIDERS[provider_name]

        # Create instance with appropriate parameters
        if base_url:
            provider = provider_class(api_key=api_key, base_url=base_url)
        else:
            provider = provider_class(api_key=api_key)

        print(f"✓ LLM Provider initialized: {provider_name}")
        return provider

    @classmethod
    def get_provider(cls, force_new: bool = False) -> BaseLLMProvider:
        """
        Get the active LLM provider instance (singleton pattern).

        This method ensures only one provider is active at a time.
        Subsequent calls return the same instance unless force_new is True.

        Args:
            force_new: If True, creates a new instance even if one exists

        Returns:
            Active LLM provider instance

        Raises:
            ValueError: If provider configuration is invalid
            KeyError: If required API key is not set
        """
        current_provider = os.environ.get(cls.ENV_PROVIDER, 'openai').lower()

        # Create new instance if:
        # 1. No instance exists
        # 2. force_new is True
        # 3. Provider has changed
        if (cls._instance is None or
            force_new or
            cls._current_provider_name != current_provider):

            cls._instance = cls.create_provider(current_provider)
            cls._current_provider_name = current_provider

        return cls._instance

    @classmethod
    def reset(cls):
        """
        Reset the singleton instance.

        Useful for testing or when provider configuration changes.
        """
        cls._instance = None
        cls._current_provider_name = None

    @classmethod
    def get_current_provider_name(cls) -> str:
        """
        Get the name of the currently configured provider.

        Returns:
            Provider name (e.g., 'openai', 'deepseek')
        """
        return os.environ.get(cls.ENV_PROVIDER, 'openai').lower()

    @classmethod
    def list_providers(cls) -> list:
        """
        List all supported provider names.

        Returns:
            List of provider names
        """
        return list(cls.PROVIDERS.keys())


def get_llm_provider() -> BaseLLMProvider:
    """
    Convenience function to get the active LLM provider.

    This is the primary function that should be used throughout the application
    to access the LLM provider.

    Returns:
        Active LLM provider instance

    Example:
        >>> from ai.provider_factory import get_llm_provider
        >>> provider = get_llm_provider()
        >>> response = provider.create_chat_completion(config)
    """
    return ProviderFactory.get_provider()
