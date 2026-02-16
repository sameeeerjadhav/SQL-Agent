
import os
import sqlite3
import pandas as pd
import json
import google.generativeai as genai
from dotenv import load_dotenv
from sqlalchemy import create_engine, text, inspect
from langchain_community.utilities import SQLDatabase

# Helper to normalize URI
def get_db_uri(path_or_uri):
    if "://" not in path_or_uri:
        # Assume SQLite file path
        return f"sqlite:///{path_or_uri}"
    return path_or_uri

# Check backend/.env first, then root .env
backend_env = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
root_env = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')

if os.path.exists(backend_env):
    load_dotenv(backend_env)
elif os.path.exists(root_env):
    load_dotenv(root_env)
else:
    load_dotenv()

# 1. Database Configuration
# (Kept for reference, logic moved to main.py typically)

# 2. Setup AI (Direct SDK)
print("DEBUG: Checking GOOGLE_API_KEY...")
api_key = os.environ.get("GOOGLE_API_KEY")
if not api_key:
    print("DEBUG: GOOGLE_API_KEY MISSING!")
    raise ValueError("GOOGLE_API_KEY not found. Please set it in .env file.")
print("DEBUG: GOOGLE_API_KEY FOUND.")

# Configure GenAI
genai.configure(api_key=api_key)

# Use 'gemini-2.0-flash' as it appeared in the available models list
MODEL_NAME = "gemini-flash-latest" 
print(f"DEBUG: Initializing GenerativeModel with {MODEL_NAME}...")
model = genai.GenerativeModel(MODEL_NAME)
print("DEBUG: GenerativeModel Initialized.")

def execute_sql_commands(sql_command: str, db_path: str):
    """
    Executes SQL using SQLAlchemy to support multiple dialects (SQLite, Postgres).
    """
    db_uri = get_db_uri(db_path)
    engine = create_engine(db_uri)
    datasets = []
    
    import sqlparse
    statements = sqlparse.split(sql_command)
    
    try:
        with engine.connect() as conn:
            for statement in statements:
                stmt = statement.strip()
                if not stmt:
                    continue
                    
                upper_sql = stmt.upper()
                
                # Check if it's a SELECT query (read-only)
                if upper_sql.startswith(("SELECT", "PRAGMA", "SHOW", "DESCRIBE", "EXPLAIN", "WITH")):
                    try:
                        df = pd.read_sql_query(text(stmt), conn)
                        datasets.append({
                            "type": "table",
                            "data": df.to_dict(orient='records'),
                            "sql": stmt
                        })
                    except Exception as e:
                         # Attempt to capture error
                         datasets.append({
                            "type": "error",
                            "data": [{"error": str(e)}],
                            "sql": stmt
                        })
                else:
                    # Handle DDL/DML
                    try:
                        result = conn.execute(text(stmt))
                        conn.commit()
                        datasets.append({
                            "type": "message",
                            "data": [{
                                "message": "Statement executed successfully", 
                                "rows_affected": result.rowcount
                            }],
                            "sql": stmt
                        })
                    except Exception as e:
                        datasets.append({
                            "type": "error",
                            "data": [{"error": str(e)}],
                            "sql": stmt
                        })
    except Exception as e:
        datasets.append({
             "type": "error",
             "data": [{"error": f"Connection/Engine Error: {str(e)}"}],
             "sql": "Global"
        })
        
    return datasets

# Simple in-memory cache: {db_path: {'timestamp': time, 'schema': str}}
SCHEMA_CACHE = {}
CACHE_TTL = 300  # 5 minutes

