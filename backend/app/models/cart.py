from app import mongo
from bson.objectid import ObjectId
from datetime import datetime

class Cart:
    """Cart model for managing shopping cart items"""
    
    @staticmethod
    def add_item(user_id, product_id, quantity=1):
        """Add product to user's cart"""
        try:
            # Check if product exists
            product = mongo.db.products.find_one({"_id": ObjectId(product_id)})
            if not product:
                return None, "Product not found"
                
            # Check if the item is already in the cart
            existing_item = mongo.db.cart.find_one({
                "user_id": ObjectId(user_id),
                "product_id": ObjectId(product_id)
            })
            
            if existing_item:
                # Update quantity of existing item
                result = mongo.db.cart.update_one(
                    {"_id": existing_item["_id"]},
                    {"$inc": {"quantity": quantity}}
                )
                return str(existing_item["_id"]), "Item quantity updated"
            else:
                # Add new item to cart
                cart_item = {
                    "user_id": ObjectId(user_id),
                    "product_id": ObjectId(product_id),
                    "quantity": quantity,
                    "added_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                
                result = mongo.db.cart.insert_one(cart_item)
                return str(result.inserted_id), "Item added to cart"
                
        except Exception as e:
            print(f"Error adding item to cart: {e}")
            return None, str(e)
    
    @staticmethod
    def get_cart(user_id):
        """Get all items in user's cart with product details"""
        try:
            # Find all cart items for the user
            cart_items = list(mongo.db.cart.find({"user_id": ObjectId(user_id)}))
            
            # Get product details for each item
            cart_with_details = []
            for item in cart_items:
                product = mongo.db.products.find_one({"_id": item["product_id"]})
                if product:
                    # Convert ObjectIds to strings
                    item["_id"] = str(item["_id"])
                    item["user_id"] = str(item["user_id"])
                    item["product_id"] = str(item["product_id"])
                    
                    # Add product details
                    item["product"] = {
                        "_id": str(product["_id"]),
                        "name": product.get("name", ""),
                        "price": product.get("price", 0),
                        "image": product.get("image", ""),
                        "store_id": str(product.get("store_id", ""))
                    }
                    
                    cart_with_details.append(item)
            
            return cart_with_details
            
        except Exception as e:
            print(f"Error getting cart: {e}")
            return None
    
    @staticmethod
    def update_item(item_id, quantity):
        """Update quantity of an item in the cart"""
        try:
            if quantity <= 0:
                # Remove item if quantity is zero or negative
                result = mongo.db.cart.delete_one({"_id": ObjectId(item_id)})
                return result.deleted_count > 0, "Item removed from cart"
            else:
                # Update item quantity
                result = mongo.db.cart.update_one(
                    {"_id": ObjectId(item_id)},
                    {"$set": {
                        "quantity": quantity,
                        "updated_at": datetime.utcnow()
                    }}
                )
                return result.modified_count > 0, "Item quantity updated"
                
        except Exception as e:
            print(f"Error updating cart item: {e}")
            return False, str(e)
    
    @staticmethod
    def remove_item(item_id):
        """Remove an item from the cart"""
        try:
            result = mongo.db.cart.delete_one({"_id": ObjectId(item_id)})
            return result.deleted_count > 0, "Item removed from cart"
                
        except Exception as e:
            print(f"Error removing cart item: {e}")
            return False, str(e)
    
    @staticmethod
    def clear_cart(user_id):
        """Remove all items from user's cart"""
        try:
            result = mongo.db.cart.delete_many({"user_id": ObjectId(user_id)})
            return result.deleted_count, "Cart cleared"
                
        except Exception as e:
            print(f"Error clearing cart: {e}")
            return 0, str(e)
            
    @staticmethod
    def get_cart_total(user_id):
        """Calculate the total cost of all items in the cart"""
        try:
            cart_items = Cart.get_cart(user_id)
            
            total = 0
            for item in cart_items:
                total += item["product"]["price"] * item["quantity"]
                
            return total
                
        except Exception as e:
            print(f"Error calculating cart total: {e}")
            return 0 