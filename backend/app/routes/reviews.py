from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.models import review, store
from app.utils import is_valid_object_id
from app.utils.error_handler import (
    ApiError, 
    ResourceNotFoundError, 
    UnauthorizedError, 
    ForbiddenError, 
    ValidationError
)
from datetime import datetime

reviews_bp = Blueprint('reviews', __name__)

@reviews_bp.route('/reviews/latest', methods=['GET'])
def get_latest_reviews():
    """Get the latest reviews across all stores."""
    try:
        limit = int(request.args.get('limit', 3))
        result = review.get_latest_reviews(limit)
        return jsonify({"reviews": result}), 200
        
    except ValueError:
        raise ValidationError("Invalid limit parameter")
    except Exception as e:
        raise ApiError(str(e))

@reviews_bp.route('/stores/<store_id>/reviews', methods=['GET'])
def get_store_reviews(store_id):
    """Get all reviews for a store."""
    try:
        if not is_valid_object_id(store_id):
            raise ValidationError("Invalid store ID format")
            
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 5))
        
        result = review.get_store_reviews(store_id, page, limit)
        if not result:
            raise ResourceNotFoundError("Store not found")
            
        return jsonify(result), 200
        
    except (ValidationError, ResourceNotFoundError) as e:
        raise e
    except ValueError:
        raise ValidationError("Invalid pagination parameters")
    except Exception as e:
        raise ApiError(str(e))


@reviews_bp.route('/stores/<store_id>/reviews/add', methods=['POST'])
@jwt_required()
def add_review_to_store(store_id):
    """Add a review to a store."""
    try:
        if not is_valid_object_id(store_id):
            raise ValidationError("Invalid store ID format")
            
        data = request.get_json()
        rating = data.get("rating")
        comment = data.get("comment")
        user = get_jwt_identity()

        if not isinstance(rating, (int, float)) or not (1 <= rating <= 5):
            raise ValidationError("Rating must be between 1 and 5")

        if not isinstance(comment, str) or comment.strip() == "":
            raise ValidationError("Comment cannot be empty")

        success, message = review.add_review(store_id, user, rating, comment)
        if not success:
            raise ValidationError(message)
            
        return jsonify({"message": message}), 201
        
    except (ValidationError, ForbiddenError) as e:
        raise e
    except Exception as e:
        raise ApiError(str(e))


@reviews_bp.route('/stores/<store_id>/reviews/<review_id>', methods=['PATCH'])
@jwt_required()
def edit_store_review(store_id, review_id):
    """Edit a review."""
    try:
        if not is_valid_object_id(store_id):
            raise ValidationError("Invalid store ID format")
            
        data = request.get_json()
        new_comment = data.get("comment", "").strip()
        new_rating = data.get("rating")
        user = get_jwt_identity()

        if new_rating is not None:
            if not isinstance(new_rating, (int, float)) or not (1 <= new_rating <= 5):
                raise ValidationError("Rating must be between 1 and 5")

        if not new_comment and new_rating is None:
            raise ValidationError("Nothing to update")

        success, result = review.edit_review(store_id, review_id, user, new_comment, new_rating)
        if not success:
            raise ForbiddenError(result)
            
        # If success, result is a message. Get the updated review to return
        store_obj = store.get_store_by_id(store_id)
        if not store_obj:
            raise ResourceNotFoundError("Store not found")
            
        # Find the updated review
        updated_review = None
        for rev in store_obj.get("reviews", []):
            if rev.get("review_id") == review_id:
                updated_review = rev
                break
        
        if not updated_review:
            raise ResourceNotFoundError("Review not found")
            
        return jsonify({
            "message": result,
            "review": updated_review
        }), 200
        
    except (ValidationError, ForbiddenError, ResourceNotFoundError) as e:
        raise e
    except Exception as e:
        raise ApiError(str(e))


@reviews_bp.route('/stores/<store_id>/reviews/<review_id>', methods=['DELETE'])
@jwt_required()
def delete_store_review(store_id, review_id):
    """Delete a review. Only admin and store owners can delete reviews."""
    try:
        if not is_valid_object_id(store_id):
            raise ValidationError("Invalid store ID format")
            
        user = get_jwt_identity()
        claims = get_jwt()
        user_role = claims.get("role", "customer")
        
        if user_role == "customer":
            raise ForbiddenError("Customers are not permitted to delete reviews. You may edit your review instead.")
        
        # Checking if user is admin or store_owner
        is_admin = user_role == "admin"
        is_store_owner = user_role == "store_owner"
        
        # Only proceed if user is admin or store owner
        if is_admin or is_store_owner:
            success, message = review.delete_review(store_id, review_id, user, is_admin)
            if not success:
                raise ForbiddenError(message)
                
            return jsonify({"message": message}), 200
        else:
            raise ForbiddenError("Unauthorized to delete reviews")
        
    except (ValidationError, ForbiddenError) as e:
        raise e
    except Exception as e:
        raise ApiError(str(e))


