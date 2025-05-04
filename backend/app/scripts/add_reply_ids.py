#!/usr/bin/env python
"""
Migration script to add reply_id to existing review replies.
This script should be run once after deploying the updated code that supports reply editing/deleting.
"""

import sys
import os
import logging
from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Get MongoDB connection string from environment or use default
MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/clothing_store_db')
DB_NAME = os.environ.get('DB_NAME', 'clothing_store_db')

def add_reply_ids():
    """Add reply_id to all existing replies in reviews."""
    try:
        # Connect to MongoDB
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        stores_collection = db.stores
        
        logging.info("Connected to MongoDB")
        
        # Find all stores with reviews that have replies
        stores = list(stores_collection.find({
            "reviews.replies": {"$exists": True, "$ne": []}
        }))
        
        if not stores:
            logging.info("No stores found with reviews that have replies.")
            return
        
        logging.info(f"Found {len(stores)} stores with reviews that have replies")
        
        stores_updated = 0
        reviews_updated = 0
        replies_updated = 0
        
        for store in stores:
            store_id = store["_id"]
            modified = False
            
            # Process each review in the store
            for i, review in enumerate(store.get("reviews", [])):
                review_replies = review.get("replies", [])
                
                if not review_replies:
                    continue
                
                # Process each reply in the review
                for j, reply in enumerate(review_replies):
                    # Check if the reply already has a reply_id
                    if "reply_id" not in reply:
                        # Add a reply_id
                        reply["reply_id"] = str(ObjectId())
                        modified = True
                        replies_updated += 1
            
            # Update the store if any reviews were modified
            if modified:
                stores_collection.update_one(
                    {"_id": store_id},
                    {"$set": {"reviews": store["reviews"]}}
                )
                stores_updated += 1
                reviews_updated += len([r for r in store["reviews"] if r.get("replies")])
        
        logging.info(f"Updated {stores_updated} stores, {reviews_updated} reviews, and {replies_updated} replies")
        logging.info("Migration completed successfully")
        
    except Exception as e:
        logging.error(f"Error during migration: {str(e)}")
        return False
    finally:
        if 'client' in locals():
            client.close()
            logging.info("MongoDB connection closed")
    
    return True

if __name__ == "__main__":
    logging.info("Starting migration to add reply_id to existing review replies")
    success = add_reply_ids()
    sys.exit(0 if success else 1) 