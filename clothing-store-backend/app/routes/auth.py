from flask import Blueprint, request, jsonify, current_app, url_for, session, redirect
from flask_jwt_extended import (
    create_access_token, 
    create_refresh_token,
    jwt_required, 
    get_jwt_identity,
    get_jwt,
    current_user
)
from app import limiter, redis_client
from app.models import user
import flask
from datetime import datetime, timedelta, timezone
from app.models.user import User
from app import jwt, mongo
import secrets
import os
import requests
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

# Creating blueprint
auth_bp = Blueprint('auth', __name__)

# JWT token expiration time (for Redis)
ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)   # Should match JWT_ACCESS_TOKEN_EXPIRES in config
REFRESH_TOKEN_EXPIRES = timedelta(days=30)     # Should match JWT_REFRESH_TOKEN_EXPIRES in config

# Google OAuth configuration
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
GOOGLE_DISCOVERY_URL = 'https://accounts.google.com/.well-known/openid-configuration'

# No need for local blocklist since we're using Redis
# Token blocklist is managed by the redis_client configured in app/__init__.py

@auth_bp.route('/register', methods=['POST'])
@limiter.limit("5 per minute")  # Rate limit registration attempts
def register():
    """Register a new user"""
    data = request.get_json()
    
    # Handle case where email might be missing
    email = data.get('email')
    username = data.get('username')
    
    if not email and not username:
        return jsonify({"msg": "Either email or username is required"}), 400
    
    # If email is missing but username is provided, use username as email
    if not email:
        email = f"{username}@example.com"  # Default email domain
    
    # Check if user already exists with the same email
    existing_user = User.get_user_by_email(email)
    if existing_user:
        return jsonify({"msg": "User with this email already exists"}), 409
    
    # Check if username already exists
    existing_username = User.get_user_by_username(username)
    if existing_username:
        return jsonify({"msg": "Username already taken"}), 409
    
    # Create new user
    user_id = User.create_user(
        email=email,
        password=data.get('password'),
        first_name=data.get('first_name', ''),
        last_name=data.get('last_name', ''),
        username=username,
        role=data.get('role', 'customer')
    )
    
    return jsonify({"msg": "User created successfully", "user_id": user_id}), 201

@auth_bp.route('/login', methods=['POST'])
@limiter.limit("10 per minute")  # Rate limit login attempts
def login():
    """Login a user and return tokens"""
    data = request.get_json()
    
    if not data:
        return jsonify({"msg": "Missing JSON in request"}), 400
    
    emailOrUsername = data.get('emailOrUsername')
    password = data.get('password')
    
    if not emailOrUsername:
        return jsonify({"msg": "Missing emailOrUsername parameter"}), 400
    
    if not password:
        return jsonify({"msg": "Missing password parameter"}), 400
    
    # Try to find user by email first
    user = User.get_user_by_email(emailOrUsername)
    
    # If not found by email, try by username
    if not user:
        user = User.get_user_by_username(emailOrUsername)
    
    # If user not found or password incorrect
    if not user:
        return jsonify({"msg": "User not found"}), 404
        
    if not User.check_password(user, password):
        return jsonify({"msg": "Invalid password"}), 401
    
    # Create tokens
    access_token = create_access_token(
        identity=str(user['_id']),
        fresh=True,
        additional_claims={
            "email": user.get('email', ''),
            "username": user['username']
        }
    )
    refresh_token = create_refresh_token(identity=str(user['_id']))
    
    # Store the refresh token jti in Redis with user id for verification
    jti = get_jwt()["jti"] if request.headers.get('Authorization') else None
    if jti:
        redis_client.set(f"refresh_token:{jti}", str(user['_id']), ex=int(REFRESH_TOKEN_EXPIRES.total_seconds()))
    
    return jsonify({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": str(user['_id']),
            "email": user.get('email', ''),
            "first_name": user.get('first_name', ''),
            "last_name": user.get('last_name', ''),
            "username": user['username']
        }
    }), 200

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
@limiter.limit("20 per minute")  # Rate limit token refreshing
def refresh():
    """Refresh access token with token rotation for security"""
    identity = get_jwt_identity()
    jwt_data = get_jwt()
    jti = jwt_data["jti"]
    
    # Create new tokens
    access_token = create_access_token(
        identity=identity,
        fresh=False
    )
    new_refresh_token = create_refresh_token(identity=identity)
    
    # Invalidate the current refresh token by adding to blocklist
    redis_client.set(jti, "", ex=int(REFRESH_TOKEN_EXPIRES.total_seconds()))
    
    # Store the new refresh token jti in Redis with user id
    new_jti = get_jwt()["jti"]
    redis_client.set(f"refresh_token:{new_jti}", identity, ex=int(REFRESH_TOKEN_EXPIRES.total_seconds()))
    
    return jsonify({
        "access_token": access_token,
        "refresh_token": new_refresh_token
    }), 200

@auth_bp.route('/logout', methods=['DELETE'])
@jwt_required()
def logout():
    """Logout a user by adding token to blocklist"""
    jwt_data = get_jwt()
    jti = jwt_data["jti"]
    
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

