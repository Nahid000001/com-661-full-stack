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

def get_all_stores(page=1, limit=10):
    """Get all stores with pagination."""
    skip = (page - 1) * limit
    
    stores_cursor = mongo.db.stores.find().skip(skip).limit(limit)
    stores = [{**store, "_id": str(store["_id"])} for store in stores_cursor]
    
    total_stores = mongo.db.stores.count_documents({})
    
    return {
        "stores": stores,
        "total": total_stores,
        "page": page,
        "limit": limit,
        "total_pages": (total_stores + limit - 1) // limit
    }

def get_store_by_id(store_id):
    """Get a store by ID and increment view counter."""
    try:
        store = mongo.db.stores.find_one({"_id": ObjectId(store_id)})
        if not store:
            return None
        
        mongo.db.stores.update_one({"_id": ObjectId(store_id)}, {"$inc": {"views": 1}})
        
        # Convert ObjectId to string for JSON serialization
        store["_id"] = str(store["_id"])
        return store
    except:
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