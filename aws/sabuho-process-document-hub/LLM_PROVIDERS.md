# LLM Provider Configuration

This document explains how to configure and switch between different LLM providers in the document processing hub.

## Overview

The system supports multiple LLM providers through a flexible abstraction layer. You can easily switch between providers by changing environment variables - only one provider is active at a time.

## Supported Providers

### 1. Groq (⚡ Recommended)
- **Provider ID**: `groq`
- **Models**:
  - Topic Identification: `llama-3.3-70b-versatile` (updated Jan 2025)
  - Question Generation: `llama-3.3-70b-versatile`
- **Speed**: 814+ tokens/second (10-20x faster than other providers)
- **Features**:
  - Ultra-fast inference via custom LPU (Language Processing Unit) hardware
  - OpenAI-compatible API
  - Structured JSON output support
  - 128K context window
  - 30-50% cheaper than OpenAI
- **API Docs**: https://console.groq.com/docs
- **Get API Key**: https://console.groq.com

### 2. OpenAI
- **Provider ID**: `openai`
- **Models**:
  - Topic Identification: `gpt-3.5-turbo`
  - Question Generation: `gpt-4o-mini`
- **Features**: Structured JSON output, high quality, reliable

### 3. DeepSeek
- **Provider ID**: `deepseek`
- **Models**:
  - Topic Identification: `deepseek-chat`
  - Question Generation: `deepseek-chat`
- **Features**: Cost-effective, OpenAI-compatible API, context caching
- **API Docs**: https://api-docs.deepseek.com/

## Configuration

### Environment Variables

The LLM provider is configured using environment variables in your `.env` file:

```bash
# Select active provider (only one at a time)
LLM_PROVIDER=groq  # Options: groq, openai, deepseek
# Recommended: groq (10-20x faster, 30-50% cheaper)

# Groq Configuration (Ultra-Fast - Recommended)
GROQ_API_KEY=your-groq-api-key-here
# GROQ_BASE_URL=https://api.groq.com/openai/v1  # Optional override

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-xxxxx
# OPENAI_BASE_URL=https://api.openai.com/v1  # Optional override

# DeepSeek Configuration
# DEEPSEEK_API_KEY=your-api-key-here
# DEEPSEEK_BASE_URL=https://api.deepseek.com  # Optional override

# Batch Token Limits (Optional - adjusts batch size per provider)
# GROQ_BATCH_TOKEN_LIMIT=3000        # Default: 3000 (free tier safe)
# OPENAI_BATCH_TOKEN_LIMIT=90000     # Default: auto-calculated
# DEEPSEEK_BATCH_TOKEN_LIMIT=44000   # Default: auto-calculated
```

### Switching Providers

To switch to Groq (recommended for speed):

1. Get a Groq API key:
   - Visit https://console.groq.com
   - Sign up for a free account
   - Generate an API key

2. Update your `.env` file:
   ```bash
   # Change this line
   LLM_PROVIDER=groq

   # Add your Groq API key
   GROQ_API_KEY=your-groq-api-key-here
   ```

3. Restart the application

That's it! The system will automatically use Groq for ultra-fast LLM operations.

To switch to any other provider, just change `LLM_PROVIDER` to `openai` or `deepseek` and ensure the corresponding API key is set.

### Adjusting Batch Sizes

Batch sizes control how many topics are processed per API request. Each provider automatically reads its configuration from environment variables using the pattern: `{PROVIDER}_BATCH_TOKEN_LIMIT`

**Environment variables** (all optional):
- `GROQ_BATCH_TOKEN_LIMIT` - Default: 3,000 (free tier safe)
- `OPENAI_BATCH_TOKEN_LIMIT` - Default: ~90,000 (auto-calculated)
- `DEEPSEEK_BATCH_TOKEN_LIMIT` - Default: ~44,000 (auto-calculated)

**When to adjust:**
- **Groq paid tier**: Increase `GROQ_BATCH_TOKEN_LIMIT` to 6000-10000
- **Rate limit errors**: Decrease batch limit
- **Faster processing**: Smaller batches = more parallel requests (but watch rate limits)

