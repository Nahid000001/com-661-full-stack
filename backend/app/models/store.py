from bson.objectid import ObjectId
from app import mongo
from app.utils import generate_branch_id, get_current_time

def create_store(store_data, owner):
    """Create a new store."""
    branch_id = generate_branch_id()
    
    existing_store = mongo.db.stores.find_one({
        "company_name": store_data.get("company_name"),
        "location": store_data.get("location")
    })
    
    if existing_store:
        if "branches" in existing_store:
            mongo.db.stores.update_one(
                {"_id": existing_store["_id"]},
                {"$push": {"branches": branch_id}}
            )
            return {"store_id": str(existing_store["_id"]), "branch_id": branch_id, "is_new": False}
        else:

            mongo.db.stores.update_one(
                {"_id": existing_store["_id"]},
                {"$set": {"branches": [branch_id]}}
            )
            return {"store_id": str(existing_store["_id"]), "branch_id": branch_id, "is_new": False}
    
    # Create new store
    store = {
        "company_name": store_data.get("company_name"),
        "title": store_data.get("title"),
        "description": store_data.get("description"),
        "location": store_data.get("location"),
        "work_type": store_data.get("work_type"),
        "branches": [branch_id],
        "views": 0,
        "reviews": [],
        "owner": owner,
        "created_at": get_current_time()
    }
    
    store_id = mongo.db.stores.insert_one(store).inserted_id
    return {"store_id": str(store_id), "branch_id": branch_id, "is_new": True}

def get_all_stores(page=1, limit=10, sort=''):
    """Get all stores with pagination and optional sorting."""
    skip = (page - 1) * limit
    
    # Set up the sort order
    sort_options = {
        'rating': [('average_rating', -1)],  # Sort by rating descending
        'newest': [('created_at', -1)],      # Sort by creation date descending
        'oldest': [('created_at', 1)],       # Sort by creation date ascending
        'nameAsc': [('company_name', 1)],    # Sort by name ascending
        'nameDesc': [('company_name', -1)]   # Sort by name descending
    }
    
    # Default sort order is by creation date, newest first
    sort_order = sort_options.get(sort, [('created_at', -1)])
    
    # Get the stores with sorting applied
    stores_cursor = mongo.db.stores.find().sort(sort_order).skip(skip).limit(limit)
    
    # Process the stores to include any computed fields
    stores = []
    for store in stores_cursor:
        store_dict = {**store, "_id": str(store["_id"])}
        
        # Calculate average rating if it doesn't exist
        if 'average_rating' not in store_dict and 'reviews' in store_dict and store_dict['reviews']:
            ratings = [review.get('rating', 0) for review in store_dict['reviews'] if isinstance(review, dict)]
            if ratings:
                store_dict['average_rating'] = sum(ratings) / len(ratings)
            else:
                store_dict['average_rating'] = 0
        
        # Add review count
        if 'reviews' in store_dict:
            store_dict['review_count'] = len(store_dict['reviews']) if isinstance(store_dict['reviews'], list) else 0
        
        stores.append(store_dict)
    
    total_stores = mongo.db.stores.count_documents({})
    
    return {
        "stores": stores,
        "total": total_stores,
        "page": page,
        "limit": limit,
        "total_pages": (total_stores + limit - 1) // limit
    }

