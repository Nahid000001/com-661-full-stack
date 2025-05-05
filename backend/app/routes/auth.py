from flask import Blueprint, request, jsonify, current_app, redirect, url_for, session
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
import secrets
import requests
import json
import os
from urllib.parse import urlencode

# Creating blueprint
auth_bp = Blueprint('auth', __name__)

# JWT token expiration time (for Redis)
ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)   # Should match JWT_ACCESS_TOKEN_EXPIRES in config
REFRESH_TOKEN_EXPIRES = timedelta(days=30)     # Should match JWT_REFRESH_TOKEN_EXPIRES in config

# Google OAuth endpoints
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USER_INFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

# Google OAuth configuration
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:5000/auth/google/callback")

# Store state tokens to prevent CSRF
oauth_states = {}

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

# Google OAuth routes
@auth_bp.route('/auth/google/init', methods=['GET'])
@limiter.limit("10 per minute")
def google_login_init():
    """Initiate the Google OAuth flow"""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return jsonify({"error": "Google OAuth is not configured"}), 500
    
    # Generate a random state token to prevent CSRF
    state = secrets.token_urlsafe(32)
    role = request.args.get('role', 'customer')
    
    # Store the state token with role for later verification
    oauth_states[state] = {
        'role': role,
        'created_at': datetime.now().timestamp()
    }
    
    # Clean up old state tokens (older than 10 minutes)
    current_time = datetime.now().timestamp()
    expired_states = [s for s in oauth_states if oauth_states[s]['created_at'] < current_time - 600]
    for s in expired_states:
        oauth_states.pop(s, None)
    
    # Build the authorization URL
    params = {
        'client_id': GOOGLE_CLIENT_ID,
        'redirect_uri': GOOGLE_REDIRECT_URI,
        'response_type': 'code',
        'scope': 'email profile',
        'state': state,
        'access_type': 'offline',  # For refresh token
        'prompt': 'consent'  # Force to show the consent screen
    }
    
    auth_url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    
    return jsonify({'authUrl': auth_url})

@auth_bp.route('/auth/google/callback', methods=['GET', 'POST'])
@limiter.limit("10 per minute")
def google_callback():
    """Handle the Google OAuth callback"""
    # Handle both GET (from Google redirect) and POST (from frontend)
    if request.method == 'GET':
        # This is the actual redirect from Google
        code = request.args.get('code')
        state = request.args.get('state')
        error = request.args.get('error')
        
        if error:
            return redirect(f"{current_app.config.get('FRONTEND_URL', 'http://localhost:4200')}/oauth-callback?error={error}")
        
        if not code or not state:
            return redirect(f"{current_app.config.get('FRONTEND_URL', 'http://localhost:4200')}/oauth-callback?error=invalid_request")
        
        # Redirect to frontend with code and state
        return redirect(f"{current_app.config.get('FRONTEND_URL', 'http://localhost:4200')}/oauth-callback/google?code={code}&state={state}")
    
    # POST request from frontend
    data = request.get_json()
    code = data.get('code')
    state = data.get('state')
    
    if not code or not state:
        return jsonify({"error": "Invalid request"}), 400
    
    # Verify state token
    if state not in oauth_states:
        return jsonify({"error": "Invalid state token"}), 400
    
    # Get the stored role
    role = oauth_states[state].get('role', 'customer')
    
    # Remove used state token
    oauth_states.pop(state, None)
    
    try:
        # Exchange authorization code for tokens
        token_data = {
            'code': code,
            'client_id': GOOGLE_CLIENT_ID,
            'client_secret': GOOGLE_CLIENT_SECRET,
            'redirect_uri': GOOGLE_REDIRECT_URI,
            'grant_type': 'authorization_code'
        }
        
        token_response = requests.post(GOOGLE_TOKEN_URL, data=token_data)
        token_response.raise_for_status()
        tokens = token_response.json()
        
        # Get user information
        user_info_response = requests.get(
            GOOGLE_USER_INFO_URL,
            headers={'Authorization': f"Bearer {tokens['access_token']}"}
        )
        user_info_response.raise_for_status()
        user_info = user_info_response.json()
        
        # Check if user already exists
        email = user_info.get('email')
        existing_user = User.get_user_by_email(email)
        
        if existing_user:
            # User exists, update Google-specific fields if needed
            user_id = str(existing_user['_id'])
        else:
            # Create new user with Google profile data
            username = f"google_{user_info.get('id')}"
            
            # Make sure username is unique
            while User.get_user_by_username(username):
                username = f"google_{user_info.get('id')}_{secrets.token_hex(4)}"
            
            user_id = User.create_user(
                email=email,
                username=username,
                first_name=user_info.get('given_name', ''),
                last_name=user_info.get('family_name', ''),
                # For Google auth, we don't set a password
                password=secrets.token_urlsafe(32),
                role=role,
                google_id=user_info.get('id'),
                profile_picture=user_info.get('picture', '')
            )
        
        # Get user to include details in token
        user = User.get_user_by_id(user_id)
        if not user:
            return jsonify({"error": "Failed to retrieve user"}), 500
        
        # Create JWT tokens
        access_token = create_access_token(
            identity=user_id,
            fresh=True,
            additional_claims={
                "email": user.get('email', ''),
                "username": user.get('username', ''),
                "role": user.get('role', 'customer')
            }
        )
        
        refresh_token = create_refresh_token(
            identity=user_id,
            additional_claims={"role": user.get('role', 'customer')}
        )
        
        return jsonify({
            "access_token": access_token,
            "refresh_token": refresh_token,
            "username": user.get('username', ''),
            "user": {
                "id": user_id,
                "email": user.get('email', ''),
                "first_name": user.get('first_name', ''),
                "last_name": user.get('last_name', ''),
                "username": user.get('username', ''),
                "role": user.get('role', 'customer')
            }
        })
    
    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"Google OAuth error: {str(e)}")
        return jsonify({"error": "Failed to authenticate with Google"}), 500
    except Exception as e:
        current_app.logger.error(f"Unexpected error in Google OAuth: {str(e)}")
        return jsonify({"error": "An unexpected error occurred"}), 500