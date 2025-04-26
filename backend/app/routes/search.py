from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import mongo
from bson.objectid import ObjectId

# Create blueprint
search_bp = Blueprint('search', __name__)

@search_bp.route('/stores', methods=['GET'])
def search_stores():
    """Search stores by query string"""
    query = request.args.get('query', '')
    
    if not query:
        return jsonify({"error": "Query parameter is required"}), 400
    
    try:
        # Search stores by various fields
        stores = list(mongo.db.stores.find({
            "$or": [
                {"company_name": {"$regex": query, "$options": "i"}},
                {"description": {"$regex": query, "$options": "i"}},
                {"location": {"$regex": query, "$options": "i"}},
                {"tags": {"$regex": query, "$options": "i"}}
            ]
        }).limit(20))
        
        # Convert ObjectIds to strings
        for store in stores:
            store["_id"] = str(store["_id"])
            if "owner" in store:
                store["owner"] = str(store["owner"])
        
        return jsonify({"stores": stores, "count": len(stores)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@search_bp.route('/products', methods=['GET'])
def filter_products():
    """Filter products by various criteria"""
    # Get filter parameters
    category = request.args.get('category')
    min_price = request.args.get('price_gt')
    max_price = request.args.get('price_lt')
    store_id = request.args.get('store_id')
    query = request.args.get('query')
    sort_by = request.args.get('sort', 'price')  # default sort by price
    sort_order = 1 if request.args.get('order', 'asc') == 'asc' else -1  # 1 for ascending, -1 for descending
    
    # Build filter criteria
    filter_criteria = {}
    
    if category:
        filter_criteria["category"] = {"$regex": category, "$options": "i"}
    
    if min_price or max_price:
        price_filter = {}
        if min_price:
            price_filter["$gte"] = float(min_price)
        if max_price:
            price_filter["$lte"] = float(max_price)
        filter_criteria["price"] = price_filter
    
    if store_id:
        filter_criteria["store_id"] = ObjectId(store_id)
        
    if query:
        filter_criteria["$or"] = [
            {"name": {"$regex": query, "$options": "i"}},
            {"description": {"$regex": query, "$options": "i"}}
        ]
    
    # Set sort field
    sort_field = sort_by
    
    try:
        # Execute query
        products = list(mongo.db.products.find(filter_criteria).sort(sort_field, sort_order).limit(50))
        
        # Convert ObjectIds to strings
        for product in products:
            product["_id"] = str(product["_id"])
            if "store_id" in product:
                product["store_id"] = str(product["store_id"])
        
        return jsonify({
            "products": products,
            "count": len(products),
            "filters": {
                "category": category,
                "min_price": min_price,
                "max_price": max_price,
                "store_id": store_id,
                "query": query
            }
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500 