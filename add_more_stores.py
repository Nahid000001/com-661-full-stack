import pymongo
import datetime
import sys

# MongoDB Atlas connection string
MONGO_URI = "mongodb+srv://mehedinahid2019:Learn9267@cluster0.fppgneo.mongodb.net/ClothingStore?retryWrites=true&w=majority"

# Connect to MongoDB Atlas
try:
    client = pymongo.MongoClient(MONGO_URI)
    db = client["ClothingStore"]
    stores_collection = db["stores"]
    
    # Test connection
    client.admin.command('ping')
    print("Connected successfully to MongoDB Atlas!")
    
    # Three new stores to add
    new_stores = [
        {
            "company_name": "Tech Apparel",
            "title": "Smart Clothing Solutions",
            "description": "Innovative clothing with integrated technology. Functional garments designed for the digital age.",
            "location": "San Francisco",
            "work_type": "technology",
            "branches": ["SF001"],
            "is_remote": False,
            "owner": "admin",
            "views": 320,
            "average_rating": 4.8,
            "review_count": 56,
            "created_at": datetime.datetime.now(datetime.UTC),
            "updated_at": datetime.datetime.now(datetime.UTC)
        },
        {
            "company_name": "Kids Fashion",
            "title": "Children's Clothing Boutique",
            "description": "Stylish and comfortable clothing for children of all ages. Quality materials that last.",
            "location": "Boston",
            "work_type": "retail",
            "branches": ["BOS001"],
            "is_remote": False,
            "owner": "admin",
            "views": 145,
            "average_rating": 4.6,
            "review_count": 38,
            "created_at": datetime.datetime.now(datetime.UTC),
            "updated_at": datetime.datetime.now(datetime.UTC)
        },
        {
            "company_name": "Sports Gear",
            "title": "Athletic Apparel and Equipment",
            "description": "Performance clothing and gear for athletes. Designed for comfort and maximum performance.",
            "location": "Denver",
            "work_type": "retail",
            "branches": ["DEN001"],
            "is_remote": False,
            "owner": "admin",
            "views": 280,
            "average_rating": 4.7,
            "review_count": 62,
            "created_at": datetime.datetime.now(datetime.UTC),
            "updated_at": datetime.datetime.now(datetime.UTC)
        }
    ]
    
    # Insert the new stores
    result = stores_collection.insert_many(new_stores)
    
    print(f"Successfully added {len(result.inserted_ids)} new stores to MongoDB Atlas")
    print("New Store IDs:")
    for i, store_id in enumerate(result.inserted_ids):
        print(f"  {i+1}. {store_id}")
    
    # Verify the total number of stores
    count = stores_collection.count_documents({})
    print(f"Total stores in database now: {count}")
    
    print("Additional store data successfully added to MongoDB Atlas!")
    sys.exit(0)
    
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1) 