def get_store_by_id(store_id, user_id=None, role=None):
    """
    Get a store by ID and increment view counter.
    
    Args:
        store_id: The ID of the store to retrieve
        user_id: The ID of the current user (if authenticated)
        role: The role of the current user (admin, store_owner, user, or None if not authenticated)
    
    Returns:
        Store data filtered according to user role, or None if store not found
    """
    try:
        # Handle special test store IDs
        if store_id in ['dummy1', 'dummy2', 'dummy3']:
            # Create a test store for UI development
            test_store = {
                "_id": store_id,
                "company_name": f"Test Store {store_id}",
                "title": "Test Store for Development",
                "description": "This is a test store used for development purposes. It doesn't exist in the database.",
                "location": "Test Location",
                "work_type": "Retail",
                "views": 100,
                "average_rating": 4.5,
                "review_count": 10,
                "branches": ["test-branch-1", "test-branch-2"],
                "created_at": "2023-01-01T00:00:00.000Z",
                "owner": "admin"
            }
            
            # Filter store data based on user role
            if role == "admin":
                test_store["is_admin"] = True
                test_store["can_edit"] = True
                test_store["can_delete"] = True
            elif role == "store_owner" and user_id == "admin":
                test_store["is_owner"] = True
                test_store["can_edit"] = True
                test_store["can_delete"] = True
                
            return test_store
            
        # Normal flow for real store IDs
        store = mongo.db.stores.find_one({"_id": ObjectId(store_id)})
        if not store:
            return None
        
        # Increment view counter (only for public views)
        if not user_id or role == "user":
            mongo.db.stores.update_one({"_id": ObjectId(store_id)}, {"$inc": {"views": 1}})
        
        # Convert ObjectId to string for JSON serialization
        store["_id"] = str(store["_id"])
        
        # Filter store data based on user role
        if not user_id or not role:
            # Unauthenticated users get limited public data
            public_store = {
                "_id": store["_id"],
                "company_name": store["company_name"],
                "title": store["title"],
                "description": store["description"],
                "location": store["location"],
                "work_type": store["work_type"],
                "views": store.get("views", 0),
                "average_rating": store.get("average_rating", 0),
                "review_count": len(store.get("reviews", [])) if isinstance(store.get("reviews", []), list) else 0
            }
            return public_store
            
        elif role == "admin":
            # Admins get full store data plus admin tools flags
            store["is_admin"] = True
            store["can_edit"] = True
            store["can_delete"] = True
            return store
            
        elif role == "store_owner" and store.get("owner", "") == user_id:
            # Store owners get their own stores with edit permissions
            store["is_owner"] = True
            store["can_edit"] = True
            store["can_delete"] = True
            return store
            
        else:
            # Regular authenticated users get public data plus any user-specific flags
            public_store = {
                "_id": store["_id"],
                "company_name": store["company_name"],
                "title": store["title"],
                "description": store["description"],
                "location": store["location"],
                "work_type": store["work_type"],
                "views": store.get("views", 0),
                "average_rating": store.get("average_rating", 0),
                "review_count": len(store.get("reviews", [])) if isinstance(store.get("reviews", []), list) else 0,
                "branches": store.get("branches", []),
                "created_at": store.get("created_at", "")
            }
            return public_store
            
    except Exception as e:
        print(f"Error retrieving store: {str(e)}")
        return None

def update_store(store_id, update_data, owner):
    """Update a store."""
    # Fetch store details
    store = mongo.db.stores.find_one({"_id": ObjectId(store_id)})
    if not store:
        return False, "Store not found"
    
    # Only allow update if the user is the store owner
    if store.get("owner", "") != owner:
        return False, "Unauthorized: Only the store owner can update"
    
    # Add updated timestamp
    update_data["updated_at"] = get_current_time()
    
    # Perform update
    result = mongo.db.stores.update_one({"_id": ObjectId(store_id)}, {"$set": update_data})
    
    if result.modified_count == 0:
        return False, "No changes made"
    
    return True, "Store updated successfully"

def delete_store(store_id, owner):
    """Delete a store."""
    
    store = mongo.db.stores.find_one({"_id": ObjectId(store_id)})
    if not store:
        return False, "Store not found"
    
    # Only allow deletion if the user is the store owner
    if store.get("owner", "") != owner:
        return False, "Unauthorized: Only the store owner can delete"
    
    result = mongo.db.stores.delete_one({"_id": ObjectId(store_id)})
    
    if result.deleted_count == 0:
        return False, "Store not found"
    
    return True, "Store deleted successfully"

def delete_branch(store_id, branch_id, owner):
    """Delete a branch from a store."""
    
    store = mongo.db.stores.find_one({"_id": ObjectId(store_id)})
    if not store:
        return False, "Store not found", False
    
    # Only allow deletion if the user is the store owner
    if store.get("owner", "") != owner:
        return False, "Unauthorized: Only the store owner can delete branches", False
    
    branches = store.get("branches", [])
    if not branches:
        return False, "No branches exist for this store", False
    
    # Check if branch exists
    if branch_id not in branches:
        return False, "Branch not found", False
    
    updated_branches = [b for b in branches if b != branch_id]
    
    # Update the store with the new branches list
    mongo.db.stores.update_one(
        {"_id": ObjectId(store_id)},
        {"$set": {"branches": updated_branches}}
    )
    
    # If there are no branches left, allow deleting the entire store
    store_deleted = False
    if not updated_branches:
        mongo.db.stores.delete_one({"_id": ObjectId(store_id)})
        store_deleted = True
    
    return True, "Branch deleted successfully", store_deleted