from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token, 
    create_refresh_token,
    jwt_required, 
    get_jwt_identity,
    get_jwt
)
from app import limiter, redis_client
from app.models import user
import flask
from datetime import datetime, timedelta, timezone
from app.models.user import User
from app import jwt, mongo

# Creating blueprint
auth_bp = Blueprint('auth', __name__)

# JWT token expiration time (for Redis)
ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)   # Should match JWT_ACCESS_TOKEN_EXPIRES in config
REFRESH_TOKEN_EXPIRES = timedelta(days=30)     # Should match JWT_REFRESH_TOKEN_EXPIRES in config

@auth_bp.route('/register', methods=['POST'])
@limiter.limit("5 per minute")  # Rate limit registration attempts
def register():
    """Register a new user"""
    data = request.get_json()
    
    # Check if user already exists with the same email
    existing_user = User.get_user_by_email(data.get('email'))
    if existing_user:
        return jsonify({"msg": "User with this email already exists"}), 409
    
    # Check if username already exists
    existing_username = User.get_user_by_username(data.get('username'))
    if existing_username:
        return jsonify({"msg": "Username already taken"}), 409
    
    # Create new user
    user_id = User.create_user(
        email=data.get('email'),
        password=data.get('password'),
        first_name=data.get('first_name'),
        last_name=data.get('last_name'),
        username=data.get('username'),
        role=data.get('role', 'customer')  # Allow setting role during registration
    )
    
    return jsonify({"msg": "User created successfully", "user_id": user_id}), 201

@auth_bp.route('/login', methods=['POST'])
@limiter.limit("10 per minute")  # Rate limit login attempts
def login():
    """Login a user and return tokens"""
    data = request.get_json()
    emailOrUsername = data.get('emailOrUsername')
    password = data.get('password')
    
    # Try to find user by email first
    user = User.get_user_by_email(emailOrUsername)
    
    # If not found by email, try by username
    if not user:
        user = User.get_user_by_username(emailOrUsername)
    
    # If user not found or password incorrect
    if not user or not User.check_password(user, password):
        return jsonify({"msg": "Invalid credentials"}), 401
    
    # Create tokens
    access_token = create_access_token(
        identity=str(user['_id']),
        fresh=True,
        additional_claims={
            "email": user.get('email', ''),
            "username": user.get('username', ''),
            "role": user.get('role', 'customer')  # Include role in token
        }
    )
    refresh_token = create_refresh_token(
        identity=str(user['_id']),
        additional_claims={"role": user.get('role', 'customer')}  # Include role in refresh token
    )
    
    return jsonify({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": str(user['_id']),
            "email": user.get('email', ''),
            "first_name": user.get('first_name', ''),
            "last_name": user.get('last_name', ''),
            "username": user.get('username', ''),
            "role": user.get('role', 'customer')  # Include role in response
        }
    }), 200

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
@limiter.limit("20 per minute")  # Rate limit token refreshing
def refresh():
    """Refresh access token"""
    identity = get_jwt_identity()
    
    # Get user info to include role in new token
    user = User.get_user_by_id(identity)
    if not user:
        return jsonify({"msg": "User not found"}), 404
        
    # Get claims from refresh token
    jwt_data = get_jwt()
    
    access_token = create_access_token(
        identity=identity,
        fresh=False,
        additional_claims={
            "email": user.get('email', ''),
            "username": user.get('username', ''),
            "role": user.get('role', 'customer')  # Include role in new access token
        }
    )
    
    return jsonify({"access_token": access_token}), 200

@auth_bp.route('/logout', methods=['DELETE', 'POST'])
@jwt_required(optional=True)
def logout():
    """Logout a user by adding token to blocklist"""
    jwt_data = get_jwt()
    if not jwt_data:
        return jsonify({"msg": "No token provided"}), 200
        
    jti = jwt_data.get("jti")
    if jti:
        # Store token in Redis with expiration
        redis_client.set(jti, "", ex=int(ACCESS_TOKEN_EXPIRES.total_seconds()))
        
        # If we also want to revoke the refresh token
        refresh_jti = request.headers.get('X-Refresh-Token-JTI')
        if refresh_jti:
            redis_client.set(refresh_jti, "", ex=int(REFRESH_TOKEN_EXPIRES.total_seconds()))
    
    return jsonify({"msg": "Successfully logged out"}), 200

@auth_bp.route('/protected', methods=['GET'])
@jwt_required()
def protected():
    """Test endpoint for protected routes"""
    identity = get_jwt_identity()
    return jsonify({"msg": f"Hello, {identity}! This is a protected endpoint."}), 200

@auth_bp.route('/reset-password', methods=['POST'])
@limiter.limit("3 per hour")  # Strict rate limit for password reset
def request_password_reset():
    """Request a password reset."""
    data = request.get_json()
    username = data.get("username")
    
    # To Check if user exists
    validated_user = user.validate_user(username, "")
    if not validated_user:
        return jsonify({"error": "User not found"}), 404
    
    reset_token = user.create_reset_token(username)
    return jsonify({"message": "Use this token to reset your password", "reset_token": reset_token}), 200

@auth_bp.route('/reset-password/confirm', methods=['POST'])
@jwt_required()
@limiter.limit("3 per hour")  # Strict rate limit for password reset confirmation
def confirm_password_reset():
    """Confirm password reset."""
    data = request.get_json()
    new_password = data.get("new_password")
    username = get_jwt_identity()
    
    if user.update_password(username, new_password):
        return jsonify({"message": "Password updated successfully"}), 200
    else:
        return jsonify({"error": "Failed to update password"}), 400