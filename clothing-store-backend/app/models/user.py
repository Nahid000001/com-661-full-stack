from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token
from app import mongo
from datetime import timedelta, datetime
from bson.objectid import ObjectId

def create_user(username, password, role="customer"):
    """Create a new user."""
    if mongo.db.users.find_one({"username": username}):
        return None
    
    hashed_password = generate_password_hash(password)
    
    user = {
        "username": username,
        "password": hashed_password,
        "role": role
    }
    
    user_id = mongo.db.users.insert_one(user).inserted_id
    return user_id

def validate_user(username, password):
    """Validate user credentials."""
    user = mongo.db.users.find_one({"username": username})
    
    if user and check_password_hash(user["password"], password):
        return user
    return None

def generate_token(username, role="customer"):
    """Generate JWT access token."""
    return create_access_token(identity=username, additional_claims={"role": role})

def update_password(username, new_password):
    """Update user password."""
    hashed_password = generate_password_hash(new_password)
    
    result = mongo.db.users.update_one(
        {"username": username},
        {"$set": {"password": hashed_password}}
    )
    
    return result.modified_count > 0

def create_reset_token(username):
    """Create a password reset token."""
    return create_access_token(identity=username, expires_delta=timedelta(minutes=15))

class User:
    """User model for authentication"""
    
    @staticmethod
    def create_user(email, password, first_name='', last_name='', username='', role='customer'):
        """Create a new user"""
        # If username is not provided, generate one from email
        if not username and email:
            username = email.split('@')[0]
            
        # Ensure we have either email or username
        if not email and not username:
            return None
            
        # Create the user document
        user = {
            "email": email,
            "username": username,
            "password": generate_password_hash(password),
            "first_name": first_name,
            "last_name": last_name,
            "role": role,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        try:
            result = mongo.db.users.insert_one(user)
            return str(result.inserted_id)
        except Exception as e:
            print(f"Error creating user: {e}")
            return None
    
    @staticmethod
    def get_user_by_email(email):
        """Get a user by email"""
        return mongo.db.users.find_one({"email": email})
    
    @staticmethod
    def get_user_by_username(username):
        """Get a user by username"""
        return mongo.db.users.find_one({"username": username})
    
    @staticmethod
    def get_user_by_id(user_id):
        """Get a user by ID"""
        return mongo.db.users.find_one({"_id": ObjectId(user_id)})
    
    @staticmethod
    def check_password(user, password):
        """Check if password is valid"""
        return check_password_hash(user["password"], password)