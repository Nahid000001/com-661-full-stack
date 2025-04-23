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
    from clothing_store_backend.app import create_app
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)

if __name__ == "__main__":
    # Run the Flask backend
    run_backend() 