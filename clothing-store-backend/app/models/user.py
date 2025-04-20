from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token
from app import mongo
from datetime import timedelta

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