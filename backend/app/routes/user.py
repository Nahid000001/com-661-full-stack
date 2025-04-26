from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, current_user
from app.models.user import User
from app import mongo, redis_client
from bson.objectid import ObjectId

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
        from flask_jwt_extended import get_jwt
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
        current_user_data = mongo.db.users.find_one({"_id": ObjectId(current_user_id)})
        if not current_user_data or current_user_data.get("role") != "admin":
            return jsonify({"error": "Unauthorized"}), 403
    
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