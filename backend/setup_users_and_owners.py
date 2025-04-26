from flask import Flask
from app import create_app, mongo
from werkzeug.security import generate_password_hash
import random
from bson import ObjectId
import os
import json

app = create_app()

def setup_users_and_store_owners():
    """
    Set up store owners for existing stores and create an admin user
    """
    with app.app_context():
        # 1. Check existing stores
        stores = list(mongo.db.stores.find({}))
        print(f"Found {len(stores)} stores in the database")
        
        # 2. Create store owner accounts
        store_owners = []
        
        # Create a unique store owner for each store
        for i, store in enumerate(stores):
            store_name = store.get('company_name', f'Store {i+1}')
            username = f"owner_{store_name.lower().replace(' ', '_')}"[:20]  # Limit username length
            email = f"{username}@example.com"
            
            # Check if user already exists
            existing_user = mongo.db.users.find_one({"username": username})
            
            if not existing_user:
                user_data = {
                    "username": username,
                    "email": email,
                    "password": generate_password_hash("password123"),  # Default password
                    "role": "store_owner",
                    "profile": {
                        "full_name": f"{store_name} Owner",
                        "location": store.get('location', 'Unknown'),
                        "bio": f"Owner of {store_name}"
                    }
                }
                
                # Insert user and get user ID
                user_id = mongo.db.users.insert_one(user_data).inserted_id
                user_id_str = str(user_id)
                
                # Associate this store with the new owner
                mongo.db.stores.update_one(
                    {"_id": store["_id"]},
                    {"$set": {"owner": user_id_str}}
                )
                
                # Add to store owners list for reporting
                store_owners.append({
                    "username": username,
                    "user_id": user_id_str,
                    "store": store_name,
                    "store_id": str(store["_id"])
                })
                
                print(f"Created store owner '{username}' (ID: {user_id_str}) for store '{store_name}'")
            else:
                # If user exists, still ensure they're the owner of this store
                user_id_str = str(existing_user["_id"])
                mongo.db.stores.update_one(
                    {"_id": store["_id"]},
                    {"$set": {"owner": user_id_str}}
                )
                print(f"Store owner '{username}' already exists, assigned to store '{store_name}'")
        
        # 3. Create admin user if it doesn't exist
        admin_user = mongo.db.users.find_one({"username": "admin"})
        
        if not admin_user:
            admin_data = {
                "username": "admin",
                "email": "admin@example.com",
                "password": generate_password_hash("admin123"),  # Admin password
                "role": "admin",
                "profile": {
                    "full_name": "System Administrator",
                    "location": "Global",
                    "bio": "Main administrator of the clothing store platform"
                }
            }
            
            admin_id = mongo.db.users.insert_one(admin_data).inserted_id
            print(f"Created admin user 'admin' (ID: {admin_id})")
        else:
            print("Admin user already exists")
        
        # 4. Display summary
        print("\nSUMMARY:")
        print(f"- Created/assigned {len(store_owners)} store owners")
        print(f"- Admin user: 'admin' with password 'admin123'")
        print(f"- Store owners all have password: 'password123'")
        
        # Return a summary for review
        return {
            "store_owners": store_owners,
            "admin": {
                "username": "admin",
                "password": "admin123"
            }
        }

if __name__ == "__main__":
    setup_users_and_store_owners() 