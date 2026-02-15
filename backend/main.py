import uvicorn
import os
import sqlite3
import hashlib
import uuid
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
try:
    from .agent import run_sql_agent
except ImportError:
    from agent import run_sql_agent

# 1. Initialize the FastAPI app
app = FastAPI(title="AI SQL Workbench API")

# 2. Configure CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for dev simplicity
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Database Setup
SYSTEM_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inventory.db')
USERS_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'users.db')

def get_user_db_path(user_email: str = None) -> str:
    if not user_email or user_email == 'sameerpjadhav12@gmail.com':
        return SYSTEM_DB_PATH
    safe_email = "".join([c for c in user_email if c.isalnum()])
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), f"user_{safe_email}.db")

def init_users_db():
    conn = sqlite3.connect(USERS_DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE,
            password_hash TEXT,
            name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

# Initialize on startup
init_users_db()

# 4. Data Models
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
    conn = sqlite3.connect(USERS_DB_PATH)
    cursor = conn.cursor()
    
    # Check if exists
    cursor.execute("SELECT email FROM users WHERE email = ?", (user.email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password (simple hash for demo)
    pwd_hash = hashlib.sha256(user.password.encode()).hexdigest()
    user_id = str(uuid.uuid4())
    
    try:
        cursor.execute(
            "INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)",
            (user_id, user.email, pwd_hash, user.name)
        )
        conn.commit()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))
        
    conn.close()
    return {"status": "success", "message": "User registered successfully"}

@app.post("/auth/login")
def login_user(user: UserLogin):
    conn = sqlite3.connect(USERS_DB_PATH)
    cursor = conn.cursor()
    
    pwd_hash = hashlib.sha256(user.password.encode()).hexdigest()
    
    cursor.execute(
        "SELECT id, name, email FROM users WHERE email = ? AND password_hash = ?", 
        (user.email, pwd_hash)
    )
    row = cursor.fetchone()
    conn.close()
    
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

# 6. API Routes
@app.get("/health")
def health_check(user_email: Optional[str] = None, connection_uri: Optional[str] = None):
    import time
    from sqlalchemy import create_engine, inspect
    
    # Determine DB Source
    db_target = SYSTEM_DB_PATH
    is_sqlite = True
    
    if connection_uri:
        db_target = connection_uri
        is_sqlite = False
    elif user_email:
        db_target = get_user_db_path(user_email)
        is_sqlite = True
    
    # Check DB Size (only if local file)
    db_size = 0
    if is_sqlite and os.path.exists(db_target):
        try:
            db_size = os.path.getsize(db_target)
        except: 
            pass
            
    # Check Table Count
    table_count = 0
    try:
        if is_sqlite:
            if os.path.exists(db_target):
                conn = sqlite3.connect(db_target)
                cursor = conn.cursor()
                cursor.execute("SELECT count(*) FROM sqlite_master WHERE type='table';")
                table_count = cursor.fetchone()[0]
                conn.close()
        else:
            # External DB
            engine = create_engine(db_target)
            inspector = inspect(engine)
            table_count = len(inspector.get_table_names())
            
    except Exception as e:
        print(f"Health check DB error: {e}")
        table_count = -1 # Indicate error

    return {
        "status": "online",
        "message": "Datalk Backend is Ready",
        "system_db": str(db_target),
        "db_size_bytes": db_size,
        "table_count": table_count,
        "timestamp": time.time()
    }

@app.post("/schema")
def get_schema(request: SchemaRequest):
    """
    Fetch tables for the specific user or external DB.
    If table_name is provided, returns columns for that table.
    """
    try:
        from sqlalchemy import create_engine, inspect
        
        # Determine DB Source
        if request.connection_uri:
             db_target = request.connection_uri
             is_sqlite_file = False
        else:
            db_target = get_user_db_path(request.user_email)
            is_sqlite_file = True

        if is_sqlite_file:
             import sqlite3
             conn = sqlite3.connect(db_target)
             cursor = conn.cursor()
             
             if request.table_name:
                 # Get columns for specific table (SQLite)
                 cursor.execute(f"PRAGMA table_info({request.table_name})")
                 columns = []
                 for row in cursor.fetchall():
                     columns.append({
                         "name": row[1],
                         "type": row[2],
                         "pk": row[5] > 0
                     })
                 conn.close()
                 return {"columns": columns}
             else:
                 # Get tables
                 cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                 tables = [row[0] for row in cursor.fetchall()]
                 conn.close()
                 return {"tables": tables}

        else:
             # External DB or generic URI
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
        # Safe log of URI params if possible, to debug encoding
        if request.connection_uri:
             try:
                 from sqlalchemy.engine.url import make_url
                 u = make_url(request.connection_uri)
                 print(f"DEBUG: Connection Attempt -> Driver: {u.drivername}, Host: {u.host}, Port: {u.port}, User: {u.username}, DB: {u.database}")
             except:
                 pass
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
    uvicorn.run(
        "backend.main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True
    )