from flask import Blueprint, request, jsonify, abort
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.models import store
from app.utils import is_valid_object_id, sanitize_input
from app.middlewares.auth import (
    get_user_details, 
    owner_or_admin_required, 
    admin_required,
    verify_store_ownership, 
    verify_user_exists,
    admin_only_middleware,
    rate_limit_middleware
)
from app.utils.error_handler import (
    ApiError, 
    ResourceNotFoundError, 
    UnauthorizedError, 
    ForbiddenError, 
    ValidationError
)
import logging

# Set up logging
logger = logging.getLogger(__name__)

stores_bp = Blueprint('stores', __name__)

@stores_bp.route('/', methods=['POST'])
@jwt_required()
@owner_or_admin_required
@rate_limit_middleware(max_requests=20, time_window=60)  # Rate limit: 20 requests per minute
def add_store():
    """
    Add a new store
    ---
    tags:
      - Stores
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - company_name
              - title
              - description
              - location
              - work_type
            properties:
              company_name:
                type: string
                description: Name of the company
              title:
                type: string
                description: Store title
              description:
                type: string
                description: Store description
              location:
                type: string
                description: Store location
              work_type:
                type: string
                description: Type of work (e.g., retail, manufacturing)
              contact_email:
                type: string
                description: Store contact email
              contact_phone:
                type: string
                description: Store contact phone
              store_category:
                type: string
                description: Store category or type
              image:
                type: string
                description: URL of the store logo/image
              managers:
                type: array
                items:
                  type: string
                description: List of manager usernames
    responses:
      201:
        description: Store added successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                message:
                  type: string
                  example: Store added successfully
                store_id:
                  type: string
                  example: 5f8d0c55b54764421b71946a
                branch_id:
                  type: string
                  example: 5f8d0c55b54764421b71946b
      400:
        description: Validation error
      401:
        description: Unauthorized
      403:
        description: Forbidden
    """
    try:
        user = get_jwt_identity()
        claims = get_jwt()
        role = claims.get("role", "user")
        
        # Log the store creation attempt
        logger.info(f"Store creation attempt by user {user} with role {role}")
        
        # Parse and validate input data
        data = request.get_json()
        
        # Validate required fields
        required_fields = ["company_name", "title", "description", "location", "work_type"]
        for field in required_fields:
            if field not in data or not data[field] or not data[field].strip():
                logger.warning(f"Missing required field: {field}")
                return jsonify({"error": f"Missing required field: {field}"}), 400
                
        # Sanitize all text inputs to prevent injection attacks
        for key, value in data.items():
            if isinstance(value, str):
                data[key] = sanitize_input(value)
                
        # Validate email format if provided
        if "contact_email" in data and data["contact_email"]:
            import re
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_pattern, data["contact_email"]):
                logger.warning("Invalid email format")
                return jsonify({"error": "Invalid email format"}), 400
                
        # Verify manager usernames exist if provided
        if "managers" in data and data["managers"]:
            if not isinstance(data["managers"], list):
                logger.warning("Managers must be provided as a list")
                return jsonify({"error": "Managers must be provided as a list"}), 400
                
            for manager in data["managers"]:
                if not verify_user_exists(manager):
                    logger.warning(f"Manager not found: {manager}")
                    return jsonify({"error": f"Manager not found: {manager}"}), 404

        # Set created_by field
        data["created_by"] = user
                    
        # Create the store
        result = store.create_store(data, user)
        
        # Log the successful creation
        logger.info(f"Store created successfully: {result['store_id']}")
        
        if result["is_new"]:
            return jsonify({
                "message": "Store added successfully",
                "store_id": result["store_id"],
                "branch_id": result["branch_id"]
            }), 201
        else:
            return jsonify({
                "message": "Store already exists, but a new branch was added",
                "store_id": result["store_id"],
                "branch_id": result["branch_id"]
            }), 201

    except (ForbiddenError, ValidationError) as e:
        logger.error(f"Error during store creation: {str(e)}")
        raise e
    except Exception as e:
        logger.error(f"Unexpected error during store creation: {str(e)}")
        raise ApiError(f"An error occurred: {str(e)}", 500)

