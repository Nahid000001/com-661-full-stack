from datetime import timedelta

class Config:
    """Base configuration."""
    MONGO_URI = "mongodb://localhost:27017/clothing_store"
    JWT_SECRET_KEY = "clothing_store"
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=5)
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_BLOCKLIST_ENABLED = True
    JWT_BLOCKLIST_TOKEN_CHECKS = ["access"]
    RATELIMIT_STORAGE_URL = "redis://localhost:6379/0"
    SWAGGER = {'title': 'Clothing Store API'}

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True

class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}