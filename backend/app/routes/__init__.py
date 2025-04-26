from app.routes.admin import admin_bp
from app.routes.auth import auth_bp
from app.routes.stores import stores_bp
from app.routes.reviews import reviews_bp
from app.routes.user import user_bp
from app.routes.cart import cart_bp
from app.routes.orders import orders_bp
from app.routes.upload import upload_bp
from app.routes.search import search_bp

def register_blueprints(app):
    """Registering all blueprints with the app."""
    
    app.register_blueprint(admin_bp, url_prefix='/', name='admin_blueprint')
    
    app.register_blueprint(auth_bp, url_prefix='/', name='auth_blueprint')

    app.register_blueprint(stores_bp, url_prefix='/stores', name='stores_blueprint')
    
    app.register_blueprint(reviews_bp, url_prefix='/', name='reviews_blueprint')
    
    app.register_blueprint(user_bp, url_prefix='/users', name='user_blueprint')
    
    # Register new blueprints
    app.register_blueprint(cart_bp, url_prefix='/cart', name='cart_blueprint')
    
    app.register_blueprint(orders_bp, url_prefix='/orders', name='orders_blueprint')
    
    app.register_blueprint(upload_bp, url_prefix='/upload', name='upload_blueprint')
    
    app.register_blueprint(search_bp, url_prefix='/search', name='search_blueprint')