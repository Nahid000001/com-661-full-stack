import unittest
import json
from bson import ObjectId
from app import create_app
from app import mongo
from flask_jwt_extended import create_access_token
from mongomock import MongoClient

class APITestCase(unittest.TestCase):
    """Test API endpoints for Clothing Store"""
    
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
        self.mock_db.stores.drop()
        self.mock_db.users.drop()
        self.mock_db.reviews.drop()
        
        self.mock_db.users.insert_one({
            "username": "existinguser",
            "password": "hashedpassword" 
        })
    
    def create_test_store(self):
        """Helper method to create a test store and return its ID"""
        store_data = {
            "company_name": "Test Store",
            "title": "Retail",
            "description": "Test Store Description",
            "location": "London",
            "work_type": "Online"
        }
        
        response = self.client.post('/stores', json=store_data, headers=self.admin_headers)
        return response.get_json().get("store_id")
    
    def test_user_registration(self):
        """Test user registration endpoint"""
        response = self.client.post('/register', json={
            "username": "testuser",
            "password": "testpassword"
        })
        self.assertEqual(response.status_code, 201)
        self.assertIn("User registered successfully", response.get_json()["message"])
        
        user = self.mock_db.users.find_one({"username": "testuser"})
        self.assertIsNotNone(user)
    
    def test_register_duplicate_user(self):
        """Test registration fails with duplicate username"""
        response = self.client.post('/register', json={
            "username": "existinguser",
            "password": "newpassword"
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn("Username already exists", response.get_json()["message"])
    
    def test_login_success(self):
        """Test successful login"""
        # Register a user first
        self.client.post('/register', json={
            "username": "loginuser",
            "password": "correctpassword"
        })
        
        # login
        response = self.client.post('/login', json={
            "username": "loginuser",
            "password": "correctpassword"
        })
        
        self.assertEqual(response.status_code, 200)
        json_data = response.get_json()
        self.assertIn("access_token", json_data)
    
    def test_login_with_wrong_credentials(self):
        """Test login failure with incorrect password"""
        self.client.post('/register', json={
            "username": "testuser",
            "password": "correctpassword"
        })
        
        response = self.client.post('/login', json={
            "username": "testuser",
            "password": "wrongpassword"
        })
        
        self.assertEqual(response.status_code, 401)
        self.assertIn("Invalid credentials", response.get_json()["message"])
    
    def test_login_nonexistent_user(self):
        """Test login with a username that doesn't exist"""
        response = self.client.post('/login', json={
            "username": "nonexistentuser",
            "password": "anypassword"
        })
        
        self.assertEqual(response.status_code, 401)
        self.assertIn("Invalid credentials", response.get_json()["message"])
    
    def test_store_creation_without_auth(self):
        """Test store creation without authentication"""
        response = self.client.post('/stores', json={
            "company_name": "Test Store",
            "title": "Retail",
            "description": "Test Store Description",
            "location": "London",
            "work_type": "Online"
        })
        
        self.assertEqual(response.status_code, 403)
        self.assertIn("Missing authorization", response.get_json()["message"])
    
    def test_store_creation_with_auth(self):
        """Test store creation with authentication"""
        response = self.client.post('/stores', json={
            "company_name": "Test Store",
            "title": "Retail",
            "description": "Test Store Description",
            "location": "London",
            "work_type": "Online"
        }, headers=self.admin_headers)
        
        self.assertEqual(response.status_code, 201)
        self.assertIn("Store added", response.get_json()["message"])

        store_id = response.get_json().get("store_id")
        store = self.mock_db.stores.find_one({"_id": ObjectId(store_id)})
        self.assertIsNotNone(store)
    
    def test_store_creation_with_regular_user(self):
        """Test store creation with non-admin user"""
        response = self.client.post('/stores', json={
            "company_name": "User Store",
            "title": "Retail",
            "description": "User Store Description",
            "location": "London",
            "work_type": "Online"
        }, headers=self.user_headers)
        
        self.assertEqual(response.status_code, 403)
        self.assertIn("Admin privileges required", response.get_json()["message"])
    
    def test_get_all_stores(self):
        """Test retrieving all stores"""
        self.create_test_store()
        self.create_test_store()
        
        response = self.client.get('/stores')
        
        self.assertEqual(response.status_code, 200)
        stores = response.get_json()["stores"]
        self.assertEqual(len(stores), 2)

        for store in stores:
            self.assertIn("company_name", store)
            self.assertIn("location", store)
            self.assertIn("work_type", store)
    
    def test_get_specific_store(self):
        """Test retrieving a specific store by ID"""
        # Create a test store
        store_id = self.create_test_store()
        
        # Get the specific store
        response = self.client.get(f'/stores/{store_id}')
        
        self.assertEqual(response.status_code, 200)
        store = response.get_json()["store"]
        self.assertEqual(store["company_name"], "Test Store")
        self.assertEqual(store["location"], "London")
    
    def test_get_nonexistent_store(self):
        """Test retrieving a store that doesn't exist"""
        fake_id = str(ObjectId())
        response = self.client.get(f'/stores/{fake_id}')
        
        self.assertEqual(response.status_code, 404)
        self.assertIn("Store not found", response.get_json()["message"])
    
    def test_update_store(self):
        """Test updating a store with admin authentication"""
        store_id = self.create_test_store()
        
        update_data = {
            "company_name": "Updated Store Name",
            "location": "New York"
        }
        
        response = self.client.put(
            f'/stores/{store_id}',
            json=update_data,
            headers=self.admin_headers
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertIn("Store updated", response.get_json()["message"])

        updated_store = self.mock_db.stores.find_one({"_id": ObjectId(store_id)})
        self.assertEqual(updated_store["company_name"], "Updated Store Name")
        self.assertEqual(updated_store["location"], "New York")
    
    def test_delete_store_without_auth(self):
        """Test deleting a store without authentication"""
        store_id = self.create_test_store()

        response = self.client.delete(f'/stores/{store_id}')
        
        self.assertEqual(response.status_code, 403)
        self.assertIn("Missing authorization", response.get_json()["message"])
    
    def test_delete_store_with_auth(self):
        """Test deleting a store with admin authentication"""
        # Create a store to delete
        store_id = self.create_test_store()
        
        # Delete with admin auth
        response = self.client.delete(
            f'/stores/{store_id}',
            headers=self.admin_headers
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertIn("Store deleted", response.get_json()["message"])

        store = self.mock_db.stores.find_one({"_id": ObjectId(store_id)})
        self.assertIsNone(store)
    
    def test_review_submission(self):
        """Test submitting a review with authentication"""
        # Create a store to review
        store_id = self.create_test_store()

        review_data = {
            "rating": 5,
            "comment": "Great store!"
        }
        
        response = self.client.post(
            f'/stores/{store_id}/reviews',
            json=review_data,
            headers=self.user_headers
        )
        
        self.assertEqual(response.status_code, 201)
        self.assertIn("Review submitted", response.get_json()["message"])

        review = self.mock_db.reviews.find_one({
            "store_id": ObjectId(store_id),
            "username": "testuser"
        })
        self.assertIsNotNone(review)
        self.assertEqual(review["rating"], 5)
    
    def test_get_store_reviews(self):
        """Test retrieving reviews for a specific store"""

        store_id = self.create_test_store()

        self.mock_db.reviews.insert_many([
            {
                "store_id": ObjectId(store_id),
                "username": "user1",
                "rating": 5,
                "comment": "Excellent!"
            },
            {
                "store_id": ObjectId(store_id),
                "username": "user2",
                "rating": 3,
                "comment": "Average"
            }
        ])
        
        # Get reviews for the store
        response = self.client.get(f'/stores/{store_id}/reviews')
        
        self.assertEqual(response.status_code, 200)
        reviews = response.get_json()["reviews"]
        self.assertEqual(len(reviews), 2)
    
    def test_token_expiration(self):
        """Test that expired tokens are rejected"""
        from datetime import timedelta
        import time

        short_token = create_access_token(
            identity="shortlived",
            expires_delta=timedelta(seconds=1)
        )
        short_headers = {"Authorization": f"Bearer {short_token}"}

        time.sleep(2)

        response = self.client.post('/stores', json={
            "company_name": "Test Store",
            "title": "Retail",
            "description": "Test Store Description",
            "location": "London",
            "work_type": "Online"
        }, headers=short_headers)
        
        self.assertEqual(response.status_code, 401)
        self.assertIn("Token has expired", response.get_json()["message"])
    
    @classmethod
    def tearDownClass(cls):
        """Clean up after all tests"""
        cls.mock_db.stores.drop()
        cls.mock_db.users.drop()
        cls.mock_db.reviews.drop()

if __name__ == "__main__":
    unittest.main()