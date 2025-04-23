import pymongo
import datetime
import random
import sys

def insert_sample_stores():
    try:
        # Connect to MongoDB
        client = pymongo.MongoClient("mongodb://localhost:27017/")
        db = client["clothing_store"]
        stores_collection = db["stores"]
        
        # Clear existing stores collection
        stores_collection.delete_many({})
        print("Cleared existing stores collection")
        
        # Sample store data
        stores = [
            {
                "company_name": "Fashion Elite",
                "title": "Premium Fashion Outlet",
                "description": "Designer clothing and accessories for fashion enthusiasts. We offer the latest trends in high-end fashion.",
                "location": "New York",
                "work_type": "retail",
                "branches": ["NYC001"],
                "is_remote": False,
                "owner": "admin",
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
                "owner": "admin",
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
                "owner": "admin",
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
                "owner": "admin",
                "views": 210,
                "average_rating": 4.5,
                "review_count": 35,
                "created_at": datetime.datetime.utcnow(),
                "updated_at": datetime.datetime.utcnow()
            }
        ]
        
        # Insert the stores
        result = stores_collection.insert_many(stores)
        
        print(f"Successfully added {len(result.inserted_ids)} stores to MongoDB")
        print("Store IDs:")
        for i, store_id in enumerate(result.inserted_ids):
            print(f"  {i+1}. {store_id}")
        
        # Verify the stores were added
        count = stores_collection.count_documents({})
        print(f"Total stores in database: {count}")
        
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    print("Inserting sample stores into MongoDB...")
    success = insert_sample_stores()
    
    if success:
        print("Store data successfully added to MongoDB!")
        sys.exit(0)
    else:
        print("Failed to add store data to MongoDB.")
        sys.exit(1) 