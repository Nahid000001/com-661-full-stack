from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.models import store
from app.utils import is_valid_object_id

stores_bp = Blueprint('stores', __name__)

@stores_bp.route('/', methods=['POST'])
@jwt_required()
def add_store():
    """Add a new store."""
    try:
        user = get_jwt_identity()
        claims = get_jwt()
        role = claims.get("role")

        # only "admin" or "store_owner" can add stores
        if role not in ["admin", "store_owner"]:
            return jsonify({
                "status": "error", 
                "message": "Unauthorized. Only admin or store owner can add stores"
            }), 403

        data = request.get_json()

        required_fields = ["company_name", "title", "description", "location", "work_type"]
        if not all(field in data and data[field].strip() for field in required_fields):
            return jsonify({"status": "error", "message": "Missing required fields"}), 400

        result = store.create_store(data, user)
        
        if result["is_new"]:
            return jsonify({
                "message": "Store added successfully",
                "store_id": result["store_id"],
                "branch_id": result["branch_id"]
            }), 201
        else:
            return jsonify({
                "message": "Store already exists, but a new branch was added",
                "store_id": result["store_id"],
                "branch_id": result["branch_id"]
            }), 201

    except Exception as e:
        return jsonify({"status": "error", "message": f"An error occurred: {str(e)}"}), 500


@stores_bp.route('/', methods=['GET'])
def get_stores():
    """Get all stores with pagination."""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        
        result = store.get_all_stores(page, limit)
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400


@stores_bp.route('/<store_id>', methods=['GET'])
def get_store_by_id(store_id):
    """Get a single store by ID."""
    try:
        if not is_valid_object_id(store_id):
            return jsonify({"status": "error", "message": "Invalid store ID format"}), 400
            
        result = store.get_store_by_id(store_id)
        if not result:
            return jsonify({"status": "error", "message": "Store not found"}), 404
            
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400


@stores_bp.route('/<store_id>', methods=['PUT'])
@jwt_required()
def update_store_by_id(store_id):
    """Update a store."""
    try:
        if not is_valid_object_id(store_id):
            return jsonify({"status": "error", "message": "Invalid store ID format"}), 400
            
        data = request.get_json()
        user = get_jwt_identity()
        claims = get_jwt()
        
        # If user is admin, they can update any store
        if claims.get("role") == "admin":
            pass 
        else:
            allowed_fields = ["company_name", "title", "description", "location", "work_type"]
            update_data = {field: data[field] for field in allowed_fields if field in data and data[field]}
            
            if not update_data:
                return jsonify({"status": "error", "message": "No valid fields provided for update"}), 400
            
            success, message = store.update_store(store_id, update_data, user)
            if not success:
                return jsonify({"status": "error", "message": message}), 403
        
        return jsonify({"message": "Store updated successfully"}), 200
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@stores_bp.route('/<store_id>', methods=['DELETE'])
@jwt_required()
def delete_store_by_id(store_id):
    """Delete a store."""
    try:
        if not is_valid_object_id(store_id):
            return jsonify({"status": "error", "message": "Invalid store ID format"}), 400
            
        user = get_jwt_identity()
        claims = get_jwt()
        
        # If user is admin, they can delete any store
        if claims.get("role") == "admin":
            success, message = True, "Store deleted successfully by admin"
        else:
            success, message = store.delete_store(store_id, user)
        
        if not success:
            return jsonify({"status": "error", "message": message}), 403
        
        return jsonify({"message": message}), 200
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400


@stores_bp.route('/<store_id>/branches/<branch_id>', methods=['DELETE'])
@jwt_required()
def delete_branch_from_store(store_id, branch_id):
    """Delete a branch from a store."""
    try:
        if not is_valid_object_id(store_id):
            return jsonify({"status": "error", "message": "Invalid store ID format"}), 400
            
        user = get_jwt_identity()
        claims = get_jwt()
        
        # If user is admin, they can delete any branch
        if claims.get("role") == "admin":
            success, message, store_deleted = True, "Branch deleted successfully by admin", False
        else:
            success, message, store_deleted = store.delete_branch(store_id, branch_id, user)
        
        if not success:
            return jsonify({"status": "error", "message": message}), 403
        
        if store_deleted:
            return jsonify({"message": "Branch deleted, and store removed since it had no branches left"}), 200
        else:
            return jsonify({"message": message}), 200
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500