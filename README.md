# 🚀 AI Multi-Model Aggregator

**One Prompt, Multiple Minds** — Send a single prompt and compare responses from ChatGPT (GPT-3.5 Turbo) and Google Gemini (1.5 Flash) side by side.

---

## 📁 Project Structure

```
all in one model/
├── backend/
│   ├── main.py                    # FastAPI entry point
│   ├── requirements.txt           # Python dependencies
│   └── services/
│       ├── __init__.py
│       ├── openai_service.py      # Async OpenAI integration
│       └── gemini_service.py      # Async Gemini integration
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx               # React entry point
│       ├── index.css              # Global design system
│       ├── App.jsx                # Root component
│       ├── App.css                # Component styles
│       └── components/
│           ├── PromptBox.jsx      # Input form component
│           └── ResponseBox.jsx    # Response display component
└── README.md
```

---

## 🛠️ Prerequisites

- **Python 3.10+** — [Download](https://www.python.org/downloads/)
- **Node.js 18+** — [Download](https://nodejs.org/)
- **API Keys**:
  - OpenAI API key → [Get one here](https://platform.openai.com/api-keys)
  - Google Gemini API key → [Get one here](https://aistudio.google.com/app/apikey)

---

## 🏃 Running Locally

### 1. Start the Backend (FastAPI)

```bash
# Navigate to the backend folder
cd backend

# Create a virtual environment (recommended)
python -m venv venv

# Activate the virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python main.py
```

The API will be available at **http://localhost:8000**.  
Interactive docs at **http://localhost:8000/docs**.

### 2. Start the Frontend (React + Vite)

Open a **new terminal**:

```bash
# Navigate to the frontend folder
cd frontend

# Install dependencies (first time only)
npm install

# Start the dev server
npm run dev
```

The app will open at **http://localhost:5173**.

---

## 🔧 API Reference

### `GET /`

Health check endpoint.

**Response:**
```json
{ "status": "ok", "message": "AI Multi-Model Aggregator is running 🚀" }
```

### `POST /ask`

Send a prompt to all models simultaneously.

**Request Body:**
```json
{
  "prompt": "Explain quantum computing in simple terms",
  "openai_api_key": "sk-...",
  "gemini_api_key": "AIza..."
}
```

**Response:**
```json
{
  "gpt": {
    "text": "Quantum computing uses...",
    "error": null
  },
  "gemini": {
    "text": "Quantum computing is...",
    "error": null
  }
}
```

---

## ⚡ Key Design Decisions

| Decision | Rationale |
|---|---|
| **Async API calls** | Both model APIs are called concurrently via `asyncio.gather`, so total response time ≈ slowest model, not the sum. |
| **Per-request API keys** | No keys stored on the server — the user provides them each time, keeping the MVP simple and secure. |
| **Per-model error handling** | If one model fails, the other still returns a response. Errors are shown per-card, not globally. |
| **No database** | MVP scope — everything is stateless. |

---

## 📝 Notes

- API keys are **never stored** — they're sent per request and used in memory only.
- The backend uses CORS `allow_origins=["*"]` for development. Tighten this for production.
- The OpenAI service uses `gpt-3.5-turbo`; the Gemini service uses `gemini-1.5-flash`.

---

## 📄 License

MIT — use freely for any purpose.
