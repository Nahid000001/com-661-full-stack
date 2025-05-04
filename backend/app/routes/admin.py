from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.middlewares.auth import admin_required
from app.models.user import User
from app import mongo
from bson.objectid import ObjectId
import traceback
import logging

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/', methods=['GET'])
def home():
    """Home route."""
    return jsonify({"message": "Welcome to the Clothing Store API"}), 200

@admin_bp.route('/admin/only', methods=['GET'])
@jwt_required()
@admin_required
def admin_only():
    """Admin-only route."""
    return jsonify({"message": "Admin access granted"}), 200

@admin_bp.route('/admin/promote', methods=['POST'])
def promote_to_admin():
    """Promote a user to admin role."""
    try:
        data = request.get_json()
        user_id = data.get('userId')
        
        print(f"Attempting to promote user with ID: {user_id}")
        
        if not user_id:
            return jsonify({"error": "User ID is required"}), 400
        
        try:
            # Validate ObjectId format
            object_id = ObjectId(user_id)
            
            # Directly update the user in MongoDB
            result = mongo.db.users.update_one(
                {"_id": object_id},
                {"$set": {"role": "admin"}}
            )
            
            print(f"Update result: matched={result.matched_count}, modified={result.modified_count}")
            
            if result.matched_count == 0:
                return jsonify({"error": "User not found"}), 404
            
            if result.modified_count == 0:
                return jsonify({"message": "User is already an admin"}), 200
            
            return jsonify({"message": "User promoted to admin successfully"}), 200
            
        except Exception as e:
            print(f"Error in database operation: {str(e)}")
            print(traceback.format_exc())
            return jsonify({"error": f"Invalid user ID format or database error: {str(e)}"}), 400
            
    except Exception as e:
        print(f"Error promoting user to admin: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500