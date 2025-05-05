import os
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Base configuration."""
    MONGO_URI = os.getenv("MONGO_URI")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=5)
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_BLOCKLIST_ENABLED = True
    JWT_BLOCKLIST_TOKEN_CHECKS = ["access"]
    
    # Redis configuration - used for rate limiting and JWT token blocklisting
    # Can be set to "memory://" if Redis is not available or needed in development
    RATELIMIT_STORAGE_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # API documentation
    SWAGGER = {'title': 'Clothing Store API'}

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    # For development without Redis, you can uncomment this line:
    # RATELIMIT_STORAGE_URL = "memory://"

class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    # In production, Redis should be required
    # Make sure REDIS_URL is set in your production environment

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}