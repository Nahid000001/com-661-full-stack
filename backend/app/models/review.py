from bson.objectid import ObjectId
from datetime import datetime
from app import mongo
from app.models import store

def get_latest_reviews(limit=3):
    """Get the latest reviews across all stores."""
    # Fetch all stores
    stores = list(mongo.db.stores.find())
    
    # Extract all reviews from all stores
    all_reviews = []
    
    for store_doc in stores:
        store_id = store_doc.get("_id")
        store_name = store_doc.get("company_name", "Unknown Store")
        
        # Get all reviews from this store
        for review in store_doc.get("reviews", []):
            # Add store information to the review
            enriched_review = {
                **review,
                "store_id": str(store_id),
                "store_name": store_name
            }
            all_reviews.append(enriched_review)
    
    # Sort reviews by created_at date (newest first)
    all_reviews.sort(key=lambda x: x.get("created_at", datetime.min), reverse=True)
    
    # Return only the requested number of reviews
    return all_reviews[:limit]

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
        review_exists = mongo.db.stores.find_one({
            "_id": ObjectId(store_id),
            "reviews.user": user
        })
        
        if review_exists:
            return False, "You have already reviewed this store. Please edit your existing review."
        
        # Create new review with a unique ID
        review_id = str(ObjectId())
        new_review = {
            "review_id": review_id,
            "user": user,
            "rating": rating,
            "comment": comment,
            "created_at": datetime.utcnow(),
            "replies": []
        }
        
        # Use an atomic update to add the review
        result = mongo.db.stores.update_one(
            {"_id": ObjectId(store_id)},
            {"$push": {"reviews": new_review}}
        )
        
        if result.modified_count == 0:
            return False, "Failed to add review. The store may not exist."
        
        # Update store's average rating using a separate function call
        update_store_rating(store_id)
        
        return True, "Review added successfully"
    except Exception as e:
        print(f"Error adding review: {str(e)}")
        return False, f"An error occurred: {str(e)}"

def edit_review(store_id, review_id, user, new_comment=None, new_rating=None):
    """Edit a review."""
    try:
        # Check if user is authorized to edit this review
        review_to_edit = mongo.db.stores.find_one(
            {
                "_id": ObjectId(store_id),
                "reviews.review_id": review_id,
                "reviews.user": user
            },
            {"reviews.$": 1}
        )
        
        if not review_to_edit:
            return False, "Review not found or you are not authorized to edit it"
        
        # Update fields
        update_fields = {}
        if new_comment is not None and new_comment.strip():
            update_fields["reviews.$.comment"] = new_comment
        
        if new_rating is not None:
            update_fields["reviews.$.rating"] = new_rating
        
        update_fields["reviews.$.updated_at"] = datetime.utcnow()
        
        if not update_fields:
            return False, "No changes provided for update"
        
        # Update the review with atomic operation
        result = mongo.db.stores.update_one(
            {
                "_id": ObjectId(store_id),
                "reviews.review_id": review_id,
                "reviews.user": user  # Ensure the user owns the review
            },
            {"$set": update_fields}
        )
        
        if result.matched_count == 0:
            return False, "Review not found or you are not authorized to edit it"
            
        if result.modified_count == 0:
            return False, "No changes were made"
        
        # Update store's average rating if rating changed
        if new_rating is not None:
            update_store_rating(store_id)
        
        return True, "Review updated successfully"
    except Exception as e:
        print(f"Error editing review: {str(e)}")
        return False, f"An error occurred: {str(e)}"

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

def add_reply_to_review(store_id, review_id, user, reply_text, is_admin=False):
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
        reply_id = str(ObjectId())
        reply = {
            "reply_id": reply_id,  # Add a unique ID for the reply
            "user": user,
            "text": reply_text,
            "created_at": datetime.utcnow(),
            "isAdmin": is_admin,  # Use camelCase to match frontend expectations
        }
        
        # Add reply to review
        result = mongo.db.stores.update_one(
            {"_id": ObjectId(store_id), "reviews.review_id": review_id},
            {"$push": {"reviews.$.replies": reply}}
        )
        
        if result.modified_count == 0:
            return False, "Failed to add reply"
        
        return True, "Reply added successfully"
    except Exception as e:
        return False, str(e)

