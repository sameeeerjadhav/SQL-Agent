import os
from dotenv import load_dotenv
import google.generativeai as genai
from fastapi import FastAPI # Assuming you are using FastAPI

# 1. Load the environment variables from .env
load_dotenv()

# 2. Retrieve the key
api_key = os.getenv("GOOGLE_API_KEY")

# 3. Configure Gemini
if not api_key:
    raise ValueError("GOOGLE_API_KEY not found in environment")

genai.configure(api_key=api_key)

app = FastAPI()
# ... rest of your /ask route logic