**Example** (.env file):
```bash
# Free tier Groq (uses default: 3000)
# No need to set anything

# Paid tier Groq (higher TPM)
GROQ_BATCH_TOKEN_LIMIT=8000

# OpenAI custom limit
OPENAI_BATCH_TOKEN_LIMIT=50000
```

**How it works:**
The base provider class dynamically reads `{PROVIDER_NAME}_BATCH_TOKEN_LIMIT` from environment variables. If not set, each provider uses sensible defaults based on its context limits and rate limits.

### AWS ECS/Production Configuration

For production deployments, set the environment variables in your ECS task definition or AWS Secrets Manager:

```json
{
  "environment": [
    {
      "name": "LLM_PROVIDER",
      "value": "groq"
    }
  ],
  "secrets": [
    {
      "name": "GROQ_API_KEY",
      "valueFrom": "arn:aws:secretsmanager:us-east-1:xxx:secret:groq-api-key"
    },
    {
      "name": "OPENAI_API_KEY",
      "valueFrom": "arn:aws:secretsmanager:us-east-1:xxx:secret:openai-api-key"
    },
    {
      "name": "DEEPSEEK_API_KEY",
      "valueFrom": "arn:aws:secretsmanager:us-east-1:xxx:secret:deepseek-api-key"
    }
  ]
}
```

## Architecture

### Provider Abstraction

The system uses a provider abstraction pattern:

```
Application Code
    ↓
Provider Factory (provider_factory.py)
    ↓
Base Provider Interface (base_provider.py)
    ↓
├── Groq Provider (groq_provider.py) ⚡ Ultra-fast
├── OpenAI Provider (openai_provider.py)
├── DeepSeek Provider (deepseek_provider.py)
└── [Future providers...]
```

### Key Components

1. **Base Provider Interface** (`base_provider.py`)
   - Defines the contract all providers must implement
   - Methods: `create_chat_completion()`, `count_tokens()`, `supports_structured_output()`
   - **Dynamic configuration**: Automatically reads `{PROVIDER}_BATCH_TOKEN_LIMIT` from environment
   - Providers only override `get_default_batch_token_limit()` if they need custom defaults

2. **Provider Factory** (`provider_factory.py`)
   - Singleton pattern ensures only one provider is active
   - Reads `LLM_PROVIDER` environment variable
   - Instantiates the appropriate provider

3. **Provider Implementations**
   - `groq_provider.py`: Groq API implementation (OpenAI-compatible, ultra-fast)
   - `openai_provider.py`: OpenAI API implementation
   - `deepseek_provider.py`: DeepSeek API implementation (OpenAI-compatible)
   - Each provider inherits base functionality, only overriding what's unique

### Usage in Code

The application code uses a simple pattern:

```python
from ai.provider_factory import get_llm_provider
from ai.base_provider import ChatMessage, CompletionConfig

# Get the active provider
provider = get_llm_provider()

# Create a completion
config = CompletionConfig(
    model=provider.get_default_topic_model(),
    messages=[
        ChatMessage(role='system', content='You are a helpful assistant'),
        ChatMessage(role='user', content='Hello!')
    ],
    max_tokens=1000,
    temperature=0.7
)

response = provider.create_chat_completion(config)
print(response.content)
```

## Adding New Providers

Adding a new provider is simple thanks to the base class design:

1. **Create provider class** in `src/ai/`:
   ```python
   from .base_provider import BaseLLMProvider

   class MyProviderProvider(BaseLLMProvider):
       def create_chat_completion(self, config):
           # Implement API call
           pass

       def count_tokens(self, text, model):
           # Implement token counting
           pass

       def get_model_context_limit(self, model):
           return 128000  # Your provider's limit

       def get_max_output_tokens(self, model):
           return 4096  # Your provider's limit

       def supports_structured_output(self):
           return True  # or False

       def _get_default_models(self):
           return {
               'topic': 'your-model-name',
               'question': 'your-model-name'
           }

       # Optional: Override only if you need custom batch size logic
       def get_default_batch_token_limit(self, model):
           return 5000  # Custom default
   ```

