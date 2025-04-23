from flask import Flask, jsonify
from flask_pymongo import PyMongo
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flasgger import Swagger
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
    
    # Verify MONGO_URI is set
    if not app.config.get('MONGO_URI'):
        app.config['MONGO_URI'] = "mongodb://localhost:27017/clothing_store"
    
    # Configure Redis connection
    global redis_client
    redis_url = app.config.get('REDIS_URL', 'redis://localhost:6379/0')
    redis_client = redis.from_url(redis_url)
    
    # Configure CORS to allow requests from Angular app
    app.config['CORS_HEADERS'] = 'Content-Type,Authorization'
    app.config['CORS_SUPPORTS_CREDENTIALS'] = True
    app.config['CORS_AUTOMATIC_OPTIONS'] = True
    app.config['CORS_EXPOSE_HEADERS'] = 'Content-Type,Authorization'
    
    # Use CORS with proper configuration to handle preflight requests correctly
    CORS(app, 
         origins=["http://localhost:4200", "http://127.0.0.1:4200"],
         allow_headers=["Content-Type", "Authorization"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         supports_credentials=True,
         max_age=3600)
    
    # Handle OPTIONS requests explicitly to avoid redirects
    @app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
    @app.route('/<path:path>', methods=['OPTIONS'])
    def options_handler(path):
        response = app.make_default_options_response()
        return response
    
    # Initialize extensions
    mongo.init_app(app)
    jwt.init_app(app)
    limiter.init_app(app)
    swagger.init_app(app)
    
    # Register error handlers
    register_error_handlers(app)
    
    @jwt.token_in_blocklist_loader
    def check_if_token_in_blocklist(jwt_header, jwt_payload):
        jti = jwt_payload["jti"]
        token_in_redis = redis_client.get(jti)
        return token_in_redis is not None
    
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