@stores_bp.route('/admin/create', methods=['POST'])
@jwt_required()
@admin_required
def admin_add_store():
    """
    Admin endpoint for adding a store with owner assignment
    ---
    tags:
      - Admin
      - Stores
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - company_name
              - title
              - description
              - location
              - work_type
              - owner
            properties:
              company_name:
                type: string
              title:
                type: string
              description:
                type: string
              location:
                type: string
              work_type:
                type: string
              contact_email:
                type: string
              contact_phone:
                type: string
              store_category:
                type: string
              image:
                type: string
              owner:
                type: string
                description: Username of the owner to assign
              managers:
                type: array
                items:
                  type: string
                description: List of manager usernames
    responses:
      201:
        description: Store added successfully
      400:
        description: Validation error
      401:
        description: Unauthorized
      403:
        description: Forbidden - Admin only
      404:
        description: Owner not found
    """
    try:
        # Get admin identity
        admin_user = get_jwt_identity()
        
        # Parse request data
        data = request.get_json()
        
        # Validate required fields
        required_fields = ["company_name", "title", "description", "location", "work_type", "owner"]
        for field in required_fields:
            if field not in data or not data[field] or not data[field].strip():
                return jsonify({"error": f"Missing required field: {field}"}), 400
                
        # Sanitize all text inputs
        for key, value in data.items():
            if isinstance(value, str):
                data[key] = sanitize_input(value)
        
        # Verify owner exists
        owner_username = data.pop("owner")  # Remove from data to avoid duplicate
        if not verify_user_exists(owner_username):
            return jsonify({"error": f"Owner not found: {owner_username}"}), 404
            
        # Verify managers exist if provided
        if "managers" in data and data["managers"]:
            if not isinstance(data["managers"], list):
                return jsonify({"error": "Managers must be provided as a list"}), 400
                
            for manager in data["managers"]:
                if not verify_user_exists(manager):
                    return jsonify({"error": f"Manager not found: {manager}"}), 404
        
        # Set created_by field
        data["created_by"] = admin_user
                    
        # Create the store with the specified owner
        result = store.create_store(data, owner_username)
        
        # Log the store creation by admin
        logger.info(f"Store created by admin {admin_user}, assigned to {owner_username}: {result['store_id']}")
        
        return jsonify({
            "message": "Store added successfully and assigned to owner",
            "store_id": result["store_id"],
            "branch_id": result["branch_id"],
            "owner": owner_username
        }), 201
        
    except Exception as e:
        logger.error(f"Error in admin store creation: {str(e)}")
        return jsonify({"error": str(e)}), 500

@stores_bp.route('/<store_id>/owner', methods=['PUT'])
@jwt_required()
@admin_required
def assign_store_owner(store_id):
    """
    Assign a store owner (admin only)
    ---
    tags:
      - Admin
      - Stores
    security:
      - bearerAuth: []
    parameters:
      - name: store_id
        in: path
        required: true
        schema:
          type: string
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - owner
            properties:
              owner:
                type: string
                description: Username of the new owner
    responses:
      200:
        description: Owner assigned successfully
      400:
        description: Invalid request
      401:
        description: Unauthorized
      403:
        description: Forbidden - Admin only
      404:
        description: Store or user not found
    """
    try:
        # Verify store_id format
        if not is_valid_object_id(store_id):
            return jsonify({"error": "Invalid store ID format"}), 400
            
        # Get admin identity
        admin_user = get_jwt_identity()
        
        # Get new owner from request
        data = request.get_json()
        if not data or "owner" not in data or not data["owner"]:
            return jsonify({"error": "New owner username is required"}), 400
            
        new_owner = data["owner"]
        
        # Verify user exists
        if not verify_user_exists(new_owner):
            return jsonify({"error": f"User not found: {new_owner}"}), 404
            
        # Assign new owner
        success, message = store.assign_store_owner(store_id, new_owner, admin_user)
        
        if success:
            logger.info(f"Store {store_id} ownership changed to {new_owner} by admin {admin_user}")
            return jsonify({"message": message}), 200
        else:
            return jsonify({"error": message}), 400
            
    except Exception as e:
        logger.error(f"Error assigning store owner: {str(e)}")
        return jsonify({"error": str(e)}), 500