2. **Register in `provider_factory.py`**:
   ```python
   PROVIDERS = {
       'myprovider': MyProviderProvider,  # Add this
   }

   ENV_API_KEYS = {
       'myprovider': 'MYPROVIDER_API_KEY',  # Add this
   }
   ```

3. **Update `.env`**:
   ```bash
   LLM_PROVIDER=myprovider
   MYPROVIDER_API_KEY=your-key
   # MYPROVIDER_BATCH_TOKEN_LIMIT=5000  # Optional
   ```

4. **Done!** The base class handles environment variable reading automatically.

**Note**: You don't need to override `get_batch_token_limit()` - the base class automatically reads `MYPROVIDER_BATCH_TOKEN_LIMIT` from the environment based on your class name.

## Cost Considerations

Different providers have different pricing models:

### Groq Pricing (Best Value - as of 2025)
- Llama 3.1 70B: ~$0.59 / 1M input tokens, ~$0.79 / 1M output tokens
- Llama 3.1 8B: ~$0.05 / 1M input tokens, ~$0.08 / 1M output tokens
- Gemma 7B: ~$0.10 / 1M tokens (both input and output)
- **Speed Premium**: 10-20x faster with 30-50% lower cost than OpenAI
- Check https://groq.com/pricing for current rates

### OpenAI Pricing (as of 2024)
- GPT-3.5-turbo: ~$0.50 / 1M input tokens, ~$1.50 / 1M output tokens
- GPT-4o-mini: ~$0.15 / 1M input tokens, ~$0.60 / 1M output tokens

### DeepSeek Pricing
- DeepSeek-chat: Significantly cheaper than OpenAI
- **Context Caching**: Automatic 90% cost savings on cached requests
- Check https://platform.deepseek.com/pricing for current rates

### Cost Optimization Tips
1. **Use Groq for production**: Fastest speed + lowest cost
2. **Use DeepSeek for development/testing**: Cheaper for experimentation with caching
3. **Monitor token usage**: Check provider response usage data
4. **Optimize prompts**: Reduce token count where possible
5. **Use TOC detection first**: Falls back to LLM only when needed

## Testing

The provider system is designed to be easily testable:

```python
from ai.provider_factory import ProviderFactory
from ai.openai_provider import OpenAIProvider

# In tests, you can create providers directly
provider = OpenAIProvider(api_key="test-key")

# Or use the factory
ProviderFactory.reset()  # Reset singleton
provider = ProviderFactory.create_provider('openai')
```

## Troubleshooting

### Provider Not Found Error
```
ValueError: Unsupported LLM provider: 'xxx'
```
**Solution**: Check that `LLM_PROVIDER` is set to a valid provider name (groq, openai, deepseek)

### API Key Missing Error
```
KeyError: API key not found. Please set OPENAI_API_KEY environment variable.
```
**Solution**: Ensure the required API key is set in your `.env` file or environment

### JSON Parsing Errors
Some providers may not support strict JSON schemas. The system automatically falls back to JSON mode for providers that don't support structured output.

### Rate Limiting
Different providers have different rate limits. The system includes built-in delays between batches to avoid hitting limits.

## Performance Comparison

| Provider | Speed | Quality | Cost | Structured Output | Recommendation |
|----------|-------|---------|------|-------------------|----------------|
| **Groq** | **⚡ Ultra-Fast (814+ t/s)** | **High** | **$ (Cheapest)** | **Yes (strict schema)** | **✅ Best for Production** |
| OpenAI   | Moderate | High    | $$   | Yes (strict schema) | Good fallback |
| DeepSeek | Slow (13s first request) | Good    | $ (with caching) | JSON mode only | Development/Testing |

**Key Metrics:**
- **Groq**: 814+ tokens/second, sub-second latency, 30-50% cheaper than OpenAI
- **OpenAI**: ~50-100 tokens/second, 1-2s latency, reliable and mature
- **DeepSeek**: ~50 tokens/second, 13s cold start (0.5s cached), 90% cost savings on cached requests

## Future Providers

The architecture is designed to support additional providers:
- Anthropic Claude
- Google Gemini
- Azure OpenAI
- Local models (Ollama, LM Studio)
- Custom endpoints

Each can be added by implementing the `BaseLLMProvider` interface.
