from functools import wraps
from flask import jsonify, request, abort
from flask_jwt_extended import get_jwt, verify_jwt_in_request, get_jwt_identity
from app import mongo
from bson.objectid import ObjectId

def role_required(required_role):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request()
                claims = get_jwt()  # Retrieve JWT claims
                if claims.get("role") != required_role:
                    return jsonify({"status": "error", "message": "Unauthorized access. This action requires higher privileges."}), 403
                return func(*args, **kwargs)
            except Exception as e:
                return jsonify({"status": "error", "message": f"Authentication error: {str(e)}"}), 401
        return wrapper
    return decorator

def role_in_required(allowed_roles):
    """
    Middleware to check if user's role is in a list of allowed roles
    
    Args:
        allowed_roles: List of roles that are allowed to access the endpoint
        
    Returns:
        Function: Decorator that checks if user's role is in the allowed roles list
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request()
                claims = get_jwt()  # Retrieve JWT claims
                user_role = claims.get("role")
                
                if user_role not in allowed_roles:
                    return jsonify({
                        "status": "error", 
                        "message": f"Unauthorized access. This action requires one of these roles: {', '.join(allowed_roles)}"
                    }), 403
                return func(*args, **kwargs)
            except Exception as e:
                return jsonify({"status": "error", "message": f"Authentication error: {str(e)}"}), 401
        return wrapper
    return decorator

def admin_required(func):
    """Middleware to require admin role"""
    return role_required("admin")(func)

def store_owner_required(func):
    """Middleware to require store_owner role"""
    return role_required("store_owner")(func)

def owner_or_admin_required(func):
    """Middleware to require either admin or store_owner role"""
    return role_in_required(["admin", "store_owner"])(func)

def admin_only_middleware():
    """
    Middleware function to verify admin status
    Aborts with 403 if not admin
    """
    try:
        claims = get_jwt()
        if claims.get("role") != "admin":
            abort(403, description="Admin privileges required for this operation")
    except Exception as e:
        abort(401, description=f"Authentication error: {str(e)}")

def verify_store_ownership(store_id, user_id, role):
    """
    Verify if user owns the store or is an admin
    
    Args:
        store_id: The ID of the store to check
        user_id: The ID of the current user
        role: The role of the current user
        
    Returns:
        bool: True if user is admin or owns the store, False otherwise
    """
    if role == "admin":
        return True
    
    store_doc = mongo.db.stores.find_one({"_id": ObjectId(store_id)})
    if not store_doc:
        return False
        
    # Check if user is owner or manager
    if store_doc.get("owner") == user_id:
        return True
    
    # Check if user is in managers list
    managers = store_doc.get("managers", [])
    if user_id in managers:
        return True
        
    return False

def verify_user_exists(username):
    """
    Verify if a user exists in the database
    
    Args:
        username: The username to check
        
    Returns:
        bool: True if user exists, False otherwise
    """
    user = mongo.db.users.find_one({"username": username})
    return user is not None

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

def rate_limit_middleware(max_requests, time_window):
    """
    Middleware for rate limiting
    
    Args:
        max_requests: Maximum number of requests allowed in the time window
        time_window: Time window in seconds
        
    Returns:
        Decorator that implements rate limiting
    """
    from flask import g
    import time
    
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Get client IP
            client_ip = request.remote_addr
            
            # Check if this is the first request
            if not hasattr(g, 'rate_limit_data'):
                g.rate_limit_data = {}
                
            # Initialize rate limit data for this IP if it doesn't exist
            if client_ip not in g.rate_limit_data:
                g.rate_limit_data[client_ip] = {
                    'count': 0,
                    'window_start': time.time()
                }
                
            # Check if time window has expired
            current_time = time.time()
            if current_time - g.rate_limit_data[client_ip]['window_start'] > time_window:
                # Reset window
                g.rate_limit_data[client_ip] = {
                    'count': 1,
                    'window_start': current_time
                }
            else:
                # Increment request count
                g.rate_limit_data[client_ip]['count'] += 1
                
                # Check if rate limit exceeded
                if g.rate_limit_data[client_ip]['count'] > max_requests:
                    return jsonify({
                        "status": "error",
                        "message": "Rate limit exceeded. Please try again later."
                    }), 429
                    
            return func(*args, **kwargs)
        return wrapper
    return decorator 