# AI SQL Workbench (Datalk) 🤖📊

> Your intelligent SQL assistant. Chat with your database, visualize data, and manage schemas effortlessly.

**AI SQL Workbench** is a modern, full-stack application that allows users to interact with SQL databases using natural language. Powered by **Google Gemini AI**, it translates plain English questions into complex SQL queries, executes them securely, and visualizes the results instantly.

![Home Preview](frontend/public/image.png) 

---

## ✨ Key Features

-   **🗣️ Chat-to-SQL**: Ask questions like *"Show me the top 5 customers by revenue"* and get instant results.
-   **📈 Auto-Visualization**: Automatically generates Bar, Line, Pie, or Scatter charts based on your data.
-   **🛡️ Secure Sandboxing**: Each user gets a dedicated, isolated PostgreSQL schema.
-   **🔌 Multi-Database Support**: Connect to external PostgreSQL or MySQL databases (read-only safe mode available).
-   **⚡ Real-Time Dashboard**: Pin your favorite queries to a responsive dashboard.
-   **📝 Schema Manager**: View tables, columns, and relationships in an intuitive UI.
-   **🌓 Dark/Light Mode**: Beautifully designed UI with theme support.

---

## 🛠️ Tech Stack

-   **Frontend**: React (Vite), Tailwind CSS, Framer Motion, Lucide Icons
-   **Backend**: Python (FastAPI), SQLAlchemy, Pandas
-   **AI Engine**: Google Gemini Pro (via `google-generativeai`)
-   **Database**: PostgreSQL (Supabase)
-   **Deployment**: Render (Web Service + Static Site)

---

## 🚀 Getting Started

### Prerequisites
-   Node.js (v18+)
-   Python (v3.10+)
-   A Supabase Project (PostgreSQL)
-   Google Gemini API Key

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/ai-sql-agent.git
cd ai-sql-agent
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r ../requirements.txt
```

Create a `.env` file in the `backend` folder:
```env
GOOGLE_API_KEY=your_gemini_api_key
DATABASE_URL=postgresql://user:password@host:port/postgres
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

Run the server:
```bash
python -m main
# Server starts at http://localhost:8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` folder:
```env
VITE_API_BASE_URL=http://localhost:8000
```

Run the development server:
```bash
npm run dev
# App starts at http://localhost:5173
```

---

## 🌍 Deployment

This project is optimized for deployment on **Render**.

### Backend (Web Service)
1.  Connect GitHub repo to Render.
2.  **Runtime**: Python 3
3.  **Build Command**: `pip install -r requirements.txt`
4.  **Start Command**: `gunicorn backend.main:app -k uvicorn.workers.UvicornWorker`
5.  **Environment Variables**: Add `DATABASE_URL`, `GOOGLE_API_KEY`, and `ALLOWED_ORIGINS`.

### Frontend (Static Site)
1.  Connect GitHub repo to Render.
2.  **Build Command**: `npm install && npm run build`
3.  **Publish Directory**: `dist`
4.  **Environment Variables**: Add `VITE_API_BASE_URL` (set to your Backend URL).
5.  **Rewrites**: Add a rewrite rule: Source `/*` -> Destination `/index.html`.

---

## 📂 Project Structure

```
ai-sql-agent/
├── backend/            # FastAPI Python Backend
│   ├── agent.py        # AI Agent & Query Logic
│   ├── main.py         # API Routes & Auth
│   └── ...
├── frontend/           # React Vite Frontend
│   ├── src/
│   │   ├── components/ # UI Components (Dashboard, Chat, etc.)
│   │   └── ...
│   └── ...
└── ...
```

## 🔒 Security

-   **Schema Isolation**: Every registered user gets a unique PostgreSQL `SCHEMA` (e.g., `user_123`). All their tables and data are stored there, completely isolated from other users.
-   **Parametrized Queries**: SQLAlchemy is used to prevent SQL injection in system operations.
-   **AI Safety**: The AI is instructed to use read-only queries where possible, and dangerous commands are restricted in the prompt engineering layer.

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📄 License

MIT License.
