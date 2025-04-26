from functools import wraps
from flask import jsonify, request
from flask_jwt_extended import get_jwt, verify_jwt_in_request, get_jwt_identity

def role_required(required_role):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                claims = get_jwt()  # Retrieve JWT claims
                if claims.get("role") != required_role:
                    return jsonify({"status": "error", "message": "Unauthorized access"}), 403
                return func(*args, **kwargs)
            except Exception as e:
                return jsonify({"status": "error", "message": f"Authentication error: {str(e)}"}), 401
        return wrapper
    return decorator

def get_user_details():
    """
    Get user details from JWT if present.
    Returns (user_id, role) tuple. Both will be None if no valid JWT is found.
    
    This function does not raise an exception if authentication fails.
    """
    user_id = None
    role = None
    
    # Check if user is authenticated by looking for Authorization header
    if request.headers.get('Authorization', '').startswith('Bearer '):
        try:
            # Try to get the user identity and claims
            verify_jwt_in_request(optional=True)
            user_id = get_jwt_identity()
            if user_id:
                claims = get_jwt()
                role = claims.get("role", "user")
        except Exception as e:
            # If token validation fails, proceed as unauthenticated
            print(f"Token validation failed: {str(e)}")
            pass
            
    return user_id, role