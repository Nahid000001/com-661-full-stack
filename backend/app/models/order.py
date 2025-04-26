from app import mongo
from bson.objectid import ObjectId
from datetime import datetime
from app.models.cart import Cart

class Order:
    """Order model for managing user orders"""
    
    @staticmethod
    def create_order_from_cart(user_id, shipping_address=None, payment_method="credit_card"):
        """Create a new order from the user's cart items"""
        try:
            # Get cart items with product details
            cart_items = Cart.get_cart(user_id)
            
            if not cart_items:
                return None, "Cart is empty"
                
            # Calculate order total
            cart_total = Cart.get_cart_total(user_id)
            
            # Get user details
            user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                return None, "User not found"
                
            # Create order items list
            order_items = []
            for item in cart_items:
                order_item = {
                    "product_id": ObjectId(item["product_id"]),
                    "product_name": item["product"].get("name", ""),
                    "price": item["product"].get("price", 0),
                    "quantity": item["quantity"],
                    "subtotal": item["product"].get("price", 0) * item["quantity"]
                }
                order_items.append(order_item)
                
            # Create order document
            order = {
                "user_id": ObjectId(user_id),
                "user_email": user.get("email", ""),
                "user_name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
                "items": order_items,
                "total_amount": cart_total,
                "shipping_address": shipping_address,
                "payment_method": payment_method,
                "status": "pending",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            # Insert order into database
            result = mongo.db.orders.insert_one(order)
            
            if result.inserted_id:
                # Clear the cart after successful order creation
                Cart.clear_cart(user_id)
                return str(result.inserted_id), "Order created successfully"
            else:
                return None, "Failed to create order"
                
        except Exception as e:
            print(f"Error creating order: {e}")
            return None, str(e)
    
    @staticmethod
    def get_orders_by_user(user_id):
        """Get all orders for a specific user"""
        try:
            # Find all orders for the user, sort by creation date
            orders = list(mongo.db.orders.find(
                {"user_id": ObjectId(user_id)}
            ).sort("created_at", -1))
            
            # Convert ObjectIds to strings for serialization
            for order in orders:
                order["_id"] = str(order["_id"])
                order["user_id"] = str(order["user_id"])
                for item in order["items"]:
                    if "product_id" in item:
                        item["product_id"] = str(item["product_id"])
            
            return orders
                
        except Exception as e:
            print(f"Error getting user orders: {e}")
            return None
    
    @staticmethod
    def get_all_orders():
        """Get all orders (admin function)"""
        try:
            # Find all orders, sort by creation date
            orders = list(mongo.db.orders.find().sort("created_at", -1))
            
            # Convert ObjectIds to strings for serialization
            for order in orders:
                order["_id"] = str(order["_id"])
                order["user_id"] = str(order["user_id"])
                for item in order["items"]:
                    if "product_id" in item:
                        item["product_id"] = str(item["product_id"])
            
            return orders
                
        except Exception as e:
            print(f"Error getting all orders: {e}")
            return None
    
    @staticmethod
    def get_order_by_id(order_id):
        """Get a specific order by ID"""
        try:
            order = mongo.db.orders.find_one({"_id": ObjectId(order_id)})
            
            if not order:
                return None
                
            # Convert ObjectIds to strings for serialization
            order["_id"] = str(order["_id"])
            order["user_id"] = str(order["user_id"])
            for item in order["items"]:
                if "product_id" in item:
                    item["product_id"] = str(item["product_id"])
            
            return order
                
        except Exception as e:
            print(f"Error getting order: {e}")
            return None
    
    @staticmethod
    def update_order_status(order_id, status):
        """Update the status of an order (admin function)"""
        try:
            valid_statuses = ["pending", "processing", "shipped", "delivered", "cancelled"]
            
            if status not in valid_statuses:
                return False, f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
                
            result = mongo.db.orders.update_one(
                {"_id": ObjectId(order_id)},
                {"$set": {
                    "status": status,
                    "updated_at": datetime.utcnow()
                }}
            )
            
            return result.modified_count > 0, f"Order status updated to {status}"
                
        except Exception as e:
            print(f"Error updating order status: {e}")
            return False, str(e)
    
    @staticmethod
    def cancel_order(order_id, user_id=None):
        """Cancel an order (user can cancel their own orders, admin can cancel any)"""
        try:
            # If user_id is provided, check if this is the user's order
            if user_id:
                order = mongo.db.orders.find_one({
                    "_id": ObjectId(order_id),
                    "user_id": ObjectId(user_id)
                })
                
                if not order:
                    return False, "Order not found or does not belong to user"
                    
                # Only allow cancellation of pending or processing orders
                if order["status"] not in ["pending", "processing"]:
                    return False, f"Cannot cancel order with status: {order['status']}"
            
            result = mongo.db.orders.update_one(
                {"_id": ObjectId(order_id)},
                {"$set": {
                    "status": "cancelled",
                    "updated_at": datetime.utcnow()
                }}
            )
            
            return result.modified_count > 0, "Order cancelled successfully"
                
        except Exception as e:
            print(f"Error cancelling order: {e}")
            return False, str(e) 