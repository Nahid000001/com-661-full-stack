from flask import Flask
from app import create_app, mongo
import random
from datetime import datetime, timedelta

# Create the Flask app
app = create_app()

# Sample store data
sample_stores = [
    {
        "company_name": "Fashion Forward",
        "title": "Premium Clothing Store",
        "description": "High-quality designer clothes for all occasions.",
        "location": "New York",
        "work_type": "Retail",
        "owner": "admin",
        "branches": ["branch1", "branch2"],
        "views": random.randint(50, 500),
        "average_rating": round(random.uniform(3.5, 5.0), 1),
    },
    {
        "company_name": "Urban Threads",
        "title": "Streetwear Specialists",
        "description": "The latest in urban fashion and streetwear.",
        "location": "Los Angeles",
        "work_type": "Retail",
        "owner": "admin",
        "branches": ["branch3"],
        "views": random.randint(50, 500),
        "average_rating": round(random.uniform(3.5, 5.0), 1),
    },
    {
        "company_name": "Classic Elegance",
        "title": "Timeless Fashion",
        "description": "Elegant clothing for the sophisticated shopper.",
        "location": "Chicago",
        "work_type": "Retail",
        "owner": "admin",
        "branches": ["branch4", "branch5"],
        "views": random.randint(50, 500),
        "average_rating": round(random.uniform(3.5, 5.0), 1),
    },
    {
        "company_name": "Sporty Styles",
        "title": "Athletic Apparel",
        "description": "Performance clothing for athletes and fitness enthusiasts.",
        "location": "Miami",
        "work_type": "Retail",
        "owner": "admin",
        "branches": ["branch6"],
        "views": random.randint(50, 500),
        "average_rating": round(random.uniform(3.5, 5.0), 1),
    },
    {
        "company_name": "Eco Wardrobe",
        "title": "Sustainable Fashion",
        "description": "Environmentally friendly clothing made from sustainable materials.",
        "location": "Portland",
        "work_type": "Retail",
        "owner": "admin",
        "branches": ["branch7", "branch8"],
        "views": random.randint(50, 500),
        "average_rating": round(random.uniform(3.5, 5.0), 1),
    },
    {
        "company_name": "Kids Corner",
        "title": "Children's Clothing",
        "description": "Fun and durable clothing for kids of all ages.",
        "location": "Boston",
        "work_type": "Retail",
        "owner": "admin",
        "branches": ["branch9"],
        "views": random.randint(50, 500),
        "average_rating": round(random.uniform(3.5, 5.0), 1),
    },
    {
        "company_name": "Formal Attire",
        "title": "Business & Formal Wear",
        "description": "Professional attire for business and formal occasions.",
        "location": "Washington DC",
        "work_type": "Retail",
        "owner": "admin",
        "branches": ["branch10", "branch11"],
        "views": random.randint(50, 500),
        "average_rating": round(random.uniform(3.5, 5.0), 1),
    },
    {
        "company_name": "Vintage Vibes",
        "title": "Retro Fashion",
        "description": "Vintage and retro-inspired clothing from different eras.",
        "location": "Seattle",
        "work_type": "Retail",
        "owner": "admin",
        "branches": ["branch12"],
        "views": random.randint(50, 500),
        "average_rating": round(random.uniform(3.5, 5.0), 1),
    },
    {
        "company_name": "Winter Wonders",
        "title": "Cold Weather Clothing",
        "description": "Stay warm and stylish with our cold weather collection.",
        "location": "Denver",
        "work_type": "Retail",
        "owner": "admin",
        "branches": ["branch13", "branch14"],
        "views": random.randint(50, 500),
        "average_rating": round(random.uniform(3.5, 5.0), 1),
    },
    {
        "company_name": "Beach Boutique",
        "title": "Summer & Beachwear",
        "description": "Everything you need for the beach and summer activities.",
        "location": "San Diego",
        "work_type": "Retail",
        "owner": "admin",
        "branches": ["branch15"],
        "views": random.randint(50, 500),
        "average_rating": round(random.uniform(3.5, 5.0), 1),
    }
]

def add_sample_stores():
    with app.app_context():
        # Clear existing stores
        mongo.db.stores.delete_many({})
        
        # Add the current time to each store
        current_time = datetime.now()
        
        for i, store_data in enumerate(sample_stores):
            # Add some variation to created_at times
            store_data["created_at"] = (current_time - timedelta(days=i)).isoformat()
            
            # Add an empty reviews array
            store_data["reviews"] = []
            
            # Insert store
            mongo.db.stores.insert_one(store_data)
        
        # Count the number of stores added
        count = mongo.db.stores.count_documents({})
        print(f"Added {count} sample stores to the database")

if __name__ == "__main__":
    add_sample_stores() 