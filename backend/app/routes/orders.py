from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.order import Order
from app import mongo
from bson.objectid import ObjectId

# Create blueprint
orders_bp = Blueprint('orders', __name__)

@orders_bp.route('', methods=['GET'])
@jwt_required()
def get_all_orders():
    """Admin: Get all orders"""
    current_user_id = get_jwt_identity()
    
    # Check if user is admin
    user = mongo.db.users.find_one({"_id": ObjectId(current_user_id)})
    if not user or user.get("role") != "admin":
        return jsonify({"error": "Unauthorized. Admin access required"}), 403
    
    # Get all orders
    orders = Order.get_all_orders()
    
    if orders is None:
        return jsonify({"error": "Error retrieving orders"}), 500
        
    return jsonify({"orders": orders}), 200

@orders_bp.route('/my', methods=['GET'])
@jwt_required()
def get_my_orders():
    """Get current user's orders"""
    current_user_id = get_jwt_identity()
    
    # Get user's orders
    orders = Order.get_orders_by_user(current_user_id)
    
    if orders is None:
        return jsonify({"error": "Error retrieving orders"}), 500
        
    return jsonify({"orders": orders}), 200

@orders_bp.route('', methods=['POST'])
@jwt_required()
def create_order():
    """Create a new order directly (not from cart)"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    # Validation would be needed here for direct order creation
    # For now, redirect to cart checkout which is the preferred way
    return jsonify({
        "message": "Please use /cart/checkout to create an order from your cart"
    }), 303

@orders_bp.route('/<order_id>', methods=['GET'])
@jwt_required()
def get_order(order_id):
    """Get a specific order"""
    current_user_id = get_jwt_identity()
    
    # Get the order
    order = Order.get_order_by_id(order_id)
    
    if not order:
        return jsonify({"error": "Order not found"}), 404
        
    # Check if user is admin or the order belongs to the current user
    user = mongo.db.users.find_one({"_id": ObjectId(current_user_id)})
    is_admin = user and user.get("role") == "admin"
    is_owner = str(order.get("user_id")) == current_user_id
    
    if not (is_admin or is_owner):
        return jsonify({"error": "Unauthorized"}), 403
        
    return jsonify({"order": order}), 200

@orders_bp.route('/<order_id>', methods=['PUT'])
@jwt_required()
def update_order(order_id):
    """Admin: Update order status"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    # Check if user is admin
    user = mongo.db.users.find_one({"_id": ObjectId(current_user_id)})
    if not user or user.get("role") != "admin":
        return jsonify({"error": "Unauthorized. Admin access required"}), 403
    
    # Validate input
    if not data or 'status' not in data:
        return jsonify({"error": "Status is required"}), 400
    
    # Update order status
    success, message = Order.update_order_status(order_id, data.get('status'))
    
    if not success:
        return jsonify({"error": message}), 400
        
    return jsonify({
        "success": True,
        "message": message
    }), 200

@orders_bp.route('/<order_id>', methods=['DELETE'])
@jwt_required()
def cancel_order(order_id):
    """Cancel an order"""
    current_user_id = get_jwt_identity()
    
    # Get the order
    order = Order.get_order_by_id(order_id)
    
    if not order:
        return jsonify({"error": "Order not found"}), 404
    
    # Check if user is admin
    user = mongo.db.users.find_one({"_id": ObjectId(current_user_id)})
    is_admin = user and user.get("role") == "admin"
    
    if is_admin:
        # Admin can cancel any order
        success, message = Order.cancel_order(order_id)
    else:
        # User can only cancel their own orders
        success, message = Order.cancel_order(order_id, current_user_id)
    
    if not success:
        return jsonify({"error": message}), 400
        
    return jsonify({
        "success": True,
        "message": message
    }), 200 