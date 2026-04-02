# 🚀 AI Multi-Model Aggregator (AI Hub)

**One Prompt, Multiple Minds** — Send a single prompt and compare responses from ChatGPT and Google Gemini side by side. With Supabase integration for persistent API keys and conversation history.

---

## 📁 Project Structure

```
all in one model/
├── backend/
│   ├── main.py                         # FastAPI entry point (all endpoints)
│   ├── requirements.txt                # Python dependencies
│   ├── .env                            # Supabase credentials (edit this!)
│   └── services/
│       ├── __init__.py
│       ├── openai_service.py           # Async OpenAI integration
│       ├── gemini_service.py           # Async Gemini integration
│       └── supabase_service.py         # Supabase CRUD (keys + history)
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx                    # React entry point
│       ├── index.css                   # Design system (dark mode tokens)
│       ├── App.jsx                     # Root component (routing + state)
│       ├── App.css                     # Component styles
│       ├── lib/
│       │   └── supabaseHelper.js       # User ID + backend API helpers
│       └── components/
│           ├── Sidebar.jsx             # Left navigation
│           ├── TopNav.jsx              # Top navigation bar
│           ├── PromptBox.jsx           # Prompt input + model chips
│           ├── ResponseCard.jsx        # Individual model response card
│           ├── BestAnswer.jsx          # Combined answer section
│           ├── ApiKeysModal.jsx        # API key management modal
│           └── HistoryPage.jsx         # Conversation history page
└── README.md
```

---

## 🛠️ Prerequisites

- **Python 3.10+** — [Download](https://www.python.org/downloads/)
- **Node.js 18+** — [Download](https://nodejs.org/)
- **Supabase Project** — [Create free](https://supabase.com) (for persistent storage)
- **API Keys**:
  - OpenAI API key → [Get one here](https://platform.openai.com/api-keys)
  - Google Gemini API key → [Get one here](https://aistudio.google.com/app/apikey)

---

## 🗄️ Supabase Setup

### 1. Create a project at [supabase.com](https://supabase.com)

### 2. Run this SQL in the SQL Editor (Dashboard → SQL Editor → New Query):

```sql
```sql
-- API Keys table
CREATE TABLE api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'gemini', 'groq')),
  api_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Conversations table
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

-- Indexes for fast lookups
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_created ON conversations(created_at DESC);

-- Disable RLS for MVP (no auth system)
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anon key (MVP only — tighten in production)
CREATE POLICY "Allow all for api_keys" ON api_keys FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for conversations" ON conversations FOR ALL USING (true) WITH CHECK (true);
```

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
