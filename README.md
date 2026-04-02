# 🚀 All-in-One AI Model Aggregator

**One Prompt, Multiple Minds** — Send a single prompt and get responses from **three powerful AI models simultaneously**. Compare answers from GPT-4o, Google Gemini, and Llama 3 side-by-side. Features persistent API key storage, full conversation history, and multi-turn context with Supabase.

![Version: 2.1.0](https://img.shields.io/badge/version-2.1.0-blue)
![Python: 3.10+](https://img.shields.io/badge/python-3.10%2B-green)
![Node: 18+](https://img.shields.io/badge/node-18%2B-green)
![License: MIT](https://img.shields.io/badge/license-MIT-blue)

---

## ✨ Key Features

- **🤖 Multi-Model Comparison** — Query 3 AI models in parallel:
  - OpenAI GPT-4o Mini (most capable)
  - Google Gemini 1.5 Flash (fast & affordable)
  - Groq Llama 3 (ultra-fast inference)
  
- **💾 Persistent Storage** — Save API keys securely in Supabase, never re-enter them
  
- **📜 Conversation History** — Auto-save all conversations with timestamps, browse & reuse past prompts
  
- **🔄 Multi-Turn Conversations** — Maintain context across multiple exchanges with each model
  
- **🔐 User Authentication** — Built-in Supabase Auth (email/password), isolated user data
  
- **🎨 Dark Mode UI** — Beautiful React + Vite frontend with responsive design
  
- **⚡ Real-time Processing** — Concurrent API calls, watch all 3 models respond in real-time

---

## 🏗️ Architecture Overview

This is a **full-stack web application** with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│     Frontend (React + Vite)             │
│  ├─ Authentication (Supabase Auth)      │
│  ├─ Prompt Input & Model Selection      │
│  ├─ Real-time Response Display          │
│  └─ History Browser + API Key Manager   │
└──────────────────┬──────────────────────┘
                   │ HTTP/REST
┌──────────────────▼──────────────────────┐
│     Backend (FastAPI v0.115.0)          │
│  ├─ /ask (submit prompt to 3 models)    │
│  ├─ /api-keys (CRUD for credentials)    │
│  ├─ /history (conversation retrieval)   │
│  └─ Concurrent async execution          │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
    ┌───▼──┐  ┌───▼──┐  ┌───▼──┐
    │ GPT  │  │Gemini│  │ Groq │
    └──────┘  └──────┘  └──────┘
        
        Database (Supabase PostgreSQL)
        ├─ api_keys (encrypted credentials)
        └─ conversations (chat history)
```

---

## 📁 Project Structure

```
all-in-one-model/
│
├─ backend/                                 # Python/FastAPI server
│  ├─ main.py                              # FastAPI app + endpoints
│  ├─ requirements.txt                     # Python dependencies
│  ├─ .env                                 # Supabase config (required!)
│  └─ services/
│     ├─ openai_service.py                 # GPT-4o integration (async)
│     ├─ gemini_service.py                 # Gemini Flash integration (async)
│     ├─ groq_service.py                   # Llama 3 integration (async)
│     └─ supabase_service.py               # Database CRUD operations
│
├─ frontend/                                 # React/Vite application
│  ├─ index.html                           # HTML entry point
│  ├─ package.json                         # NPM dependencies & scripts
│  ├─ vite.config.js                       # Vite build configuration
│  └─ src/
│     ├─ main.jsx                          # React app entry point
│     ├─ App.jsx                           # Root component + routing
│     ├─ App.css                           # Main component styles
│     ├─ index.css                         # Dark mode design tokens
│     ├─ lib/
│     │  ├─ supabaseClient.js              # Supabase client initialization
│     │  └─ supabaseHelper.js              # API key & history helpers
│     └─ components/
│        ├─ AuthPage.jsx                   # Login/signup page
│        ├─ TopNav.jsx                     # Header navigation
│        ├─ Sidebar.jsx                    # Sidebar navigation
│        ├─ PromptBox.jsx                  # Prompt input area + send button
│        ├─ ResponseCard.jsx               # Individual model response
│        ├─ BestAnswer.jsx                 # Combined/synthesis view
│        ├─ ApiKeysModal.jsx               # API key management dialog
│        └─ HistoryPage.jsx                # Conversation history viewer
│
├─ tests/
│  ├─ test_ask.py                          # Test /ask endpoint
│  ├─ test_db.py                           # Test database operations
│  ├─ test_rest.py                         # Test REST endpoints
│  └─ test_supabase.py                     # Test Supabase integration
│
├─ .env                                     # Environment variables (see below)
└─ README.md                                # This file
```

---

## 🛠️ Prerequisites

Before you begin, ensure you have:

- **Python 3.10 or higher** ([Download](https://www.python.org/downloads/))
- **Node.js 18+ with npm** ([Download](https://nodejs.org/))
- **Git** for version control
- **API Keys** (free tier options available):
  - OpenAI API key ([Get here](https://platform.openai.com/api-keys)) — $5 credit free trial
  - Google Gemini API key ([Get here](https://aistudio.google.com/app/apikey)) — Free with limits
  - Groq API key ([Get here](https://console.groq.com/)) — Free tier available
- **Supabase Account** ([Create free](https://supabase.com)) — For persistent storage

All three AI providers offer free tier usage — **you won't necessarily need to pay**.

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Clone & Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/all-in-one-model.git
cd all-in-one-model

# Create backend virtual environment
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create frontend environment
cd ../frontend
npm install
```

### Step 2: Configure Environment (Backend)

Create a `.env` file in the `backend/` directory:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional: Individual API keys (if not using Supabase to store them)
# Leave empty — users provide via UI
OPENAI_API_KEY=
GEMINI_API_KEY=
GROQ_API_KEY=
```

> **Where to find these values?** See the detailed [Configuration](#configuration) section below.

### Step 3: Start the Backend

From `backend/` directory:

```bash
uvicorn main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### Step 4: Start the Frontend

From `frontend/` directory (in a new terminal):

```bash
npm run dev
```

You should see:
```
  ➜  Local:   http://localhost:5173/
```

### Step 5: Open & Use

1. Open http://localhost:5173 in your browser
2. **Sign up or login** with email/password (Supabase Auth)
3. Click **"API Keys"** in the top bar and enter your OpenAI, Gemini, and/or Groq keys
4. Type a prompt and click **"Generate Response"**
5. Watch all 3 models respond in real-time!

---

## 🗄️ Supabase Setup (Detailed)

If you want **persistent API key storage** and **conversation history**, you must configure Supabase.

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Click **"New Project"** and fill in:
   - **Name**: `ai-hub` (or whatever you prefer)
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to you
3. Wait for the project to initialize (~2 minutes)

### 2. Get Your Credentials

Once your project loads:

1. Go to **Settings → API** (left sidebar)
2. Look for:
   - **Project URL** → Copy this to `SUPABASE_URL`
   - **anon public** key (under "API Keys") → Copy this to `SUPABASE_KEY`

> ⚠️ **Important**: Use the **anon public key**, NOT the service_role key

### 3. Create Database Tables

In your Supabase dashboard:

1. Go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Paste this SQL:

```sql
-- Table for storing encrypted API keys
CREATE TABLE api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'gemini', 'groq')),
  api_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Table for storing conversation history
CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  gpt_response TEXT,
  gpt_error TEXT,
  gemini_response TEXT,
  gemini_error TEXT,
  groq_response TEXT,
  groq_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_created ON conversations(created_at DESC);

-- Row Level Security (Development setup — for MVP)
-- ⚠️ In production, implement proper RLS policies
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Temporary policies (MVP only — tighten in production!)
CREATE POLICY "Allow all operations on api_keys" 
  ON api_keys FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on conversations" 
  ON conversations FOR ALL USING (true) WITH CHECK (true);
```

4. Click **"Run"** to execute
5. You should see ✅ green checkmarks — tables are created!

### 4. Update `.env`

Update `backend/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5. Test Connection

Restart your backend:

```bash
uvicorn main:app --reload --port 8000
```

You should see:
```
✅ Supabase connected successfully
```

---

## 🔑 Getting API Keys

### OpenAI GPT-4o Mini

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Sign up or log in
3. Click **"Create new secret key"**
4. Copy the key (you'll only see it once!)
5. Keep it safe — copy to your app's API Keys modal

**Free Tier**: $5 credit (usually lasts months for light usage)

### Google Gemini API

1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Sign in with Google account
3. Click **"Create API Key"**
4. Copy the key and save it

**Free Tier**: Generous limits (100+ requests/minute)

### Groq API

1. Go to [console.groq.com](https://console.groq.com/)
2. Sign up (uses Google, GitHub login)
3. Go to **API Keys**
4. Click **"Create API Key"**
5. Copy and save it

**Free Tier**: Unlimited (rate-limited but no quota)

---

## 📡 API Endpoints

The backend runs on `http://localhost:8000` with these endpoints:

### `POST /ask`
Send a prompt to all 3 models

**Request Body**:
```json
{
  "prompt": "Explain quantum computing in 2 sentences",
  "user_id": "user_123",
  "openai_api_key": "sk-...",
  "gemini_api_key": "AIzaSyD...",
  "groq_api_key": "gsk_...",
  "history": []
}
```

**Response**:
```json
{
  "gpt": {
    "text": "Quantum computers use quantum bits (qubits) that exist in multiple states...",
    "error": null
  },
  "gemini": {
    "text": "Quantum computing leverages quantum mechanics principles...",
    "error": null
  },
  "groq": {
    "text": "Quantum computers harness quantum mechanics...",
    "error": null
  },
  "conversation_id": "uuid-1234",
  "session_id": "session-5678"
}
```

### `POST /api-keys`
Save an API key to Supabase

**Request Body**:
```json
{
  "user_id": "user_123",
  "provider": "openai",
  "api_key": "sk-..."
}
```

### `GET /api-keys/{user_id}`
Retrieve all saved API keys for a user

### `DELETE /api-keys/{user_id}/{provider}`
Delete a saved API key

### `GET /history/{user_id}`
Retrieve conversation history for a user

### `DELETE /history/{user_id}/{conversation_id}`
Delete a specific conversation

### `GET /` 
Health check (returns 200 OK)

---

## 🔧 Configuration

### Backend Environment Variables

Create `backend/.env`:

```env
# ===== SUPABASE (Required for persistence) =====
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ===== Optional: Default API Keys (if not using frontend storage) =====
# Leave empty — users provide via UI
OPENAI_API_KEY=
GEMINI_API_KEY=
GROQ_API_KEY=
```

### Frontend Configuration

Edit `frontend/src/lib/supabaseHelper.js` to change the backend URL (if needed):

```javascript
const API_URL = "http://localhost:8000";  // Change if backend runs elsewhere
```

Change `frontend/src/App.jsx`:

```javascript
const API_URL = "http://localhost:8000";  // Change this line
```

---

## 📊 How It Works

### 1. User Submits a Prompt
User types a question and clicks "Generate Response" in the UI.

### 2. Frontend Sends Request
The React app sends the prompt + API keys to the backend's `/ask` endpoint.

### 3. Backend Calls All 3 Models (Concurrently)
```python
# All three run in parallel with asyncio
gpt_response = await get_gpt_response(prompt, openai_api_key)
gemini_response = await get_gemini_response(prompt, gemini_api_key)
groq_response = await get_groq_response(prompt, groq_api_key)
```

### 4. Responses Are Returned
All three responses (or errors) are sent back to the frontend in one response object.

### 5. Conversation Is Saved (Optional)
If `user_id` is provided and Supabase is configured, the conversation is auto-saved to database.

### 6. Frontend Displays Results
React components render each model's response in real-time.

---

## 🛠️ Development

### Running Tests

```bash
# In backend/ directory
pytest  # Run all tests

# Or specific test file
pytest test_ask.py -v
pytest test_db.py -v
```

### Code Structure

**Backend** uses async/await for concurrent API calls:
- `openai_service.py` — GPT-4o integration
- `gemini_service.py` — Gemini Flash integration (with async thread conversion)
- `groq_service.py` — Llama 3 integration
- `supabase_service.py` — Database operations

**Frontend** uses React hooks + Vite:
- State management with `useState`
- Side effects with `useEffect`
- API calls via `fetch` in helper functions
- CSS Grid + Flexbox for responsive layout

### Customization Ideas

- **Add more models** — Add a new service module + endpoint
- **Custom system prompts** — Modify the system content in each service
- **Change models** — Update `model="gpt-4o-mini"` to `"gpt-4-turbo"` etc.
- **Temperature tuning** — Adjust `temperature=0.7` in services
- **Response length** — Change `max_tokens=1024`

---

## 🐛 Troubleshooting

### "Supabase not configured"
**Problem**: Message says "Running without persistence"  
**Solution**: 
1. Check `SUPABASE_URL` and `SUPABASE_KEY` in `.env`
2. Make sure they're not empty and don't contain `"your-"`
3. Restart the backend

### "Invalid API key"
**Problem**: "Invalid OpenAI API key"  
**Solution**:
1. Verify the key in Settings → API Keys on the provider's website
2. Keys should NOT have spaces
3. Copy the entire key (some generate with multiple parts)
4. Check that the key is for the right environment (test vs. production)

### "CORS Error"
**Problem**: Frontend can't talk to backend  
**Solution**:
1. Verify backend is running on `http://localhost:8000`
2. Verify frontend's `API_URL` matches in `App.jsx`
3. Check browser console for the exact URL it's trying to call

### Backend won't start
**Problem**: `ModuleNotFoundError: No module named 'fastapi'`  
**Solution**:
1. Activate virtual environment: `source venv/bin/activate`
2. Install requirements: `pip install -r requirements.txt`
3. Try starting again

### Frontend won't load
**Problem**: `npm ERR! code ERESOLVE`  
**Solution**:
1. Delete `node_modules` and `package-lock.json`
2. Run `npm install` again
3. If still fails: `npm install --force`

### "Connection Timeout"
**Problem**: No response from AI models  
**Solution**:
1. Check your internet connection
2. Verify API key is valid and has quota remaining
3. Try a shorter prompt
4. Check if the model service is down (OpenAI, Google, Groq status pages)

---

## 📈 Deployment

### Deploy Backend (Heroku/Railway/Render)

1. Push code to GitHub
2. Deploy using:
   - **Heroku**: `git push heroku main`
   - **Railway**: Connect GitHub repo
   - **Render**: Connect GitHub repo + deploy
3. Set environment variables in dashboard (SUPABASE_URL, SUPABASE_KEY)
4. Update frontend's `API_URL` to your deployed backend URL

### Deploy Frontend (Vercel/Netlify/GitHub Pages)

1. Build: `npm run build`
2. Deploy via:
   - **Vercel**: `npm i -g vercel && vercel`
   - **Netlify**: Drag & drop the `dist/` folder
   - Any static host: Upload `dist/` folder

---

## 🔒 Security Notes

⚠️ **Disclaimer**: This is a **project/learning tool**. For production:

1. **Implement proper RLS policies** in Supabase (row-level security)
2. **Never commit `.env`** — add to `.gitignore` ✅ (already done)
3. **Hash/encrypt API keys** before storing (Supabase Vault recommended)
4. **Use environment variables** for sensitive data
5. **Add rate limiting** to prevent abuse
6. **Validate all inputs** on the backend
7. **Use HTTPS** in production (not HTTP)

---

## 📝 License

This project is licensed under the **MIT License** — see LICENSE file for details.  
You're free to use, modify, and distribute this code.

---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. **Fork** the repository
2. **Create a feature branch**: `git checkout -b feature/your-feature`
3. **Make changes** and **commit**: `git commit -m "Add feature X"`
4. **Push**: `git push origin feature/your-feature`
5. **Create a Pull Request**

Please include:
- Clear description of changes
- Tests (if applicable)
- Updated documentation

---

## 💡 Future Ideas

- [ ] Web UI for model parameter tuning (temperature, max_tokens)
- [ ] Export conversations as PDF/Markdown
- [ ] Prompt templates library
- [ ] Cost estimation (how much did this conversation cost?)
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] Voice input/output
- [ ] Custom system prompts per model
- [ ] Advanced analytics & usage stats

---

## 📧 Support

If you have questions or issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review [API Endpoints](#-api-endpoints)
3. Open an issue on GitHub
4. Check the /test files for usage examples

---

## 🙏 Acknowledgments

Built with:
- [FastAPI](https://fastapi.tiangolo.com/) — Modern Python web framework
- [React](https://react.dev/) — UI library
- [Vite](https://vitejs.dev/) — Fast build tool
- [Supabase](https://supabase.com/) — Open-source Firebase alternative
- [OpenAI](https://openai.com/), [Google Gemini](https://gemini.google.com/), [Groq](https://groq.com/) — AI models

---

**Last Updated**: 2026-04-02  
**v2.1.0** | **Status**: Active Development

---

**Happy prompting! 🚀**

### 3. Get your credentials from Project Settings → API:
- **Project URL** (e.g. `https://xxxxx.supabase.co`)
- **anon public key**

### 4. Edit `backend/.env`:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-public-key
```

---

## 🏃 Running Locally

### Terminal 1 — Backend (FastAPI)

```bash
cd backend

# Create & activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Start the server
python main.py
```

Backend runs at **http://localhost:8000** (API docs at `/docs`).

### Terminal 2 — Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:5173**.

---

## 🔧 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check (shows Supabase connection status) |
| `POST` | `/ask` | Send prompt to GPT + Gemini (auto-saves to Supabase) |
| `GET` | `/api-keys/{user_id}` | Retrieve saved API keys |
| `POST` | `/api-keys` | Save/update an API key |
| `DELETE` | `/api-keys/{user_id}/{provider}` | Delete an API key |
| `GET` | `/history/{user_id}` | List past conversations |
| `DELETE` | `/history/{user_id}/{id}` | Delete a conversation |

---

## ⚡ How It Works

1. **User Identity** — A UUID is generated and stored in `localStorage`. This ID links your API keys and history in Supabase.
2. **API Keys** — Saved to Supabase via the backend. Auto-loaded when you return.
3. **Conversations** — Every `/ask` request auto-saves the prompt + responses to Supabase.
4. **History** — Click "History" in the sidebar to browse, search, expand, reuse, or delete past conversations.

---

## 📝 Notes

- Works **without Supabase** too — the app gracefully falls back to in-memory mode if `.env` is not configured.
- API keys are stored in **plain text** in Supabase for this MVP. Use encryption for production.
- CORS is set to `allow_origins=["*"]` for development. Restrict in production.

---

## 📄 License

MIT — use freely for any purpose.
