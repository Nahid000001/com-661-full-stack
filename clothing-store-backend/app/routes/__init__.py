from app.routes.admin import admin_bp
from app.routes.auth import auth_bp
from app.routes.stores import stores_bp
from app.routes.reviews import reviews_bp

def register_blueprints(app):
    """Registering all blueprints with the app."""
    
    app.register_blueprint(admin_bp, url_prefix='/')
    
    app.register_blueprint(auth_bp, url_prefix='/')

    app.register_blueprint(stores_bp, url_prefix='/stores')

    app.register_blueprint(reviews_bp, url_prefix='/')