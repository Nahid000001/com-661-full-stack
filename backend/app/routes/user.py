from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.models.user import User
from app import mongo, redis_client
from bson.objectid import ObjectId
from app.middlewares.auth import admin_required

# Create blueprint
user_bp = Blueprint('user', __name__)

@user_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """Get current user profile"""
    current_user_id = get_jwt_identity()
    
    try:
        # Get user from MongoDB
        user = mongo.db.users.find_one({"_id": ObjectId(current_user_id)})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Convert ObjectId to string for JSON serialization
        user["_id"] = str(user["_id"])
        
        # Remove sensitive data
        if "password" in user:
            del user["password"]
        
        return jsonify(user), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@user_bp.route('/profile/update', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update user profile"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    # Fields that can be updated
    allowed_fields = ["first_name", "last_name", "email", "address", "phone"]
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    
    # Add updated_at timestamp
    from datetime import datetime
    update_data["updated_at"] = datetime.utcnow()
    
    try:
        # Update user in MongoDB
        result = mongo.db.users.update_one(
            {"_id": ObjectId(current_user_id)},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            return jsonify({"error": "No changes made or user not found"}), 400
        
        # Get updated user
        updated_user = mongo.db.users.find_one({"_id": ObjectId(current_user_id)})
        
        # Convert ObjectId to string for JSON serialization
        updated_user["_id"] = str(updated_user["_id"])
        
        # Remove sensitive data
        if "password" in updated_user:
            del updated_user["password"]
        
        return jsonify({
            "success": True,
            "message": "Profile updated successfully",
            "user": updated_user
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@user_bp.route('/profile/delete', methods=['DELETE'])
@jwt_required()
def delete_profile():
    """Delete user account"""
    current_user_id = get_jwt_identity()
    
    try:
        # Get user
        user = mongo.db.users.find_one({"_id": ObjectId(current_user_id)})
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        # Delete user's cart items
        mongo.db.cart.delete_many({"user_id": ObjectId(current_user_id)})
        
        # Update user's orders to show account deleted
        mongo.db.orders.update_many(
            {"user_id": ObjectId(current_user_id)},
            {"$set": {"account_deleted": True}}
        )
        
        # Delete user
        result = mongo.db.users.delete_one({"_id": ObjectId(current_user_id)})
        
        if result.deleted_count == 0:
            return jsonify({"error": "Failed to delete account"}), 500
            
        # Revoke JWT token
        token = get_jwt()
        jti = token["jti"]
        redis_client.set(jti, "", ex=3600)  # Add to blocklist for 1 hour
        
        return jsonify({
            "success": True,
            "message": "Account deleted successfully"
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@user_bp.route('/<user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    """Get a user by ID (admin/self only)"""
    current_user_id = get_jwt_identity()
    
    # Check if user is requesting their own profile or is an admin
    if current_user_id != user_id:
        # Get current user to check if admin
        claims = get_jwt()
        if claims.get("role") != "admin":
            return jsonify({"error": "Unauthorized. Only admins can view other user profiles"}), 403
    
    try:
        # Get user from MongoDB
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Convert ObjectId to string for JSON serialization
        user["_id"] = str(user["_id"])
        
        # Remove sensitive data
        if "password" in user:
            del user["password"]
        
        return jsonify(user), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@user_bp.route('/admin/all', methods=['GET']) 
@jwt_required()
@admin_required
def get_all_users():
    """Admin: Get all users"""
    try:
        # Get all users from MongoDB
        users = list(mongo.db.users.find({}, {"password": 0}))
        
        # Convert ObjectId to string for JSON serialization
        for user in users:
            user["_id"] = str(user["_id"])
        
        return jsonify({"users": users}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@user_bp.route('/<user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    """Update a user (admin/self only)"""
    current_user_id = get_jwt_identity()
    claims = get_jwt()
    role = claims.get("role")
    is_admin = role == "admin"
    is_self = current_user_id == user_id
    
    # Only admin or self can update a user
    if not (is_admin or is_self):
        return jsonify({"error": "Unauthorized. You can only update your own profile or must be an admin"}), 403
    
    data = request.get_json()
    
    # Determine allowed fields based on role
    if is_admin:
        allowed_fields = ["first_name", "last_name", "email", "address", "phone", "role", "status"]
    else:
        allowed_fields = ["first_name", "last_name", "email", "address", "phone"]
        
        # Non-admins can't change their own role
        if "role" in data:
            return jsonify({"error": "Unauthorized. Cannot change own role"}), 403
    
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    
    # Add updated_at timestamp
    from datetime import datetime
    update_data["updated_at"] = datetime.utcnow()
    
    try:
        # Update user in MongoDB
        result = mongo.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            return jsonify({"error": "No changes made or user not found"}), 400
        
        # Get updated user
        updated_user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        
        # Convert ObjectId to string for JSON serialization
        updated_user["_id"] = str(updated_user["_id"])
        
        # Remove sensitive data
        if "password" in updated_user:
            del updated_user["password"]
        
        return jsonify({
            "success": True,
            "message": "User updated successfully",
            "user": updated_user
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@user_bp.route('/<user_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_user(user_id):
    """Admin: Delete a user"""
    current_user_id = get_jwt_identity()
    
    # Admin cannot delete themselves
    if current_user_id == user_id:
        return jsonify({"error": "Cannot delete your own admin account. Use profile/delete instead"}), 400
    
    try:
        # Get user
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        # Delete user's cart items
        mongo.db.cart.delete_many({"user_id": ObjectId(user_id)})
        
        # Update user's orders to show account deleted
        mongo.db.orders.update_many(
            {"user_id": ObjectId(user_id)},
            {"$set": {"account_deleted": True}}
        )
        
        # Delete user
        result = mongo.db.users.delete_one({"_id": ObjectId(user_id)})
        
        if result.deleted_count == 0:
            return jsonify({"error": "Failed to delete account"}), 500
            
        return jsonify({
            "success": True,
            "message": "User deleted successfully"
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@user_bp.route('/search', methods=['GET'])
@jwt_required()
def search_users():
    """
    Search for users by username or name
    ---
    tags:
      - Users
    security:
      - bearerAuth: []
    parameters:
      - name: q
        in: query
        schema:
          type: string
        description: Search query
    responses:
      200:
        description: List of matching users
      401:
        description: Unauthorized
    """
    try:
        user_id, role = get_user_details()
        
        # Only logged-in users can search
        if not user_id:
            return jsonify({"error": "Authentication required"}), 401
        
        # Get search query
        query = request.args.get('q', '')
        if not query or len(query) < 2:
            return jsonify([]), 200
            
        # Create case-insensitive regex pattern
        import re
        pattern = re.compile(f".*{re.escape(query)}.*", re.IGNORECASE)
        
        # Search in username, first_name, and last_name fields
        users = list(mongo.db.users.find({
            "$or": [
                {"username": {"$regex": pattern}},
                {"first_name": {"$regex": pattern}},
                {"last_name": {"$regex": pattern}},
                {"email": {"$regex": pattern}}
            ]
        }, {
            "password": 0,  # Exclude password field
            "_id": 0        # Exclude MongoDB ID
        }).limit(10))  # Limit to 10 results
        
        # If admin, return all users
        # If regular user, only return public info
        if role != "admin":
            for user in users:
                # Remove sensitive fields for non-admins
                if "email" in user:
                    del user["email"]
        
        return jsonify(users), 200
        
    except Exception as e:
        print(f"Error searching users: {str(e)}")
        return jsonify({"error": str(e)}), 500 