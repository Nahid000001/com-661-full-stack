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

mongo = PyMongo()
jwt = JWTManager()
limiter = Limiter(key_func=get_remote_address)
swagger = Swagger()

JWT_BLOCKLIST = set()

__all__ = ['mongo', 'jwt', 'limiter', 'swagger', 'JWT_BLOCKLIST']

def create_app(config_name='default'):
    """Create and configure the Flask application"""
    app = Flask(__name__)
    
    app.config.from_object(config[config_name])

# ✅ Configure CORS
    if app.config['DEBUG']:
        CORS(app)  # Allow all origins in development
    else:
        CORS(app, resources={r"/*": {"origins": "https://localhost:4200.com"}})

    CORS(app)
    mongo.init_app(app)
    jwt.init_app(app)
    limiter.init_app(app)
    swagger.init_app(app)
    
    @jwt.token_in_blocklist_loader
    def check_if_token_in_blocklist(jwt_header, jwt_payload):
        jti = jwt_payload["jti"]
        return jti in JWT_BLOCKLIST
    
    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return jsonify({
            "status": "error",
            "message": "Token has been revoked",
            "code": "token_revoked"
        }), 401
    
    try:
        with app.app_context():
            mongo.db.stores.create_index("company_name")
            mongo.db.stores.create_index("location")
    except Exception as e:
        print(f"Index creation warning: {str(e)}")

    from app.routes import register_blueprints
    register_blueprints(app)
    
    return app