import unittest
import json
from bson import ObjectId
from app import create_app
from app import mongo
from flask_jwt_extended import create_access_token
from mongomock import MongoClient

class AdminAPITestCase(unittest.TestCase):
    """Test Admin API endpoints for Clothing Store"""
    
    @classmethod
    def setUpClass(cls):
        cls.app = create_app("test_config") 
        cls.client = cls.app.test_client()
        cls.mock_db = MongoClient().db 
        mongo.db = cls.mock_db  
        
        # Admin token for authenticated routes
        cls.admin_token = create_access_token(identity="admin", additional_claims={"role": "admin"})
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}
        
        # Regular user token
        cls.user_token = create_access_token(identity="testuser")
        cls.user_headers = {"Authorization": f"Bearer {cls.user_token}"}
    
    def setUp(self):
        """Set up before each test"""
        self.mock_db.users.drop()
        
        # Create an admin user
        self.mock_db.users.insert_one({
            "username": "admin",
            "password": "hashedpassword",
            "role": "admin"
        })
        
        # Create a regular user
        self.mock_db.users.insert_one({
            "username": "testuser",
            "password": "hashedpassword"
        })
    
    def test_home_route(self):
        """Test the basic home route"""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertIn("Welcome to the Clothing Store API", response.get_json()["message"])
    
    def test_options_request(self):
        """Test the OPTIONS request handler"""
        response = self.client.options('/any/path')
        self.assertEqual(response.status_code, 200)
    
    def test_admin_only_route_with_admin(self):
        """Test admin-only route with admin credentials"""
        response = self.client.get('/admin/only', headers=self.admin_headers)
        self.assertEqual(response.status_code, 200)
        self.assertIn("Admin access granted", response.get_json()["message"])
    
    def test_admin_only_route_with_regular_user(self):
        """Test admin-only route with regular user credentials"""
        response = self.client.get('/admin/only', headers=self.user_headers)
        self.assertEqual(response.status_code, 403)
        self.assertIn("Admin privileges required", response.get_json()["message"])
    
    def test_admin_only_route_without_auth(self):
        """Test admin-only route without authentication"""
        response = self.client.get('/admin/only')
        self.assertEqual(response.status_code, 403)
        self.assertIn("Missing authorization", response.get_json()["message"])
    
    @classmethod
    def tearDownClass(cls):
        """Clean up after all tests"""
        cls.mock_db.users.drop()

if __name__ == "__main__":
    unittest.main() 