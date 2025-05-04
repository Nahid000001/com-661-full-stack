from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.models import store
from app.utils import is_valid_object_id
from app.middlewares.auth import get_user_details, owner_or_admin_required, verify_store_ownership
from app.utils.error_handler import (
    ApiError, 
    ResourceNotFoundError, 
    UnauthorizedError, 
    ForbiddenError, 
    ValidationError
)

stores_bp = Blueprint('stores', __name__)

@stores_bp.route('/', methods=['POST'])
@jwt_required()
@owner_or_admin_required
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
        data = request.get_json()

        required_fields = ["company_name", "title", "description", "location", "work_type"]
        if not all(field in data and data[field].strip() for field in required_fields):
            raise ValidationError("Missing required fields")

        result = store.create_store(data, user)
        
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
        raise e
    except Exception as e:
        raise ApiError(f"An error occurred: {str(e)}", 500)


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