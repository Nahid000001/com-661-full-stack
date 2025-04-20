from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app import limiter
from app.models import user
import flask

# Creating blueprint
auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user."""
    try:
        data = request.get_json()

        if not data:
            return jsonify({"status": "error", "message": "Missing JSON body"}), 400

        username = data.get("username")
        password = data.get("password")
        role = data.get("role", "customer").lower()  # Default role is "customer"

       
        if not username or not password:
            return jsonify({"status": "error", "message": "Username and password are required"}), 400

        # Ensuring if the role is valid
        allowed_roles = ["customer", "admin", "store_owner"]
        if role not in allowed_roles:
            return jsonify({"status": "error", "message": f"Invalid role. Allowed roles: {', '.join(allowed_roles)}"}), 400

        # Create user
        user_id = user.create_user(username, password, role)
        if not user_id:
            return jsonify({"status": "error", "message": "Username already exists"}), 400

        access_token = user.generate_token(username, role)

        return jsonify({
            "status": "success",
            "message": "User registered successfully",
            "access_token": access_token
        }), 201

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400


@auth_bp.route('/login', methods=['POST'])
@limiter.limit("5 per minute")  # Rate limiting
def login():
    """Login user."""
    try:
        data = request.get_json()

        if not data:
            return jsonify({"status": "error", "message": "Missing JSON body"}), 400

        username = data.get("username")
        password = data.get("password")

        if not username or not password:
            return jsonify({"status": "error", "message": "Username and password are required"}), 400

        validated_user = user.validate_user(username, password)
        if validated_user:
            try:
                access_token = user.generate_token(username, validated_user.get("role", "customer"))
                return jsonify({"status": "success", "access_token": access_token}), 200
            except Exception as jwt_error:
                return jsonify({"status": "error", "message": f"JWT error: {str(jwt_error)}"}), 500

        return jsonify({"status": "error", "message": "Invalid credentials"}), 401

    except Exception as e:
        return jsonify({"status": "error", "message": f"Unexpected error: {str(e)}"}), 500


@auth_bp.route('/reset-password', methods=['POST'])
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
def confirm_password_reset():
    """Confirm password reset."""
    data = request.get_json()
    new_password = data.get("new_password")
    username = get_jwt_identity()
    
    if user.update_password(username, new_password):
        return jsonify({"message": "Password updated successfully"}), 200
    else:
        return jsonify({"error": "Failed to update password"}), 400


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout user by blacklisting the current token."""
    try:
        jti = get_jwt()["jti"]  
        
        from app import JWT_BLOCKLIST
        
        JWT_BLOCKLIST.add(jti)
        
        return jsonify({"status": "success", "message": "Successfully logged out"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": f"Error during logout: {str(e)}"}), 500