@reviews_bp.route('/stores/<store_id>/reviews/<review_id>/reply', methods=['POST'])
@jwt_required()
def reply_to_store_review(store_id, review_id):
    """Add a reply to a review."""
    try:
        if not is_valid_object_id(store_id):
            raise ValidationError("Invalid store ID format")
            
        data = request.get_json()
        reply_text = data.get("reply", "").strip()
        user = get_jwt_identity()
        claims = get_jwt()
        
        if not reply_text:
            raise ValidationError("Reply text is required")
            
        # Only allow replies from admins or store owners
        store_data = store.get_store_by_id(store_id)
        if not store_data:
            raise ResourceNotFoundError("Store not found")
            
        if claims.get("role") != "admin" and store_data.get("owner", "") != user:
            raise ForbiddenError("Unauthorized: Only the store owner or admin can reply")
            
        # Set is_admin to true if the user has the admin role
        is_admin = claims.get("role") == "admin"
            
        success, message = review.add_reply_to_review(store_id, review_id, user, reply_text, is_admin)
        if not success:
            raise ResourceNotFoundError(message)
        
        # Get the updated store review
        updated_store = store.get_store_by_id(store_id)
        if not updated_store:
            raise ResourceNotFoundError("Store not found")
            
        # Find the reviewer to notify them
        review_obj = None
        for r in updated_store.get("reviews", []):
            if r.get("review_id") == review_id:
                review_obj = r
                break
                
        # If we found the review and it has a user, create a notification
        if review_obj and review_obj.get("user"):
            # Check if we have a notification system
            if hasattr(mongo.db, 'notifications'):
                notification = {
                    "user_id": review_obj.get("user"),
                    "type": "review_reply",
                    "content": {
                        "store_id": store_id,
                        "store_name": updated_store.get("company_name", "Store"),
                        "review_id": review_id,
                        "reply_from": "Admin" if is_admin else "Store Owner"
                    },
                    "is_read": False,
                    "created_at": datetime.utcnow()
                }
                mongo.db.notifications.insert_one(notification)
            
        return jsonify({"message": message}), 201
        
    except (ValidationError, ResourceNotFoundError, ForbiddenError) as e:
        raise e
    except Exception as e:
        raise ApiError(str(e))

@reviews_bp.route('/stores/<store_id>/reviews/<review_id>/reply/<reply_id>', methods=['PATCH'])
@jwt_required()
def edit_reply_to_review(store_id, review_id, reply_id):
    """Edit a reply to a review."""
    try:
        if not is_valid_object_id(store_id):
            raise ValidationError("Invalid store ID format")
            
        data = request.get_json()
        reply_text = data.get("reply", "").strip()
        user = get_jwt_identity()
        claims = get_jwt()
        
        if not reply_text:
            raise ValidationError("Reply text is required")
            
        # Check user permissions
        is_admin = claims.get("role") == "admin"
            
        success, message = review.edit_reply_to_review(store_id, review_id, reply_id, user, reply_text, is_admin)
        if not success:
            if "Unauthorized" in message:
                raise ForbiddenError(message)
            else:
                raise ResourceNotFoundError(message)
            
        return jsonify({"message": message}), 200
        
    except (ValidationError, ResourceNotFoundError, ForbiddenError) as e:
        raise e
    except Exception as e:
        raise ApiError(str(e))

@reviews_bp.route('/stores/<store_id>/reviews/<review_id>/reply/<reply_id>', methods=['DELETE'])
@jwt_required()
def delete_reply_to_review(store_id, review_id, reply_id):
    """Delete a reply to a review."""
    try:
        if not is_valid_object_id(store_id):
            raise ValidationError("Invalid store ID format")
            
        user = get_jwt_identity()
        claims = get_jwt()
        
        # Check user permissions
        is_admin = claims.get("role") == "admin"
            
        success, message = review.delete_reply_to_review(store_id, review_id, reply_id, user, is_admin)
        if not success:
            if "Unauthorized" in message:
                raise ForbiddenError(message)
            else:
                raise ResourceNotFoundError(message)
            
        return jsonify({"message": message}), 200
        
    except (ValidationError, ResourceNotFoundError, ForbiddenError) as e:
        raise e
    except Exception as e:
        raise ApiError(str(e))

@reviews_bp.route('/users/reviews/with-replies', methods=['GET'])
@jwt_required()
def get_user_reviews_with_replies():
    """Get all reviews by the current user that have received replies."""
    try:
        user_id = get_jwt_identity()
        reviews_with_replies = review.get_user_reviews_with_replies(user_id)
        
        return jsonify({
            "reviews": reviews_with_replies,
            "total": len(reviews_with_replies)
        }), 200
        
    except Exception as e:
        raise ApiError(str(e))