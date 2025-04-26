from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.cart import Cart
from app import mongo
from bson.objectid import ObjectId

# Create blueprint
cart_bp = Blueprint('cart', __name__)

@cart_bp.route('/add', methods=['POST'])
@jwt_required()
def add_to_cart():
    """Add a product to the user's cart"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    # Validate input
    if not data or not data.get('product_id'):
        return jsonify({"error": "Product ID is required"}), 400
        
    product_id = data.get('product_id')
    quantity = int(data.get('quantity', 1))
    
    if quantity <= 0:
        return jsonify({"error": "Quantity must be greater than zero"}), 400
    
    # Add item to cart
    item_id, message = Cart.add_item(current_user_id, product_id, quantity)
    
    if not item_id:
        return jsonify({"error": message}), 400
        
    return jsonify({
        "success": True,
        "message": message,
        "item_id": item_id
    }), 201

@cart_bp.route('/view', methods=['GET'])
@jwt_required()
def view_cart():
    """View current user's cart items"""
    current_user_id = get_jwt_identity()
    
    # Get cart items with product details
    cart_items = Cart.get_cart(current_user_id)
    
    if cart_items is None:
        return jsonify({"error": "Error retrieving cart"}), 500
        
    # Get cart total
    cart_total = Cart.get_cart_total(current_user_id)
    
    return jsonify({
        "items": cart_items,
        "total": cart_total,
        "item_count": len(cart_items)
    }), 200

@cart_bp.route('/update/<item_id>', methods=['PUT'])
@jwt_required()
def update_cart_item(item_id):
    """Update quantity of an item in the cart"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    # Validate input
    if not data or 'quantity' not in data:
        return jsonify({"error": "Quantity is required"}), 400
        
    quantity = int(data.get('quantity'))
    
    # Verify the item belongs to the current user
    cart_item = mongo.db.cart.find_one({
        "_id": ObjectId(item_id),
        "user_id": ObjectId(current_user_id)
    })
    
    if not cart_item:
        return jsonify({"error": "Item not found in your cart"}), 404
    
    # Update item quantity
    success, message = Cart.update_item(item_id, quantity)
    
    if not success:
        return jsonify({"error": message}), 400
        
    return jsonify({
        "success": True,
        "message": message
    }), 200

@cart_bp.route('/remove/<item_id>', methods=['DELETE'])
@jwt_required()
def remove_from_cart(item_id):
    """Remove an item from the cart"""
    current_user_id = get_jwt_identity()
    
    # Verify the item belongs to the current user
    cart_item = mongo.db.cart.find_one({
        "_id": ObjectId(item_id),
        "user_id": ObjectId(current_user_id)
    })
    
    if not cart_item:
        return jsonify({"error": "Item not found in your cart"}), 404
    
    # Remove item from cart
    success, message = Cart.remove_item(item_id)
    
    if not success:
        return jsonify({"error": message}), 400
        
    return jsonify({
        "success": True,
        "message": message
    }), 200

@cart_bp.route('/checkout', methods=['POST'])
@jwt_required()
def checkout():
    """Convert cart to an order"""
    from app.models.order import Order
    
    current_user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    # Get shipping address and payment method from request if provided
    shipping_address = data.get('shipping_address')
    payment_method = data.get('payment_method', 'credit_card')
    
    # Create order from cart
    order_id, message = Order.create_order_from_cart(
        current_user_id,
        shipping_address,
        payment_method
    )
    
    if not order_id:
        return jsonify({"error": message}), 400
        
    return jsonify({
        "success": True,
        "message": message,
        "order_id": order_id
    }), 201 