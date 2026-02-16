import uvicorn
import os
import hashlib
import uuid
import time
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import create_engine, text, inspect
from dotenv import load_dotenv

# Load env vars
load_dotenv()

try:
    from .agent import run_sql_agent
except ImportError:
    from agent import run_sql_agent

# 1. Initialize the FastAPI app
app = FastAPI(title="AI SQL Workbench API")

# 2. Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Database Setup (Supabase / Postgres)
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("WARNING: DATABASE_URL not found in .env. Falling back to in-memory SQLite (Data will be lost).")
    DATABASE_URL = "sqlite:///:memory:"

# Create main engine for User Management
engine = create_engine(DATABASE_URL)

def get_user_db_path(user_email: str = None) -> str:
    """
    Returns the Supabase Connection URI with a search_path set to the user's schema.
    This effectively isolates their "Sandbox" to their own schema.
    """
    if not user_email:
        # Default/Public schema for guests? Or restrict? 
        # For now, let's just use public or a temp setup.
        return DATABASE_URL
    
    # Create a safe schema name from the email
    safe_email = "".join([c for c in user_email if c.isalnum()])
    schema_name = f"user_{safe_email}"
    
    # Append options to set search_path
    if "postgresql" in DATABASE_URL:
        # SQLAlchemy supports query params for connection args
        # But specifically for psycopg2, we can pass options via the URI or connect_args.
        # simpler way for the Agent (which uses SQLDatabase.from_uri) is to put it in the URI?
        # Actually, SQLDatabase might not parse complex options easily.
        # BETTER APPROACH: The Agent manually sets the schema on connect?
        # OR: We just pass the schema name to the agent and let it handle "SET search_path".
        # BUT: To keep `agent.py` generic, let's try to encode it in URI if possible.
        # Postgres URI format: postgresql://user:pass@host/db?options=-csearch_path%3Dschema
        
        separator = "&" if "?" in DATABASE_URL else "?"
        return f"{DATABASE_URL}{separator}options=-csearch_path%3D{schema_name}"
        
    return DATABASE_URL

def init_users_db():
    """
    Initialize the 'users' table in the 'public' schema.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS public.users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE,
                    password_hash TEXT,
                    name TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.commit()
            print("INFO: 'users' table initialized in public schema.")
    except Exception as e:
        print(f"ERROR: Failed to init users db: {e}")

# Initialize on startup
init_users_db()

# 4. Data Models (Unchanged)
class QueryRequest(BaseModel):
    prompt: str
    history: list[dict] = []
    safe_mode: bool = False
    user_email: Optional[str] = None
    connection_uri: Optional[str] = None

class ExecuteRequest(BaseModel):
    sql: str
    user_email: Optional[str] = None
    connection_uri: Optional[str] = None

class SchemaRequest(BaseModel):
    user_email: Optional[str] = None
    connection_uri: Optional[str] = None
    table_name: Optional[str] = None

class UserRegister(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

# 5. Auth Routes
@app.post("/auth/register")
def register_user(user: UserRegister):
    # Hash password
    pwd_hash = hashlib.sha256(user.password.encode()).hexdigest()
    user_id = str(uuid.uuid4())
    
    try:
        with engine.connect() as conn:
            # 1. Check existing
            result = conn.execute(text("SELECT email FROM public.users WHERE email = :email"), {"email": user.email})
            if result.fetchone():
                raise HTTPException(status_code=400, detail="Email already registered")
            
            # 2. Create User
            conn.execute(
                text("INSERT INTO public.users (id, email, password_hash, name) VALUES (:id, :email, :pwd, :name)"),
                {"id": user_id, "email": user.email, "pwd": pwd_hash, "name": user.name}
            )
            
            # 3. Create User Sandbox SCHEMA
            safe_email = "".join([c for c in user.email if c.isalnum()])
            schema_name = f"user_{safe_email}"
            conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"'))
            
            conn.commit()
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    return {"status": "success", "message": "User registered successfully"}

@app.post("/auth/login")
def login_user(user: UserLogin):
    pwd_hash = hashlib.sha256(user.password.encode()).hexdigest()
    
    try:
        with engine.connect() as conn:
            result = conn.execute(
                text("SELECT id, name, email FROM public.users WHERE email = :email AND password_hash = :pwd"),
                {"email": user.email, "pwd": pwd_hash}
            )
            row = result.fetchone()
            
            if not row:
                raise HTTPException(status_code=401, detail="Invalid credentials")
            
            return {
                "status": "success",
                "token": str(uuid.uuid4()), # Mock token
                "user": {
                    "id": row[0],
                    "name": row[1],
                    "email": row[2]
                }
            }
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

# 6. API Routes
@app.get("/health")
def health_check(user_email: Optional[str] = None, connection_uri: Optional[str] = None):
    # Determine DB Source
    db_target = get_user_db_path(user_email)
    
    if connection_uri:
        db_target = connection_uri

    # Check Connectivity
    try:
        temp_engine = create_engine(db_target)
        inspector = inspect(temp_engine)
        table_names = inspector.get_table_names() # This respects search_path for Postgres!
        table_count = len(table_names)
        status_msg = "Datalk Backend & Database Ready"
    except Exception as e:
        print(f"Health Check Error: {e}")
        return {
            "status": "error",
            "message": str(e),
            "timestamp": time.time()
        }

    return {
        "status": "online",
        "message": status_msg,
        "db_url_masked": db_target.split("@")[-1] if "@" in db_target else "sqlite",
        "table_count": table_count,
        "tables": table_names, # Connection test
        "timestamp": time.time()
    }

@app.post("/schema")
def get_schema(request: SchemaRequest):
    """
    Fetch tables for the specific user or external DB.
    """
    try:
        # Determine DB Source
        if request.connection_uri:
            db_target = request.connection_uri
        else:
            db_target = get_user_db_path(request.user_email)

        engine = create_engine(db_target)
        inspector = inspect(engine)
             
        if request.table_name:
            # Generic column fetch
            cols_info = inspector.get_columns(request.table_name)
            columns = []
            for col in cols_info:
                columns.append({
                    "name": col['name'],
                    "type": str(col['type']),
                    "pk": col.get('primary_key', False)
                })
            return {"columns": columns}
        else:
            tables = inspector.get_table_names()
            return {"tables": tables}

    except Exception as e:
        print(f"DEBUG: Schema fetch failed. Error: {str(e)}")
        return {"error": str(e)}

@app.post("/ask")
async def ask_ai(request: QueryRequest):
    print(f"DEBUG: main.py received /ask request. Query: {request.prompt}")
    
    # Determine DB Source
    if request.connection_uri:
        db_target = request.connection_uri
    else:
        db_target = get_user_db_path(request.user_email)
        
    return run_sql_agent(request.prompt, db_target, request.history, request.safe_mode)

@app.post("/execute")
async def execute_sql(request: ExecuteRequest):
    print(f"DEBUG: /execute called. URI present: {bool(request.connection_uri)}")
    try:
        from .agent import execute_sql_commands
    except ImportError:
        from agent import execute_sql_commands
        
    # Determine DB Source
    if request.connection_uri:
        db_target = request.connection_uri
    else:
        db_target = get_user_db_path(request.user_email)
    
    try:
        datasets = execute_sql_commands(request.sql, db_target)
        return {
            "status": "success",
            "datasets": datasets
        }
    except Exception as e:
         return {
            "status": "error",
            "error_message": str(e)
        }

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        "backend.main:app", 
        host="0.0.0.0", 
        port=port, 
        reload=True
    )