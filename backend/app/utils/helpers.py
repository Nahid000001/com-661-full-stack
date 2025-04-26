import uuid
from bson.objectid import ObjectId
from datetime import datetime

def generate_branch_id():
    """Generate a unique branch ID."""
    return str(uuid.uuid4())

def get_current_time():
    """Get the current UTC time."""
    return datetime.utcnow()

def is_valid_object_id(id):
    """Checks if a string is a valid MongoDB ObjectId"""
    try:
        ObjectId(id)
        return True
    except:
        return False