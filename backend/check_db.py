import os
import time
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Force reload of .env
load_dotenv(override=True)

url = os.getenv("DATABASE_URL")
print(f"DEBUG: Loaded URL: {url}")

if not url:
    print("ERROR: No DATABASE_URL found.")
    exit(1)

# Mask password for display
if "@" in url:
    prefix = url.split("@")[0]
    suffix = url.split("@")[1]
    # mask password
    parts = prefix.split(":")
    if len(parts) > 2:
        parts[-1] = "****"
    masked_prefix = ":".join(parts)
    print(f"DEBUG: Connection Target: {masked_prefix}@{suffix}")

try:
    print("DEBUG: Attempting create_engine...")
    engine = create_engine(url)
    
    print("DEBUG: Attempting connection...")
    with engine.connect() as conn:
        print("DEBUG: Connection successful!")
        
        print("DEBUG: Executing SELECT 1...")
        result = conn.execute(text("SELECT 1"))
        print(f"DEBUG: Result: {result.fetchone()}")
        
        print("DEBUG: Checking users table...")
        result = conn.execute(text("SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='users'"))
        exists = result.fetchone()[0]
        print(f"DEBUG: Users table exists? {exists}")
        
except Exception as e:
    print(f"CRITICAL ERROR: {e}")