def get_schema_with_samples(db_path):
    """
    Fetches schema info AND 3 sample rows for each table to give the AI context.
    Uses generic SQLAlchemy via LangChain utilities or direct inspection.
    Cached for performance.
    """
    import time
    
    # Check Cache
    if db_path in SCHEMA_CACHE:
        entry = SCHEMA_CACHE[db_path]
        if time.time() - entry['timestamp'] < CACHE_TTL:
            print(f"DEBUG: Using cached schema for {db_path}")
            return entry['schema']
    
    print(f"DEBUG: Cache miss/expired. Fetching schema for {db_path}...")
    db_uri = get_db_uri(db_path)
    
    try:
        db = SQLDatabase.from_uri(db_uri)
        table_names = db.get_usable_table_names()
        
        schema_str = ""
        
        for table in table_names:
            # Get table info (DDL/Columns)
            table_info = db.get_table_info([table])
            
            # Get samples
            samples_str = ""
            try:
                # Limit samples to avoid huge prompt context
                res = db.run(f"SELECT * FROM {table} LIMIT 3")
                samples_str = res
            except Exception:
                samples_str = "Could not fetch samples."
                
            schema_str += f"{table_info}\nSample Data:\n{samples_str}\n"
            schema_str += "------------------------------------------------\n"
            
        final_schema = schema_str if schema_str else "No tables found."
        
        # Update Cache
        SCHEMA_CACHE[db_path] = {
            'timestamp': time.time(),
            'schema': final_schema
        }
        
        return final_schema
    except Exception as e:
        return f"Error fetching schema: {str(e)}"

