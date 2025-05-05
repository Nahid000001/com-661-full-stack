"""
Run script for Clothing Store Application

To run the backend:
    python run.py

To run the frontend:
    cd clothing-store-frontend
    npm start

For production build:
    cd clothing-store-frontend
    npm run build
"""

import os
import sys
from subprocess import Popen

def run_backend():
    try:
        from backend.app import create_app
        app = create_app()
        app.run(debug=True, host='0.0.0.0', port=5000)
    except ImportError:
        # If import fails, try adding the current directory to sys.path
        current_dir = os.path.dirname(os.path.abspath(__file__))
        sys.path.insert(0, current_dir)
        from backend.app import create_app
        app = create_app()
        app.run(debug=True, host='0.0.0.0', port=5000)

if __name__ == "__main__":
    # Run the Flask backend
    run_backend() 