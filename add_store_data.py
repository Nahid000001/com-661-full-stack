from pymongo import MongoClient
import datetime
from werkzeug.security import generate_password_hash
from bson.objectid import ObjectId

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client.clothing_store

# Create sample user first (needed as store owner)
def create_user_if_not_exists():
    existing_user = db.users.find_one({"username": "storeowner"})
    if not existing_user:
        user = {
            "username": "storeowner",
            "email": "owner@example.com",
            "password": generate_password_hash("password123"),
            "first_name": "Store",
            "last_name": "Owner",
            "role": "store_owner",
            "created_at": datetime.datetime.utcnow(),
            "updated_at": datetime.datetime.utcnow()
        }
        db.users.insert_one(user)
        print("Created store owner user")
    return "storeowner"

# Sample store data
def add_sample_stores(owner):
    # First, clear existing stores collection
    db.stores.delete_many({})
    
    # Sample stores
    stores = [
        {
            "company_name": "Fashion Elite",
            "title": "Premium Fashion Outlet",
            "description": "Designer clothing and accessories for fashion enthusiasts. We offer the latest trends in high-end fashion.",
            "location": "New York",
            "work_type": "retail",
            "branches": ["NYC001"],
            "is_remote": False,
            "owner": owner,
            "views": 250,
            "average_rating": 4.7,
            "review_count": 42,
            "created_at": datetime.datetime.utcnow(),
            "updated_at": datetime.datetime.utcnow()
        },
        {
            "company_name": "Urban Threads",
            "title": "Contemporary Urban Wear",
            "description": "Streetwear and casual fashion for the modern lifestyle. Featuring urban designs and comfortable everyday wear.",
            "location": "Los Angeles",
            "work_type": "retail",
            "branches": ["LA002"],
            "is_remote": False,
            "owner": owner,
            "views": 185,
            "average_rating": 4.3,
            "review_count": 28,
            "created_at": datetime.datetime.utcnow(),
            "updated_at": datetime.datetime.utcnow()
        },
        {
            "company_name": "Eco Apparel",
            "title": "Sustainable Fashion",
            "description": "Eco-friendly clothing made from sustainable materials. Making a positive impact on the planet with ethical fashion.",
            "location": "Portland",
            "work_type": "manufacturing",
            "branches": ["POR003"],
            "is_remote": False,
            "owner": owner,
            "views": 120,
            "average_rating": 4.9,
            "review_count": 17,
            "created_at": datetime.datetime.utcnow(),
            "updated_at": datetime.datetime.utcnow()
        },
        {
            "company_name": "Vintage Revival",
            "title": "Classic Fashion Reimagined",
            "description": "Vintage-inspired clothing with a modern twist. Rediscover timeless fashion trends updated for today.",
            "location": "Chicago",
            "work_type": "retail",
            "branches": ["CHI004"],
            "is_remote": False,
            "owner": owner,
            "views": 210,
            "average_rating": 4.5,
            "review_count": 35,
            "created_at": datetime.datetime.utcnow(),
            "updated_at": datetime.datetime.utcnow()
        }
    ]
    
    result = db.stores.insert_many(stores)
    print(f"Inserted {len(result.inserted_ids)} sample stores")

if __name__ == "__main__":
    owner = create_user_if_not_exists()
    add_sample_stores(owner)
    print("Sample data added successfully") 