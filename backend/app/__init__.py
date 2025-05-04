from flask import Flask, jsonify, request
from flask_pymongo import PyMongo
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flasgger import Swagger
from flask_cors import CORS
import os
import redis

from app.config import config
from app.utils.error_handler import register_error_handlers

mongo = PyMongo()
jwt = JWTManager()
limiter = Limiter(key_func=get_remote_address)
swagger = Swagger()

# Redis client for JWT blocklist
redis_client = None

__all__ = ['mongo', 'jwt', 'limiter', 'swagger', 'redis_client']

def create_app(config_name='default'):
    """Create and configure the Flask application"""
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(config[config_name])
    
    # Configure CORS properly - IMPORTANT: This must be done before any other extensions
    # that might handle responses to avoid redirect issues with preflight requests
    CORS(app, 
         resources={r"/*": {
             "origins": ["http://localhost:4200", "http://localhost:4200/", "http://127.0.0.1:4200", "http://127.0.0.1:4200/", 
                         "http://localhost:4200/*", "http://127.0.0.1:4200/*"],
             "supports_credentials": True,
             "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
             "expose_headers": ["Content-Type", "Authorization"],
             "max_age": 3600
         }},
         intercept_exceptions=True)
    
    # Configure Redis connection
    global redis_client
    redis_url = app.config.get('REDIS_URL', 'redis://localhost:6379/0')
    try:
        redis_client = redis.from_url(redis_url)
        # Test the connection
        redis_client.ping()
        print("Redis connection successful")
    except redis.exceptions.ConnectionError:
        print("Warning: Redis server is not available. Some features like token blocklisting will be disabled.")
        # Create a mock Redis client that won't cause errors when methods are called
        class MockRedis:
            def get(self, key):
                return None
            def setex(self, *args, **kwargs):
                pass
            def delete(self, *args, **kwargs):
                pass
        redis_client = MockRedis()
    
    # Initialize extensions
    mongo.init_app(app)
    jwt.init_app(app)
    limiter.init_app(app)
    swagger.init_app(app)
    
    # Register error handlers
    register_error_handlers(app)
    
    # Add explicit handler for OPTIONS requests
    @app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
    @app.route('/<path:path>', methods=['OPTIONS'])
    def options_handler(path):
        return '', 200
    
    @jwt.token_in_blocklist_loader
    def check_if_token_in_blocklist(jwt_header, jwt_payload):
        jti = jwt_payload["jti"]
        try:
            token_in_redis = redis_client.get(jti)
            return token_in_redis is not None
        except redis.exceptions.ConnectionError:
            # Redis is not available, log warning and continue
            print("Warning: Redis connection failed. Token validation is disabled.")
            return False
    
    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return jsonify({
            "status": "error",
            "message": "Token has been revoked",
            "code": "token_revoked"
        }), 401
    
    try:
        with app.app_context():
            # Store indexes
            mongo.db.stores.create_index("company_name")
            mongo.db.stores.create_index("location")
            mongo.db.stores.create_index("owner")
            mongo.db.stores.create_index("average_rating")
            mongo.db.stores.create_index("work_type")
            
            # User indexes
            mongo.db.users.create_index("username", unique=True)
            mongo.db.users.create_index("email", unique=True, sparse=True)
            
            # Review indexes
            mongo.db.reviews.create_index("store_id")
            mongo.db.reviews.create_index("user_id")
            mongo.db.reviews.create_index([("store_id", 1), ("user_id", 1)])
            mongo.db.reviews.create_index("created_at")
            mongo.db.reviews.create_index("rating")
            
            # Product indexes
            mongo.db.products.create_index("name")
            mongo.db.products.create_index("price")
            mongo.db.products.create_index("category")
            mongo.db.products.create_index("store_id")
            
            # Cart indexes
            mongo.db.cart.create_index("user_id")
            mongo.db.cart.create_index([("user_id", 1), ("product_id", 1)], unique=True)
            mongo.db.cart.create_index("added_at")
            
            # Order indexes
            mongo.db.orders.create_index("user_id")
            mongo.db.orders.create_index("status")
            mongo.db.orders.create_index("created_at")
            
            print("Database indexes created successfully")
    except Exception as e:
        print(f"Index creation warning: {str(e)}")

    # Health check endpoint
    @app.route('/health')
    def health_check():
        return jsonify({"status": "healthy", "message": "API is running"}), 200

    from app.routes import register_blueprints
    register_blueprints(app)
    
    return app