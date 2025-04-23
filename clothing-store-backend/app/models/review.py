from bson.objectid import ObjectId
from datetime import datetime
from app import mongo
from app.models import store

def get_store_reviews(store_id, page=1, limit=5):
    """Get all reviews for a store with pagination."""
    store_obj = mongo.db.stores.find_one({"_id": ObjectId(store_id)})
    if not store_obj:
        return None
    
    reviews = store_obj.get("reviews", [])
    
    # Sort reviews by date (newest first)
    reviews.sort(key=lambda x: x.get("created_at", datetime.min), reverse=True)
    
    # Calculate pagination
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_reviews = reviews[start_idx:end_idx] if start_idx < len(reviews) else []
    
    return {
        "reviews": paginated_reviews,
        "total": len(reviews),
        "page": page,
        "limit": limit,
        "total_pages": (len(reviews) + limit - 1) // limit if reviews else 0
    }

def add_review(store_id, user, rating, comment):
    """Add a review to a store."""
    try:
        # Check if store exists
        store_obj = mongo.db.stores.find_one({"_id": ObjectId(store_id)})
        if not store_obj:
            return False, "Store not found"
        
        # Check if user has already reviewed this store
        reviews = store_obj.get("reviews", [])
        for review in reviews:
            if review.get("user") == user:
                return False, "You have already reviewed this store. Please edit your existing review."
        
        # Create new review
        review_id = ObjectId()
        new_review = {
            "review_id": str(review_id),
            "user": user,
            "rating": rating,
            "comment": comment,
            "created_at": datetime.utcnow(),
            "replies": []
        }
        
        # Add review to store
        result = mongo.db.stores.update_one(
            {"_id": ObjectId(store_id)},
            {"$push": {"reviews": new_review}}
        )
        
        if result.modified_count == 0:
            return False, "Failed to add review"
        
        # Update store's average rating
        update_store_rating(store_id)
        
        return True, "Review added successfully"
    except Exception as e:
        return False, str(e)

def edit_review(store_id, review_id, user, new_comment=None, new_rating=None):
    """Edit a review."""
    try:
        # Find the store
        store_obj = mongo.db.stores.find_one({"_id": ObjectId(store_id)})
        if not store_obj:
            return False, "Store not found"
        
        # Find the review
        reviews = store_obj.get("reviews", [])
        review_index = next((i for i, rev in enumerate(reviews) if rev.get("review_id") == review_id), -1)
        
        if review_index == -1:
            return False, "Review not found"
        
        # Check if user is the review owner
        if reviews[review_index].get("user") != user:
            return False, "Unauthorized: Only the review author can edit"
        
        # Update fields
        update_fields = {}
        if new_comment is not None and new_comment.strip():
            update_fields[f"reviews.{review_index}.comment"] = new_comment
        
        if new_rating is not None:
            update_fields[f"reviews.{review_index}.rating"] = new_rating
        
        update_fields[f"reviews.{review_index}.updated_at"] = datetime.utcnow()
        
        # Update the review
        result = mongo.db.stores.update_one(
            {"_id": ObjectId(store_id)},
            {"$set": update_fields}
        )
        
        if result.modified_count == 0:
            return False, "No changes made"
        
        # Update store's average rating if rating changed
        if new_rating is not None:
            update_store_rating(store_id)
        
        return True, "Review updated successfully"
    except Exception as e:
        return False, str(e)

def delete_review(store_id, review_id, user, is_admin=False):
    """Delete a review."""
    try:
        # Find the store
        store_obj = mongo.db.stores.find_one({"_id": ObjectId(store_id)})
        if not store_obj:
            return False, "Store not found"
        
        # Find the review
        reviews = store_obj.get("reviews", [])
        review_index = next((i for i, rev in enumerate(reviews) if rev.get("review_id") == review_id), -1)
        
        if review_index == -1:
            return False, "Review not found"
        
        # Only the review owner can delete their review, unless it's an admin
        if not is_admin and store_obj.get("owner") != user:
            return False, "Unauthorized: Only the store owner or admin can delete reviews"
        
        # Remove the review
        result = mongo.db.stores.update_one(
            {"_id": ObjectId(store_id)},
            {"$pull": {"reviews": {"review_id": review_id}}}
        )
        
        if result.modified_count == 0:
            return False, "Failed to delete review"
        
        # Update store's average rating
        update_store_rating(store_id)
        
        return True, "Review deleted successfully"
    except Exception as e:
        return False, str(e)

def add_reply_to_review(store_id, review_id, user, reply_text):
    """Add a reply to a review."""
    try:
        # Find the store
        store_obj = mongo.db.stores.find_one({"_id": ObjectId(store_id)})
        if not store_obj:
            return False, "Store not found"
        
        # Find the review
        reviews = store_obj.get("reviews", [])
        review_index = next((i for i, rev in enumerate(reviews) if rev.get("review_id") == review_id), -1)
        
        if review_index == -1:
            return False, "Review not found"
        
        # Create new reply
        reply = {
            "user": user,
            "text": reply_text,
            "created_at": datetime.utcnow()
        }
        
        # Add reply to review
        result = mongo.db.stores.update_one(
            {"_id": ObjectId(store_id)},
            {"$push": {f"reviews.{review_index}.replies": reply}}
        )
        
        if result.modified_count == 0:
            return False, "Failed to add reply"
        
        return True, "Reply added successfully"
    except Exception as e:
        return False, str(e)

def update_store_rating(store_id):
    """Update store's average rating based on all reviews."""
    try:
        store_obj = mongo.db.stores.find_one({"_id": ObjectId(store_id)})
        if not store_obj:
            return
        
        reviews = store_obj.get("reviews", [])
        if not reviews:
            # If no reviews, set average rating to 0
            mongo.db.stores.update_one(
                {"_id": ObjectId(store_id)},
                {"$set": {"average_rating": 0}}
            )
            return
        
        # Calculate average rating
        total_rating = sum(review.get("rating", 0) for review in reviews)
        average_rating = total_rating / len(reviews)
        
        # Update store with new average rating
        mongo.db.stores.update_one(
            {"_id": ObjectId(store_id)},
            {"$set": {"average_rating": round(average_rating, 1)}}
        )
    except Exception:
        pass
