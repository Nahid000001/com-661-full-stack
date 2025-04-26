import requests
import json

def test_login():
    """
    Test the login endpoint directly
    """
    base_url = "http://localhost:5000"
    login_url = f"{base_url}/login"
    
    print("Testing login endpoint with different field combinations...\n")
    
    # Test combinations
    test_cases = [
        {
            "name": "emailOrUsername and password",
            "payload": {
                "emailOrUsername": "admin",
                "password": "admin123"
            }
        },
        {
            "name": "username and password",
            "payload": {
                "username": "admin",
                "password": "admin123"
            }
        },
        {
            "name": "email and password",
            "payload": {
                "email": "admin@example.com",
                "password": "admin123"
            }
        },
        {
            "name": "user and password",
            "payload": {
                "user": "admin",
                "password": "admin123"
            }
        }
    ]
    
    for test in test_cases:
        print(f"Testing with {test['name']}: {json.dumps(test['payload'])}")
        try:
            response = requests.post(login_url, json=test['payload'])
            print(f"Status Code: {response.status_code}")
            if response.status_code == 200:
                print(f"SUCCESS! Login worked with fields: {test['name']}")
            print(f"Response: {json.dumps(response.json(), indent=2) if response.ok else response.text}")
        except Exception as e:
            print(f"Error: {str(e)}")
        
        print("\n" + "-"*50 + "\n")
        
if __name__ == "__main__":
    test_login() 