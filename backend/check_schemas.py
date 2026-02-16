import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv(override=True)
url = os.getenv("DATABASE_URL")
engine = create_engine(url)

try:
    with engine.connect() as conn:
        print("DEBUG: Checking Schemas...")
        result = conn.execute(text("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'user_%'"))
        schemas = [row[0] for row in result.fetchall()]
        print(f"DEBUG: Found User Schemas: {schemas}")
except Exception as e:
    print(f"ERROR: {e}")
