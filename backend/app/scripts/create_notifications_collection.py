#!/usr/bin/env python
"""
Script to create and configure the notifications collection for review responses.
"""

import sys
import os
import logging
from pymongo import MongoClient, DESCENDING, ASCENDING
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Get MongoDB connection string from environment or use default
MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/clothing_store_db')
DB_NAME = os.environ.get('DB_NAME', 'clothing_store_db')

def setup_notifications_collection():
    """Create and configure the notifications collection."""
    try:
        # Connect to MongoDB
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        
        logging.info("Connected to MongoDB")
        
        # Check if the collection already exists
        collection_names = db.list_collection_names()
        if "notifications" in collection_names:
            logging.info("Notifications collection already exists")
        else:
            # Create the collection
            db.create_collection("notifications")
            logging.info("Created notifications collection")
            
        # Create necessary indexes
        db.notifications.create_index([("user_id", ASCENDING)])
        db.notifications.create_index([("created_at", DESCENDING)])
        db.notifications.create_index([("is_read", ASCENDING)])
        
        logging.info("Notifications collection indexes created/updated")
        
        # Add a sample notification for testing if needed
        if os.environ.get('ADD_SAMPLE_NOTIFICATION', '').lower() == 'true':
            sample = {
                "user_id": "test_user",
                "type": "review_reply",
                "content": {
                    "store_id": "sample_store_id",
                    "store_name": "Sample Store",
                    "review_id": "sample_review_id",
                    "reply_from": "Store Owner"
                },
                "is_read": False,
                "created_at": datetime.utcnow()
            }
            db.notifications.insert_one(sample)
            logging.info("Added sample notification")
        
        return True
        
    except Exception as e:
        logging.error(f"Error setting up notifications collection: {str(e)}")
        return False
    finally:
        if 'client' in locals():
            client.close()
            logging.info("MongoDB connection closed")

if __name__ == "__main__":
    logging.info("Setting up notifications collection for review responses")
    success = setup_notifications_collection()
    sys.exit(0 if success else 1) 