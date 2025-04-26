from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from app import mongo
from bson.objectid import ObjectId
import os
import uuid

# Create blueprint
upload_bp = Blueprint('upload', __name__)

# Configure upload settings
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB limit

def allowed_file(filename):
    """Check if file has an allowed extension"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_file(file, subfolder='products'):
    """Save the file to disk and return the filename"""
    # Generate unique filename
    original_filename = secure_filename(file.filename)
    extension = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else ''
    filename = f"{uuid.uuid4().hex}.{extension}"
    
    # Create upload directory if it doesn't exist
    upload_dir = os.path.join(current_app.root_path, 'static', 'uploads', subfolder)
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save the file
    file_path = os.path.join(upload_dir, filename)
    file.save(file_path)
    
    # Return public URL
    return f"/static/uploads/{subfolder}/{filename}"

@upload_bp.route('/product-image', methods=['POST'])
@jwt_required()
def upload_product_image():
    """Upload a product image"""
    current_user_id = get_jwt_identity()
    
    # Check if user has permission (admin or store owner)
    user = mongo.db.users.find_one({"_id": ObjectId(current_user_id)})
    if not user or (user.get("role") != "admin" and user.get("role") != "store_owner"):
        return jsonify({"error": "Unauthorized. Admin or store owner access required"}), 403
    
    # Check if file is in request
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['file']
    
    # Check if file is empty
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    # Check if file type is allowed
    if not allowed_file(file.filename):
        return jsonify({"error": f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"}), 400
    
    # Check product_id if provided
    product_id = request.form.get('product_id')
    if product_id:
        # Verify product exists
        product = mongo.db.products.find_one({"_id": ObjectId(product_id)})
        if not product:
            return jsonify({"error": "Product not found"}), 404
    
    try:
        # Save file
        file_url = save_file(file, 'products')
        
        # Update product if product_id provided
        if product_id:
            # Update the product with the new image URL
            mongo.db.products.update_one(
                {"_id": ObjectId(product_id)},
                {"$set": {"image": file_url}}
            )
        
        return jsonify({
            "success": True,
            "message": "Image uploaded successfully",
            "file_url": file_url
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@upload_bp.route('/store-image', methods=['POST'])
@jwt_required()
def upload_store_image():
    """Upload a store image"""
    current_user_id = get_jwt_identity()
    
    # Check if user has permission (admin or store owner)
    user = mongo.db.users.find_one({"_id": ObjectId(current_user_id)})
    if not user or (user.get("role") != "admin" and user.get("role") != "store_owner"):
        return jsonify({"error": "Unauthorized. Admin or store owner access required"}), 403
    
    # Check if file is in request
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['file']
    
    # Check if file is empty
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    # Check if file type is allowed
    if not allowed_file(file.filename):
        return jsonify({"error": f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"}), 400
    
    # Check store_id if provided
    store_id = request.form.get('store_id')
    if store_id:
        # Verify store exists
        store = mongo.db.stores.find_one({"_id": ObjectId(store_id)})
        if not store:
            return jsonify({"error": "Store not found"}), 404
        
        # Verify user is admin or owner of this store
        if user.get("role") != "admin" and str(store.get("owner")) != current_user_id:
            return jsonify({"error": "You don't have permission to update this store"}), 403
    
    try:
        # Save file
        file_url = save_file(file, 'stores')
        
        # Update store if store_id provided
        if store_id:
            # Update the store with the new image URL
            mongo.db.stores.update_one(
                {"_id": ObjectId(store_id)},
                {"$set": {"image": file_url}}
            )
        
        return jsonify({
            "success": True,
            "message": "Image uploaded successfully",
            "file_url": file_url
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500 