def run_sql_agent(user_query: str, db_path: str, history: list = [], safe_mode: bool = False):
    """
    Professional SQL Agent using Google Gemini (Direct SDK).
    """
    print(f"DEBUG: run_sql_agent called with query: {user_query}")
    print(f"DEBUG: DB Path: {db_path}")

    try:
        schema_info = get_schema_with_samples(db_path)
    except Exception as e:
        schema_info = f"Error fetching schema: {e}"

    # Format history
    chat_context = ""
    if history:
        for msg in history[-6:]:
            role = "User" if msg.get('role') == 'user' else "AI"
            content = str(msg.get('content', ''))
            if content and "Error:" not in content:
                chat_context += f"{role}: {content}\n"

    # Construct Prompt
    system_instruction = f"""You are a comprehensive SQL Expert and Data Assistant.
Your goal is to help the user manage their database and understand their data.

**CRITICAL RULES FOR SQL GENERATION:**
1. **INSERT Operations**: 
    - NEVER include the ID column in your `INSERT` statements if the table has an auto-incrementing primary key.
2. **UPDATE/DELETE Operations**:
    - Always ensure you are targeting specific rows.
3. **SELECT Operations**:
    - Limit results if the table is huge, unless explicitly asked for all.
4. **Schema Awareness**:
    - Check the SCHEMA below carefully. Do not invent columns.
    - If a table exists, do NOT use `CREATE TABLE`. Use `INSERT` to add data.
5. **Safety Protocols**:
    - You are authorized to generate destructive SQL (DELETE, DROP) if explicitly requested.
    - Do NOT refuse requests. The system handles confirmation.
6. **Final Output**:
    - If you execute DDL/DML, ALWAYS append a SELECT statement to show the result.

**PERSONA & THOUGHT PROCESS:**
- You are a helpful, intelligent data analyst.
- Explain *why* you are running this query in the 'thought' field.

**RESPONSE FORMAT (JSON ONLY):**
{{
    "sql": "The SQL query string (can be multiple statements separated by ;)",
    "thought": "Your conversational explanation here",
    "chart_type": "bar", "line", "pie", or "table"
}}

**PREVIOUS CONTEXT:**
{chat_context}

**CURRENT SCHEMA:**
{schema_info}

**USER QUESTION:**
{user_query}
"""

    MAX_RETRIES = 1
    last_error = None

    for attempt in range(MAX_RETRIES):
        current_prompt = system_instruction
        if last_error:
            current_prompt += f"\nSYSTEM: The previous SQL query failed with this error: {last_error}. Please correct the SQL and try again.\n"

        try:
            print("DEBUG: Generating content via Direct SDK...")
            
            # Prepare generation config if needed
            generation_config = genai.types.GenerationConfig(
                temperature=0.0,
                response_mime_type="application/json"  # Enforce JSON if supported by model
            )

            response = model.generate_content(
                current_prompt,
                generation_config=generation_config
            )
            
            print(f"DEBUG: SDK Response received.")
            
            # Parse JSON
            raw_text = response.text
            # Clean up markdown code blocks if present
            if "```json" in raw_text:
                raw_text = raw_text.split("```json")[1].split("```")[0].strip()
            elif "```" in raw_text:
                raw_text = raw_text.split("```")[1].split("```")[0].strip()
            
            ai_data = json.loads(raw_text)
            
            # --- SAFE MODE ---
            if safe_mode:
                import sqlparse
                try:
                    parsed = sqlparse.parse(ai_data.get("sql") or "")[0]
                    stmt_type = parsed.get_type().upper()
                    forbidden = ["DROP", "DELETE", "TRUNCATE", "ALTER", "UPDATE", "INSERT"]
                    
                    if stmt_type in forbidden:
                         return {
                            "status": "success",
                            "thought": f"⚠️ **Safe Mode Triggered**\n\nI've prepared a modifying command (`{stmt_type}`). Confirm execution?",
                            "sql": ai_data.get("sql"),
                            "requires_confirmation": True,
                            "datasets": []
                        }
                except Exception as e:
                    print(f"DEBUG: Safe Mode check failed: {e}")
                    # Fallback to naive if parse fails
                    forbidden = ["DROP", "DELETE", "TRUNCATE", "ALTER", "UPDATE", "INSERT"]
                    gen_sql_upper = (ai_data.get("sql") or "").upper()
                    # Only check start of string to be slightly safer than 'in'
                    if any(gen_sql_upper.strip().startswith(cmd) for cmd in forbidden):
                         return {
                            "status": "success",
                            "thought": f"⚠️ **Safe Mode Triggered**\n\nI've prepared a modifying command. Confirm execution?",
                            "sql": ai_data.get("sql"),
                            "requires_confirmation": True,
                            "datasets": []
                        }
            # -----------------
            
            ai_sql = (ai_data.get('sql') or '').strip()
            ai_thought = (ai_data.get('thought') or '').strip()
            ai_chart_type = ai_data.get('chart_type', 'table')
            
            # Execute SQL
            datasets = execute_sql_commands(ai_sql, db_path)
            
            # Check execution errors
            is_error = False
            error_msg = ""
            if datasets:
                last_res = datasets[-1]
                if last_res.get('type') == 'error':
                    is_error = True
                    error_data = last_res.get('data', [{}])[0]
                    error_msg = error_data.get('error', 'Unknown Error')

            if is_error and attempt < MAX_RETRIES - 1:
                last_error = error_msg
                print(f"Attempt {attempt+1} failed: {error_msg}. Retrying...")
                continue

            final_response = {
                "status": "success",
                "sql": ai_sql,
                "thought": ai_thought,
                "chart_type": ai_chart_type,
                "datasets": datasets
            }
            
            if is_error:
                final_response['status'] = 'error'
                final_response['error_message'] = error_msg
            else:
                if datasets:
                     final_response['data'] = datasets[-1].get('data')
                     final_response['chart_type'] = 'table' if datasets[-1].get('type') == 'table' else 'message'
            
            return final_response

        except Exception as e:
            print(f"DEBUG: Error in attempt {attempt+1}: {e}")
            last_error = str(e)
            
            # Catch Quota Errors
            if "429" in str(e) or "ResourceExhausted" in str(e):
                 return {
                    "status": "error",
                    "error_message": "AI Usage Limit Exceeded (Quota). Please try again later.",
                    "sql": 'N/A'
                }

    return { 
        "status": "error", 
        "error_message": f"Agent failed. Error: {last_error}",
        "sql": 'N/A'
    }