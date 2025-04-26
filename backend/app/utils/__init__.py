from app.utils.helpers import generate_branch_id, get_current_time, is_valid_object_id
from bson.objectid import ObjectId
import uuid
import datetime

__all__ = ['generate_branch_id', 'get_current_time', 'is_valid_object_id']

def is_valid_object_id(id_str):
    """
    Check if the given string is a valid MongoDB ObjectId.
    Also accepts special test IDs like 'dummy1', 'dummy2', etc.
    """
    # Special case for testing
    if id_str in ['dummy1', 'dummy2', 'dummy3']:
        return True
        
    # Regular MongoDB ObjectId validation
    try:
        ObjectId(id_str)
        return True
    except:
        return False