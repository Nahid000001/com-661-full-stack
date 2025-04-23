import pymongo
import datetime

# Connect to MongoDB (adjust the connection string if needed)
client = pymongo.MongoClient("mongodb://localhost:27017/")
db = client["clothing_store"]
collection = db["stores"]

# Clear existing data
collection.delete_many({})
print("Cleared existing store data")

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
result = collection.insert_many(stores)
print(f"Added {len(result.inserted_ids)} sample stores to the database")
for i, store_id in enumerate(result.inserted_ids):
    print(f"Store {i+1}: {store_id}")

print("Store data successfully added to the clothing_store database!") 