# Google OAuth Login/Registration Endpoints
@auth_bp.route('/auth/google/init', methods=['GET'])
@limiter.limit("10 per minute")  # Rate limit OAuth init attempts
def google_auth_init():
    """Initialize Google OAuth login flow"""
    # Get the role from the query param (defaults to customer)
    role = request.args.get('role', 'customer')
    
    # Generate and store state token in session for CSRF protection
    state = secrets.token_urlsafe(16)
    session['oauth_state'] = state
    session['oauth_role'] = role
    
    # Get Google's OAuth endpoints
    google_provider_config = get_google_provider_config()
    authorization_endpoint = google_provider_config["authorization_endpoint"]
    
    # Build the redirect URL
    redirect_uri = url_for('auth.google_auth_callback', _external=True)
    
    # Build the request URL for Google
    request_uri = f"{authorization_endpoint}?client_id={GOOGLE_CLIENT_ID}&redirect_uri={redirect_uri}&response_type=code&scope=openid email profile&state={state}"
    
    return jsonify({"authUrl": request_uri})

@auth_bp.route('/auth/google/callback', methods=['GET'])
@limiter.limit("10 per minute")  # Rate limit OAuth callback attempts
def google_auth_callback():
    """Handle Google OAuth callback"""
    # Get authorization code and state from the request
    code = request.args.get('code')
    state = request.args.get('state')
    
    # Verify state token to prevent CSRF
    if 'oauth_state' not in session or state != session['oauth_state']:
        return jsonify({"msg": "Invalid state parameter"}), 400
    
    # Get role from session
    role = session.get('oauth_role', 'customer')
    
    # Clean up session after use
    if 'oauth_state' in session:
        del session['oauth_state']
    if 'oauth_role' in session:
        del session['oauth_role']
    
    # Get token endpoint
    google_provider_config = get_google_provider_config()
    token_endpoint = google_provider_config["token_endpoint"]
    
    # Prepare request to get token
    token_url = token_endpoint
    redirect_uri = url_for('auth.google_auth_callback', _external=True)
    
    # Exchange code for tokens
    token_data = {
        'code': code,
        'client_id': GOOGLE_CLIENT_ID,
        'client_secret': GOOGLE_CLIENT_SECRET,
        'redirect_uri': redirect_uri,
        'grant_type': 'authorization_code'
    }
    
    # Make request to get tokens
    token_response = requests.post(token_url, data=token_data)
    if token_response.status_code != 200:
        return jsonify({"msg": "Failed to retrieve token from Google"}), 400
    
    token_json = token_response.json()
    id_token_value = token_json.get('id_token')
    
    # Verify id_token and get user info
    try:
        # Verify the token
        idinfo = id_token.verify_oauth2_token(
            id_token_value, 
            google_requests.Request(), 
            GOOGLE_CLIENT_ID
        )
        
        # Extract user information
        email = idinfo.get('email')
        if not email:
            return jsonify({"msg": "Could not retrieve email from Google"}), 400
        
        first_name = idinfo.get('given_name', '')
        last_name = idinfo.get('family_name', '')
        
        # Generate a username from email if not provided
        username = email.split('@')[0]
        
        # Check if user exists
        user_data = User.get_user_by_email(email)
        
        if not user_data:
            # Register new user
            user_id = User.create_user(
                email=email,
                password=secrets.token_urlsafe(16),  # Generate a random password
                first_name=first_name,
                last_name=last_name,
                username=username,
                role=role
            )
            user_data = User.get_user_by_id(user_id)
        
        # Create tokens
        access_token = create_access_token(
            identity=str(user_data['_id']),
            fresh=True,
            additional_claims={
                "email": user_data['email'],
                "username": user_data.get('username', username),
                "role": user_data.get('role', 'customer')
            }
        )
        refresh_token = create_refresh_token(identity=str(user_data['_id']))
        
        # Return tokens to the frontend
        redirect_uri = f"{request.scheme}://{request.host}/auth/callback/google?token={access_token}&refresh_token={refresh_token}&username={username}"
        return redirect(redirect_uri)
        
    except ValueError:
        # Invalid token
        return jsonify({"msg": "Invalid token"}), 401

@auth_bp.route('/auth/google/callback', methods=['POST'])
@limiter.limit("10 per minute")
def process_oauth_callback():
    """Process OAuth callback data from the frontend"""
    data = request.get_json()
    code = data.get('code')
    state = data.get('state')
    provider = data.get('provider', 'google')
    
    if not code or not state:
        return jsonify({"msg": "Missing parameters"}), 400
    
    if provider == 'google':
        # Handle Google authentication
        try:
            # Exchange code for token (similar to callback endpoint)
            # ...implementation similar to the GET endpoint...
            
            # For simplicity, let's create a mock user
            # In a real implementation, you would verify the token and get user info
            user_data = {
                '_id': '123456789',
                'email': 'user@example.com',
                'username': 'googleuser',
                'role': 'customer'
            }
            
            # Create tokens
            access_token = create_access_token(
                identity=str(user_data['_id']),
                fresh=True,
                additional_claims={
                    "email": user_data['email'],
                    "username": user_data['username'],
                    "role": user_data['role']
                }
            )
            refresh_token = create_refresh_token(identity=str(user_data['_id']))
            
            return jsonify({
                "access_token": access_token,
                "refresh_token": refresh_token,
                "username": user_data['username']
            }), 200
            
        except Exception as e:
            return jsonify({"msg": f"Authentication error: {str(e)}"}), 400
    else:
        return jsonify({"msg": f"Unsupported provider: {provider}"}), 400

def get_google_provider_config():
    """Get Google OAuth configuration"""
    try:
        return requests.get(GOOGLE_DISCOVERY_URL).json()
    except Exception as e:
        current_app.logger.error(f"Error fetching Google provider config: {str(e)}")
        return {}