import os
import requests
from dotenv import load_dotenv

print("🚀 Script Started")

# Load environment variables
load_dotenv(".env", override=True)

# Get API Key
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("❌ No API Key found in .env (Looking for GOOGLE_API_KEY)")
    exit(1)

print(f"🔑 Key loaded: {api_key[:5]}...{api_key[-5:]}")
print("📡 Preparing to connect...\n")


def test_key():
    print("📡 Inside test_key()")

    # ✅ Use v1 (NOT v1beta)
    url = f"https://generativelanguage.googleapis.com/v1/models?key={api_key}"

    try:
        print("🌐 Sending request...")
        response = requests.get(url)

        print("📊 Status Code:", response.status_code)

        data = response.json()

        # If API returns error
        if "error" in data:
            print("\n❌ API Error:", data["error"]["message"])
            print("Full Response:", data)
            return

        print("\n✅ SUCCESS! Your API Key is working.")
        print("---------------------------------")
        print("Available Gemini Models:\n")

        models = data.get("models", [])
        found = False

        for model in models:
            name = model.get("name", "").replace("models/", "")
            if "gemini" in name.lower():
                print(" -", name)
                found = True

        if not found:
            print("⚠️ No Gemini models found in response.")

        print("\n---------------------------------")

    except Exception as e:
        print("\n❌ Network Error:", str(e))


# ✅ IMPORTANT — this must exist
if __name__ == "__main__":
    print("▶ Running main block\n")
    test_key()