@stores_bp.route('/<store_id>/managers', methods=['POST'])
@jwt_required()
def add_store_manager(store_id):
    """
    Add a manager to a store (owner or admin only)
    ---
    tags:
      - Stores
    security:
      - bearerAuth: []
    parameters:
      - name: store_id
        in: path
        required: true
        schema:
          type: string
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - manager
            properties:
              manager:
                type: string
                description: Username of the manager to add
    responses:
      200:
        description: Manager added successfully
      400:
        description: Invalid request
      401:
        description: Unauthorized
      403:
        description: Forbidden - Owner or admin only
      404:
        description: Store or user not found
    """
    try:
        # Verify store_id format
        if not is_valid_object_id(store_id):
            return jsonify({"error": "Invalid store ID format"}), 400
            
        # Get user identity and role
        user = get_jwt_identity()
        claims = get_jwt()
        role = claims.get("role", "user")
        
        # Check if user has permission to add managers
        if role != "admin" and not verify_store_ownership(store_id, user, role):
            return jsonify({"error": "Unauthorized. Only store owner or admin can add managers"}), 403
            
        # Get manager from request
        data = request.get_json()
        if not data or "manager" not in data or not data["manager"]:
            return jsonify({"error": "Manager username is required"}), 400
            
        manager = data["manager"]
        
        # Verify user exists
        if not verify_user_exists(manager):
            return jsonify({"error": f"User not found: {manager}"}), 404
            
        # Add manager
        success, message = store.assign_store_manager(store_id, manager, user)
        
        if success:
            logger.info(f"Manager {manager} added to store {store_id} by {user}")
            return jsonify({"message": message}), 200
        else:
            return jsonify({"error": message}), 400
            
    except Exception as e:
        logger.error(f"Error adding store manager: {str(e)}")
        return jsonify({"error": str(e)}), 500

@stores_bp.route('/<store_id>/managers/<manager>', methods=['DELETE'])
@jwt_required()
def remove_store_manager(store_id, manager):
    """
    Remove a manager from a store (owner or admin only)
    ---
    tags:
      - Stores
    security:
      - bearerAuth: []
    parameters:
      - name: store_id
        in: path
        required: true
        schema:
          type: string
      - name: manager
        in: path
        required: true
        schema:
          type: string
    responses:
      200:
        description: Manager removed successfully
      400:
        description: Invalid request
      401:
        description: Unauthorized
      403:
        description: Forbidden - Owner or admin only
      404:
        description: Store or user not found
    """
    try:
        # Verify store_id format
        if not is_valid_object_id(store_id):
            return jsonify({"error": "Invalid store ID format"}), 400
            
        # Get user identity and role
        user = get_jwt_identity()
        claims = get_jwt()
        role = claims.get("role", "user")
        
        # Check if user has permission to remove managers
        if role != "admin" and not verify_store_ownership(store_id, user, role):
            return jsonify({"error": "Unauthorized. Only store owner or admin can remove managers"}), 403
            
        # Verify user exists
        if not verify_user_exists(manager):
            return jsonify({"error": f"User not found: {manager}"}), 404
            
        # Remove manager
        success, message = store.remove_store_manager(store_id, manager, user)
        
        if success:
            logger.info(f"Manager {manager} removed from store {store_id} by {user}")
            return jsonify({"message": message}), 200
        else:
            return jsonify({"error": message}), 400
            
    except Exception as e:
        logger.error(f"Error removing store manager: {str(e)}")
        return jsonify({"error": str(e)}), 500

