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
    
    # Create new store with enhanced fields
    store = {
        "company_name": store_data.get("company_name"),
        "title": store_data.get("title"),
        "description": store_data.get("description"),
        "location": store_data.get("location"),
        "work_type": store_data.get("work_type"),
        "contact_email": store_data.get("contact_email", ""),
        "contact_phone": store_data.get("contact_phone", ""),
        "store_category": store_data.get("store_category", ""),
        "image": store_data.get("image", ""),
        "branches": [branch_id],
        "views": 0,
        "reviews": [],
        "owner": owner,
        "managers": store_data.get("managers", []),
        "created_at": get_current_time(),
        "updated_at": get_current_time(),
        "created_by": store_data.get("created_by", owner)  # Track who created the store
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

def update_store(store_id, update_data, owner, is_admin=False):
    """Update a store."""
    store = mongo.db.stores.find_one({"_id": ObjectId(store_id)})
    if not store:
        return False, "Store not found"
    # Allow update if admin or store owner
    if not is_admin and store.get("owner", "") != owner:
        return False, "Unauthorized: Only the store owner or admin can update"
    update_data["updated_at"] = get_current_time()
    result = mongo.db.stores.update_one({"_id": ObjectId(store_id)}, {"$set": update_data})
    if result.modified_count == 0:
        return False, "No changes made"
    return True, "Store updated successfully"

def delete_store(store_id, owner, is_admin=False):
    """Delete a store."""
    
    store = mongo.db.stores.find_one({"_id": ObjectId(store_id)})
    if not store:
        return False, "Store not found"
    
    # Allow delete if admin or store owner
    if not is_admin and store.get("owner", "") != owner:
        return False, "Unauthorized: Only the store owner or admin can delete"
    
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

def assign_store_owner(store_id, new_owner_id, admin_id):
    """Assign a new owner to a store."""
    try:
        store = mongo.db.stores.find_one({"_id": ObjectId(store_id)})
        if not store:
            return False, "Store not found"
        
        # Update owner
        result = mongo.db.stores.update_one(
            {"_id": ObjectId(store_id)}, 
            {
                "$set": {
                    "owner": new_owner_id,
                    "updated_at": get_current_time(),
                    "updated_by": admin_id
                }
            }
        )
        
        if result.modified_count == 0:
            return False, "No changes made. Owner might already be assigned."
            
        return True, "Store owner assigned successfully"
    except Exception as e:
        return False, f"Error assigning store owner: {str(e)}"

def assign_store_manager(store_id, manager_id, assigned_by):
    """Add a manager to a store."""
    try:
        store = mongo.db.stores.find_one({"_id": ObjectId(store_id)})
        if not store:
            return False, "Store not found"
        
        # Check if manager is already assigned
        managers = store.get("managers", [])
        if manager_id in managers:
            return False, "User is already a manager for this store"
        
        # Add manager
        result = mongo.db.stores.update_one(
            {"_id": ObjectId(store_id)}, 
            {
                "$push": {"managers": manager_id},
                "$set": {
                    "updated_at": get_current_time(),
                    "updated_by": assigned_by
                }
            }
        )
        
        if result.modified_count == 0:
            return False, "No changes made"
            
        return True, "Store manager assigned successfully"
    except Exception as e:
        return False, f"Error assigning store manager: {str(e)}"

def remove_store_manager(store_id, manager_id, removed_by):
    """Remove a manager from a store."""
    try:
        store = mongo.db.stores.find_one({"_id": ObjectId(store_id)})
        if not store:
            return False, "Store not found"
        
        # Remove manager
        result = mongo.db.stores.update_one(
            {"_id": ObjectId(store_id)}, 
            {
                "$pull": {"managers": manager_id},
                "$set": {
                    "updated_at": get_current_time(),
                    "updated_by": removed_by
                }
            }
        )
        
        if result.modified_count == 0:
            return False, "No changes made. Manager might not be assigned."
            
        return True, "Store manager removed successfully"
    except Exception as e:
        return False, f"Error removing store manager: {str(e)}"

def get_store_staff(store_id):
    """Get the owner and managers of a store."""
    try:
        store = mongo.db.stores.find_one({"_id": ObjectId(store_id)})
        if not store:
            return None
            
        return {
            "owner": store.get("owner"),
            "managers": store.get("managers", [])
        }
    except Exception as e:
        print(f"Error retrieving store staff: {str(e)}")
        return None