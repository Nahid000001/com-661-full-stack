import os
import sys
import dotenv
from pymongo import MongoClient
from bson.objectid import ObjectId

# Load environment variables
dotenv.load_dotenv()

# MongoDB connection - use Atlas connection found in the codebase
MONGO_URI = "mongodb+srv://mehedinahid2019:Learn9267@cluster0.fppgneo.mongodb.net/ClothingStore?retryWrites=true&w=majority"

try:
    client = MongoClient(MONGO_URI)
    db = client.get_database()
    users_collection = db.users
    
    # Update username 'admin' to have admin role
    result = users_collection.update_one(
        {"username": "admin"}, 
        {"$set": {"role": "admin"}}
    )
    
    if result.matched_count > 0:
        if result.modified_count > 0:
            print(f"Successfully updated user 'admin' to admin role")
        else:
            print(f"User 'admin' already has admin role")
    else:
        # Find users with admin roles
        admin_users = list(users_collection.find({"role": "admin"}))
        if admin_users:
            print(f"Found {len(admin_users)} admin users:")
            for user in admin_users:
                print(f"  - {user.get('username')} (ID: {user.get('_id')})")
        else:
            print("No admin user found with username 'admin'")
            
            # List all users
            all_users = list(users_collection.find({}, {"username": 1, "role": 1}))
            if all_users:
                print(f"Found {len(all_users)} users in total:")
                for user in all_users:
                    print(f"  - {user.get('username')} (Role: {user.get('role', 'not set')})")
                
                # Ask if user wants to update a specific user
                user_input = input("\nEnter username to set as admin (or press Enter to skip): ")
                if user_input:
                    update_result = users_collection.update_one(
                        {"username": user_input}, 
                        {"$set": {"role": "admin"}}
                    )
                    if update_result.modified_count > 0:
                        print(f"Successfully updated user '{user_input}' to admin role")
                    else:
                        print(f"Failed to update user '{user_input}' or user already has admin role")
            else:
                print("No users found in the database")
    
except Exception as e:
    print(f"Error: {str(e)}")
finally:
    client.close() 