@stores_bp.route('/<store_id>/staff', methods=['GET'])
@jwt_required()
def get_store_staff(store_id):
    """
    Get store staff (owner and managers)
    ---
    tags:
      - Stores
    security:
      - bearerAuth: []
    parameters:
      - name: store_id
        in: path
        required: true
        schema:
          type: string
    responses:
      200:
        description: Store staff retrieved successfully
      400:
        description: Invalid request
      401:
        description: Unauthorized
      404:
        description: Store not found
    """
    try:
        # Verify store_id format
        if not is_valid_object_id(store_id):
            return jsonify({"error": "Invalid store ID format"}), 400
            
        # Get store staff
        staff = store.get_store_staff(store_id)
        
        if staff is None:
            return jsonify({"error": "Store not found"}), 404
            
        return jsonify(staff), 200
            
    except Exception as e:
        logger.error(f"Error retrieving store staff: {str(e)}")
        return jsonify({"error": str(e)}), 500

@stores_bp.route('', methods=['GET'])
@stores_bp.route('/', methods=['GET'])
def get_stores():
    """
    Get all stores with pagination
    ---
    tags:
      - Stores
    parameters:
      - name: page
        in: query
        schema:
          type: integer
          default: 1
        description: Page number
      - name: limit
        in: query
        schema:
          type: integer
          default: 10
        description: Number of stores per page
      - name: sort
        in: query
        schema:
          type: string
          enum: [rating, newest, oldest, name]
        description: Sort criteria
    responses:
      200:
        description: List of stores
        content:
          application/json:
            schema:
              type: object
              properties:
                stores:
                  type: array
                  items:
                    type: object
                    properties:
                      _id:
                        type: string
                      company_name:
                        type: string
                      title:
                        type: string
                      description:
                        type: string
                      location:
                        type: string
                      work_type:
                        type: string
                      average_rating:
                        type: number
                      review_count:
                        type: integer
                total:
                  type: integer
                page:
                  type: integer
                limit:
                  type: integer
                total_pages:
                  type: integer
      400:
        description: Bad request
    """
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        sort = request.args.get('sort', '')
        
        result = store.get_all_stores(page, limit, sort)
        return jsonify(result), 200
        
    except ValueError:
        raise ValidationError("Invalid pagination parameters")
    except Exception as e:
        raise ApiError(str(e))


@stores_bp.route('/<store_id>', methods=['GET'])
def get_store_by_id(store_id):
    """
    Get a single store by ID
    ---
    tags:
      - Stores
    parameters:
      - name: store_id
        in: path
        required: true
        schema:
          type: string
        description: The ID of the store
    responses:
      200:
        description: Store details
        content:
          application/json:
            schema:
              type: object
              properties:
                _id:
                  type: string
                company_name:
                  type: string
                title:
                  type: string
                description:
                  type: string
                location:
                  type: string
                work_type:
                  type: string
                average_rating:
                  type: number
                review_count:
                  type: integer
      400:
        description: Invalid ID format
      401:
        description: Unauthorized
      404:
        description: Store not found
    """
    try:
        if not is_valid_object_id(store_id):
            raise ValidationError("Invalid store ID format")
        
        # Get user identity and role if authenticated
        user_id, role = get_user_details()
        
        # Get store with role-based filtering
        result = store.get_store_by_id(store_id, user_id, role)
        
        if not result:
            raise ResourceNotFoundError("Store not found")
            
        return jsonify(result), 200
        
    except (ValidationError, ResourceNotFoundError) as e:
        raise e
    except Exception as e:
        raise ApiError(str(e))


