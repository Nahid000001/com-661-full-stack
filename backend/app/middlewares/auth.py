from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt

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