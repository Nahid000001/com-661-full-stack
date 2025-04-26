from flask import Flask
from app import create_app, mongo
from werkzeug.security import check_password_hash
import json
from bson import ObjectId

class JSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        return json.JSONEncoder.default(self, obj)

def check_users():
    """
    Check user credentials in the database
    """
    app = create_app()
    
    with app.app_context():
        # Get all users
        users = list(mongo.db.users.find({}))
        print(f"Total users found: {len(users)}")
        
        # Check admin user
        admin = mongo.db.users.find_one({"username": "admin"})
        if admin:
            print(f"\nAdmin User:")
            print(f"  Username: {admin.get('username')}")
            print(f"  Role: {admin.get('role')}")
            print(f"  Valid Password 'admin123': {check_password_hash(admin.get('password'), 'admin123')}")
        else:
            print("Admin user not found!")
        
        # Check store owners
        store_owners = list(mongo.db.users.find({"role": "store_owner"}))
        print(f"\nStore Owners ({len(store_owners)}):")
        for owner in store_owners:
            print(f"  Username: {owner.get('username')}")
            print(f"  Valid Password 'password123': {check_password_hash(owner.get('password'), 'password123')}")
            
            # Find associated store
            store = mongo.db.stores.find_one({"owner": str(owner.get('_id'))})
            if store:
                print(f"  Store: {store.get('company_name')}")
            else:
                print(f"  No store found for this owner!")
            print("")
        
        # Print example login JSON
        print("\nExample login POST data for admin:")
        print(json.dumps({
            "emailOrUsername": "admin",
            "password": "admin123"
        }, indent=2))
        
        print("\nExample login POST data for store owner:")
        if store_owners:
            print(json.dumps({
                "emailOrUsername": store_owners[0].get('username'),
                "password": "password123"
            }, indent=2))

if __name__ == "__main__":
    check_users() 