@stores_bp.route('/<store_id>', methods=['PUT'])
@jwt_required()
def update_store_by_id(store_id):
    """
    Update store by ID
    ---
    tags:
      - Stores
    security:
      - bearerAuth: []
    parameters:
      - name: store_id
        in: path
        required: true
        schema:
          type: string
        description: The ID of the store
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              company_name:
                type: string
              title:
                type: string
              description:
                type: string
              location:
                type: string
              work_type:
                type: string
    responses:
      200:
        description: Store updated successfully
      400:
        description: Invalid request
      401:
        description: Unauthorized
      403:
        description: Forbidden
      404:
        description: Store not found
    """
    try:
        if not is_valid_object_id(store_id):
            raise ValidationError("Invalid store ID format")
            
        user_id = get_jwt_identity()
        claims = get_jwt()
        role = claims.get("role")
        
        # Verify ownership or admin status
        if not verify_store_ownership(store_id, user_id, role):
            raise ForbiddenError("You don't have permission to update this store")
            
        data = request.get_json()
        if not data:
            raise ValidationError("No data provided for update")
            
        # Prevent updating certain fields based on role
        if role != "admin":
            # Store owners can't update certain admin-only fields
            restricted_fields = ["average_rating", "review_count", "admin_notes"]
            for field in restricted_fields:
                if field in data:
                    del data[field]
                    
        result = store.update_store_by_id(store_id, data)
        
        if result["success"]:
            return jsonify({
                "message": "Store updated successfully",
                "store_id": store_id
            }), 200
        else:
            raise ResourceNotFoundError("Store not found or could not be updated")
            
    except (ValidationError, ResourceNotFoundError, ForbiddenError) as e:
        raise e
    except Exception as e:
        raise ApiError(f"An error occurred: {str(e)}", 500)


@stores_bp.route('/<store_id>', methods=['DELETE'])
@jwt_required()
def delete_store_by_id(store_id):
    """
    Delete store by ID
    ---
    tags:
      - Stores
    security:
      - bearerAuth: []
    parameters:
      - name: store_id
        in: path
        required: true
        schema:
          type: string
        description: The ID of the store
    responses:
      200:
        description: Store deleted successfully
      400:
        description: Invalid ID format
      401:
        description: Unauthorized
      403:
        description: Forbidden
      404:
        description: Store not found
    """
    try:
        if not is_valid_object_id(store_id):
            raise ValidationError("Invalid store ID format")
            
        user_id = get_jwt_identity()
        claims = get_jwt()
        role = claims.get("role")
        
        # Only admin can delete a store entirely, owners can only remove their branches
        if role != "admin":
            raise ForbiddenError("Only administrators can delete an entire store")
            
        result = store.delete_store_by_id(store_id)
        
        if result["success"]:
            return jsonify({
                "message": "Store deleted successfully",
                "store_id": store_id,
                "deleted_branches": result.get("deleted_branches", 0)
            }), 200
        else:
            raise ResourceNotFoundError("Store not found or could not be deleted")
            
    except (ValidationError, ResourceNotFoundError, ForbiddenError) as e:
        raise e
    except Exception as e:
        raise ApiError(f"An error occurred: {str(e)}", 500)


@stores_bp.route('/<store_id>/branches/<branch_id>', methods=['DELETE'])
@jwt_required()
def delete_branch_from_store(store_id, branch_id):
    """
    Delete a branch from a store
    ---
    tags:
      - Stores
    security:
      - bearerAuth: []
    parameters:
      - name: store_id
        in: path
        required: true
        schema:
          type: string
        description: The ID of the store
      - name: branch_id
        in: path
        required: true
        schema:
          type: string
        description: The ID of the branch
    responses:
      200:
        description: Branch deleted successfully
      400:
        description: Invalid ID format
      401:
        description: Unauthorized
      403:
        description: Forbidden
      404:
        description: Store or branch not found
    """
    try:
        if not is_valid_object_id(store_id) or not is_valid_object_id(branch_id):
            raise ValidationError("Invalid ID format")
            
        user_id = get_jwt_identity()
        claims = get_jwt()
        role = claims.get("role")
        
        # Verify ownership or admin status
        if not verify_store_ownership(store_id, user_id, role):
            raise ForbiddenError("You don't have permission to delete branches from this store")
            
        result = store.delete_branch_from_store(store_id, branch_id)
        
        if result["success"]:
            return jsonify({
                "message": "Branch deleted successfully",
                "store_id": store_id,
                "branch_id": branch_id
            }), 200
        else:
            raise ResourceNotFoundError("Store or branch not found, or could not be deleted")
            
    except (ValidationError, ResourceNotFoundError, ForbiddenError) as e:
        raise e
    except Exception as e:
        raise ApiError(f"An error occurred: {str(e)}", 500)