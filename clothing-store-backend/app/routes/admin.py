from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from app.middlewares import role_required

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/', methods=['GET'])
def home():
    """Home route."""
    return jsonify({"message": "Welcome to the Clothing Store API"}), 200

@admin_bp.route('/admin/only', methods=['GET'])
@jwt_required()
@role_required("admin")
def admin_only():
    """Admin-only route."""
    return jsonify({"message": "Admin access granted"}), 200