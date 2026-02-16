import requests
import uuid

url = "http://localhost:8000/auth/register"
data = {
    "name": "Test User",
    "email": f"test_{uuid.uuid4()}@example.com",
    "password": "password123"
}

try:
    print(f"DEBUG: Sending POST to {url} with {data}")
    response = requests.post(url, json=data)
    print(f"DEBUG: Status Code: {response.status_code}")
    print(f"DEBUG: Response text: {response.text}")
except Exception as e:
    print(f"DEBUG: Request failed: {e}")