def edit_reply_to_review(store_id, review_id, reply_id, user, reply_text, is_admin=False):
    """Edit a reply to a review."""
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
        
        # Find the reply
        review = reviews[review_index]
        replies = review.get("replies", [])
        reply_index = next((i for i, rep in enumerate(replies) if rep.get("reply_id") == reply_id), -1)
        
        if reply_index == -1:
            return False, "Reply not found"
        
        # Verify ownership or admin status
        reply = replies[reply_index]
        if not is_admin and reply.get("user") != user:
            return False, "Unauthorized: Only the reply author or admin can edit the reply"
        
        # Update reply text and add updated_at timestamp
        update_data = {
            f"reviews.{review_index}.replies.{reply_index}.text": reply_text,
            f"reviews.{review_index}.replies.{reply_index}.updated_at": datetime.utcnow()
        }
        
        result = mongo.db.stores.update_one(
            {"_id": ObjectId(store_id)},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            return False, "No changes were made"
        
        return True, "Reply updated successfully"
    except Exception as e:
        return False, str(e)

def delete_reply_to_review(store_id, review_id, reply_id, user, is_admin=False):
    """Delete a reply to a review."""
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
        
        # Find the reply
        review = reviews[review_index]
        replies = review.get("replies", [])
        reply = next((rep for rep in replies if rep.get("reply_id") == reply_id), None)
        
        if not reply:
            return False, "Reply not found"
        
        # Verify ownership or admin status
        if not is_admin and reply.get("user") != user:
            return False, "Unauthorized: Only the reply author or admin can delete the reply"
        
        # Remove the reply
        result = mongo.db.stores.update_one(
            {"_id": ObjectId(store_id)},
            {"$pull": {f"reviews.{review_index}.replies": {"reply_id": reply_id}}}
        )
        
        if result.modified_count == 0:
            return False, "Failed to delete reply"
        
        return True, "Reply deleted successfully"
    except Exception as e:
        return False, str(e)

def get_user_reviews_with_replies(user_id):
    """Get all reviews by a user that have received replies."""
    result = []
    
    # Find all stores with reviews by this user that have replies
    stores = list(mongo.db.stores.find({
        "reviews": {
            "$elemMatch": {
                "user": user_id,
                "replies": {"$exists": True, "$ne": []}
            }
        }
    }))
    
    for store_doc in stores:
        store_id = store_doc.get("_id")
        store_name = store_doc.get("company_name", "Unknown Store")
        
        # Get all reviews by this user that have replies
        for review in store_doc.get("reviews", []):
            if review.get("user") == user_id and review.get("replies") and len(review.get("replies")) > 0:
                # Add store information to the review
                enriched_review = {
                    **review,
                    "store_id": str(store_id),
                    "storeId": str(store_id),  # Add both formats for compatibility
                    "store_name": store_name,
                    "storeName": store_name   # Add both formats for compatibility
                }
                result.append(enriched_review)
    
    return result

def update_store_rating(store_id):
    """Update a store's average rating based on all reviews."""
    try:
        store_obj = mongo.db.stores.find_one({"_id": ObjectId(store_id)})
        if not store_obj:
            return False
        
        reviews = store_obj.get("reviews", [])
        if not reviews:
            # If no reviews, set average rating to 0
            mongo.db.stores.update_one(
                {"_id": ObjectId(store_id)},
                {"$set": {"average_rating": 0, "review_count": 0}}
            )
            return True
        
        # Calculate average rating
        total_rating = sum(review.get("rating", 0) for review in reviews)
        average_rating = round(total_rating / len(reviews), 1)  # Round to 1 decimal place
        
        # Update store with atomic operation
        result = mongo.db.stores.update_one(
            {"_id": ObjectId(store_id)},
            {
                "$set": {
                    "average_rating": average_rating,
                    "review_count": len(reviews)
                }
            }
        )
        
        return result.modified_count > 0
    except Exception as e:
        print(f"Error updating store rating: {str(e)}")
        return False
