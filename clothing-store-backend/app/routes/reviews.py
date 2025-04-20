from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.models import review, store
from app.utils import is_valid_object_id

reviews_bp = Blueprint('reviews', __name__)

@reviews_bp.route('/stores/<store_id>/reviews', methods=['GET'])
def get_store_reviews(store_id):
    """Get all reviews for a store."""
    try:
        if not is_valid_object_id(store_id):
            return jsonify({"status": "error", "message": "Invalid store ID format"}), 400
            
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 5))
        
        result = review.get_store_reviews(store_id, page, limit)
        if not result:
            return jsonify({"status": "error", "message": "Store not found"}), 404
            
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400


@reviews_bp.route('/stores/<store_id>/reviews/add', methods=['POST'])
@jwt_required()
def add_review_to_store(store_id):
    """Add a review to a store."""
    try:
        if not is_valid_object_id(store_id):
            return jsonify({"status": "error", "message": "Invalid store ID format"}), 400
            
        data = request.get_json()
        rating = data.get("rating")
        comment = data.get("comment")
        user = get_jwt_identity()

        if not isinstance(rating, (int, float)) or not (1 <= rating <= 5):
            return jsonify({"status": "error", "message": "Rating must be between 1 and 5"}), 400

        if not isinstance(comment, str) or comment.strip() == "":
            return jsonify({"status": "error", "message": "Comment cannot be empty"}), 400

        success, message = review.add_review(store_id, user, rating, comment)
        if not success:
            return jsonify({"status": "error", "message": message}), 400
            
        return jsonify({"message": message}), 201
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400


@reviews_bp.route('/stores/<store_id>/reviews/<review_id>', methods=['PATCH'])
@jwt_required()
def edit_store_review(store_id, review_id):
    """Edit a review."""
    try:
        if not is_valid_object_id(store_id):
            return jsonify({"status": "error", "message": "Invalid store ID format"}), 400
            
        data = request.get_json()
        new_comment = data.get("comment", "").strip()
        new_rating = data.get("rating")
        user = get_jwt_identity()

        if new_rating is not None:
            if not isinstance(new_rating, (int, float)) or not (1 <= new_rating <= 5):
                return jsonify({"status": "error", "message": "Rating must be between 1 and 5"}), 400

        if not new_comment and new_rating is None:
            return jsonify({"status": "error", "message": "Nothing to update"}), 400

        success, message = review.edit_review(store_id, review_id, user, new_comment, new_rating)
        if not success:
            return jsonify({"status": "error", "message": message}), 403
            
        return jsonify({"message": message}), 200
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400


@reviews_bp.route('/stores/<store_id>/reviews/<review_id>', methods=['DELETE'])
@jwt_required()
def delete_store_review(store_id, review_id):
    """Delete a review. Only admin and store owners can delete reviews."""
    try:
        if not is_valid_object_id(store_id):
            return jsonify({"status": "error", "message": "Invalid store ID format"}), 400
            
        user = get_jwt_identity()
        claims = get_jwt()
        user_role = claims.get("role", "customer")
        
        if user_role == "customer":
            return jsonify({
                "status": "error", 
                "message": "Customers are not permitted to delete reviews. You may edit your review instead."
            }), 403
        
        # Checking if user is admin or store_owner
        is_admin = user_role == "admin"
        is_store_owner = user_role == "store_owner"
        
        # Only proceed if user is admin or store owner
        if is_admin or is_store_owner:
            success, message = review.delete_review(store_id, review_id, user, is_admin)
            if not success:
                return jsonify({"status": "error", "message": message}), 403
                
            return jsonify({"message": message}), 200
        else:
            return jsonify({"status": "error", "message": "Unauthorized to delete reviews"}), 403
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400


@reviews_bp.route('/stores/<store_id>/reviews/<review_id>/reply', methods=['POST'])
@jwt_required()
def reply_to_store_review(store_id, review_id):
    """Add a reply to a review."""
    try:
        if not is_valid_object_id(store_id):
            return jsonify({"status": "error", "message": "Invalid store ID format"}), 400
            
        data = request.get_json()
        reply_text = data.get("reply", "").strip()
        user = get_jwt_identity()
        claims = get_jwt()
        
        if not reply_text:
            return jsonify({"status": "error", "message": "Reply text is required"}), 400
            
        # Only allow replies from admins or store owners
        store_data = store.get_store_by_id(store_id)
        if not store_data:
            return jsonify({"status": "error", "message": "Store not found"}), 404
            
        if claims.get("role") != "admin" and store_data.get("owner", "") != user:
            return jsonify({
                "status": "error", 
                "message": "Unauthorized: Only the store owner or admin can reply"
            }), 403
            
        success, message = review.add_reply_to_review(store_id, review_id, user, reply_text)
        if not success:
            return jsonify({"status": "error", "message": message}), 404
            
        return jsonify({"message": message}), 201
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500