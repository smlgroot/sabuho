"""
Configuration management for different environments.
"""

import os
from typing import Dict, Any, Optional
from enum import Enum


class Environment(Enum):
    """Environment types."""
    LOCAL = "local"
    TEST = "test"
    LAMBDA = "lambda"
    ECS = "ecs"
    PRODUCTION = "production"


class Config:
    """Application configuration based on environment."""

    def __init__(self):
        self.env_type = self._detect_environment()
        self.config = self._load_config()

    def _detect_environment(self) -> Environment:
        """Detect the current environment."""
        env = os.environ.get('APP_ENV_TYPE', '').lower()

        if env == 'lambda' or os.environ.get('AWS_LAMBDA_FUNCTION_NAME'):
            return Environment.LAMBDA
        elif env == 'ecs' or os.environ.get('ECS_CONTAINER_METADATA_URI'):
            return Environment.ECS
        elif env == 'test':
            return Environment.TEST
        elif env == 'local':
            return Environment.LOCAL
        elif env == 'production':
            return Environment.PRODUCTION
        else:
            # Default to local for development
            return Environment.LOCAL

    def _load_config(self) -> Dict[str, Any]:
        """Load configuration based on environment."""
        base_config = {
            # AWS Configuration
            'aws_region': os.environ.get('AWS_REGION', 'us-east-1'),
            'aws_access_key_id': os.environ.get('AWS_ACCESS_KEY_ID'),
            'aws_secret_access_key': os.environ.get('AWS_SECRET_ACCESS_KEY'),

            # S3 Configuration
            's3_bucket': os.environ.get('AWS_S3_BUCKET', 'sabuho-files'),

            # SQS Configuration
            'sqs_queue_url': os.environ.get('SQS_QUEUE_URL'),
            'output_queue_url': os.environ.get('OUTPUT_QUEUE_URL'),

            # Supabase Configuration
            'supabase_url': os.environ.get('SUPABASE_URL'),
            'supabase_service_key': os.environ.get('SUPABASE_SERVICE_KEY'),

            # OpenAI Configuration
            'openai_api_key': os.environ.get('OPENAI_API_KEY'),

            # Application Settings
            'log_level': os.environ.get('LOG_LEVEL', 'INFO'),
            'max_workers': int(os.environ.get('MAX_WORKERS', '4')),
            'processing_timeout': int(os.environ.get('PROCESSING_TIMEOUT', '300')),
        }

        # Environment-specific overrides
        if self.env_type in [Environment.LOCAL, Environment.TEST]:
            base_config.update({
                'aws_endpoint_url': os.environ.get('AWS_ENDPOINT_URL', 'http://localstack:4566'),
                'use_ssl': False,
                'verify_ssl': False,
                'mock_external_apis': self.env_type == Environment.TEST,
                'debug_mode': True,
            })

            # Override OpenAI endpoint for testing
            if self.env_type == Environment.TEST:
                base_config['openai_api_base'] = os.environ.get(
                    'OPENAI_API_BASE',
                    'http://openai-mock:4010'
                )

        elif self.env_type == Environment.ECS:
            base_config.update({
                'efs_mount_path': os.environ.get('EFS_MOUNT_PATH', '/efs/app'),
                'code_s3_bucket': os.environ.get('CODE_S3_BUCKET'),
                'code_s3_key': os.environ.get('CODE_S3_KEY'),
                'health_check_port': int(os.environ.get('HEALTH_CHECK_PORT', '8080')),
                'enable_xray': os.environ.get('ENABLE_XRAY', 'false').lower() == 'true',
            })

        elif self.env_type == Environment.LAMBDA:
            base_config.update({
                'lambda_timeout': int(os.environ.get('LAMBDA_TIMEOUT', '900')),  # 15 minutes
                'lambda_memory': int(os.environ.get('LAMBDA_MEMORY', '3008')),  # MB
                'enable_xray': os.environ.get('ENABLE_XRAY', 'true').lower() == 'true',
            })

        return base_config

    def get(self, key: str, default: Any = None) -> Any:
        """Get a configuration value."""
        return self.config.get(key, default)

    def get_aws_client_config(self, service: str) -> Dict[str, Any]:
        """Get AWS client configuration for a specific service."""
        config = {
            'region_name': self.get('aws_region'),
        }

        # Add endpoint URL for local development
        if self.env_type in [Environment.LOCAL, Environment.TEST]:
            endpoint_url = self.get('aws_endpoint_url')
            if endpoint_url:
                config['endpoint_url'] = endpoint_url
                config['use_ssl'] = self.get('use_ssl', False)
                config['verify'] = self.get('verify_ssl', False)

        # Add credentials if explicitly set (for local development)
        if self.get('aws_access_key_id'):
            config['aws_access_key_id'] = self.get('aws_access_key_id')
        if self.get('aws_secret_access_key'):
            config['aws_secret_access_key'] = self.get('aws_secret_access_key')

        return config

    def is_local(self) -> bool:
        """Check if running in local environment."""
        return self.env_type in [Environment.LOCAL, Environment.TEST]

    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.env_type in [Environment.PRODUCTION, Environment.LAMBDA, Environment.ECS]

    def is_test(self) -> bool:
        """Check if running in test environment."""
        return self.env_type == Environment.TEST

    def should_mock_external_apis(self) -> bool:
        """Check if external APIs should be mocked."""
        return self.get('mock_external_apis', False)

    def __repr__(self) -> str:
        return f"<Config env={self.env_type.value}>"


# Singleton instance
_config: Optional[Config] = None


def get_config() -> Config:
    """Get the configuration singleton."""
    global _config
    if _config is None:
        _config = Config()
    return _config


# Convenience function for getting config values
def get(key: str, default: Any = None) -> Any:
    """Get a configuration value."""
    return get_config().get(key, default)