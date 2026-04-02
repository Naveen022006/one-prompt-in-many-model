"""
AI Multi-Model Aggregator — FastAPI Backend
=============================================
Main entry point for the API server.

Endpoints:
  GET  /                              → Health check
  POST /ask                           → Send prompt to GPT, Gemini, & Groq
  GET  /api-keys/{user_id}            → Retrieve saved API keys
  POST /api-keys                      → Save/update an API key
  DELETE /api-keys/{user_id}/{provider} → Delete an API key
  GET  /history/{user_id}             → List past conversations
  DELETE /history/{user_id}/{id}      → Delete a conversation
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import asyncio
import os
from dotenv import load_dotenv

# Load .env from the parent directory (root of the project)
dotenv_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path)

from services.openai_service import get_gpt_response
from services.gemini_service import get_gemini_response
from services.groq_service import get_groq_response
from services.supabase_service import (
    save_api_key,
    get_api_keys,
    delete_api_key,
    save_conversation,
    get_conversations,
    delete_conversation,
    is_connected as supabase_connected,
)

# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------
app = FastAPI(
    title="AI Multi-Model Aggregator",
    description="Send one prompt, get responses from multiple AI models simultaneously.",
    version="2.1.0",
)

# Allow the React dev server (and any other origin during development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Tighten in production!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class AskRequest(BaseModel):
    """Payload the client sends when asking a question."""
    prompt: str = Field(..., min_length=1, max_length=4000, description="The user's prompt")
    history: list[dict] = Field(default=[], description="List of previous conversation turns")
    openai_api_key: str = Field(default="", description="OpenAI API key")
    gemini_api_key: str = Field(default="", description="Google Gemini API key")
    groq_api_key: str = Field(default="", description="Groq API key")
    user_id: str = Field(default="", description="Optional user ID for saving conversation history")
    session_id: str | None = Field(default=None, description="Optional conversation thread/session ID")


class ModelResponse(BaseModel):
    """The response returned from a single model."""
    text: str | None = None
    error: str | None = None


class AskResponse(BaseModel):
    """Aggregated response returned to the client."""
    gpt: ModelResponse
    gemini: ModelResponse
    groq: ModelResponse
    conversation_id: str | None = None  # ID of saved conversation (if Supabase is configured)
    session_id: str | None = None       # ID linking multiple turns


class SaveApiKeyRequest(BaseModel):
    """Payload to save an API key."""
    user_id: str = Field(..., min_length=1)
    provider: str = Field(..., pattern="^(openai|gemini|groq)$")
    api_key: str = Field(..., min_length=1)


class MigrateRequest(BaseModel):
    """Payload to migrate local user data to auth user ID."""
    old_id: str = Field(..., min_length=1)
    new_id: str = Field(..., min_length=1)



# ---------------------------------------------------------------------------
# Routes — Health
# ---------------------------------------------------------------------------

@app.get("/", tags=["Health"])
async def health_check():
    """Simple health check to verify the API is running."""
    return {
        "status": "ok",
        "message": "AI Multi-Model Aggregator is running 🚀",
        "supabase": supabase_connected(),
    }


# ---------------------------------------------------------------------------
# Routes — Ask (core feature)
# ---------------------------------------------------------------------------

@app.post("/ask", response_model=AskResponse, tags=["Ask"])
async def ask(request: AskRequest):
    """
    Accept a prompt and API keys, call GPT, Gemini, and Groq **simultaneously**,
    and return responses. If user_id is provided and Supabase is
    configured, the conversation is automatically saved.
    """

    # Map history to individual model formats
    gpt_history = []
    gemini_history = []
    groq_history = []

    for turn in request.history:
        pt = turn.get("prompt")
        if pt:
            gpt_history.append({"role": "user", "content": pt})
            gemini_history.append({"role": "user", "content": pt})
            groq_history.append({"role": "user", "content": pt})
        
        # Append assistant turns only if the model answered previously
        if turn.get("gpt_response") and not turn.get("gpt_response").startswith("Error"):
            gpt_history.append({"role": "assistant", "content": turn.get("gpt_response")})
        if turn.get("gemini_response") and not turn.get("gemini_response").startswith("Error"):
            gemini_history.append({"role": "assistant", "content": turn.get("gemini_response")})
        if turn.get("groq_response") and not turn.get("groq_response").startswith("Error"):
            groq_history.append({"role": "assistant", "content": turn.get("groq_response")})

    # Fire all 3 requests concurrently
    gpt_task = get_gpt_response(request.prompt, request.openai_api_key, history=gpt_history)
    gemini_task = get_gemini_response(request.prompt, request.gemini_api_key, history=gemini_history)
    groq_task = get_groq_response(request.prompt, request.groq_api_key, history=groq_history)

    gpt_result, gemini_result, groq_result = await asyncio.gather(
        gpt_task, gemini_task, groq_task, return_exceptions=True
    )

    # Build per-model response objects
    gpt_response = ModelResponse()
    if isinstance(gpt_result, Exception):
        gpt_response.error = str(gpt_result)
    else:
        gpt_response.text = gpt_result

    gemini_response = ModelResponse()
    if isinstance(gemini_result, Exception):
        gemini_response.error = str(gemini_result)
    else:
        gemini_response.text = gemini_result

    groq_response = ModelResponse()
    if isinstance(groq_result, Exception):
        groq_response.error = str(groq_result)
    else:
        groq_response.text = groq_result

    # Auto-save conversation to Supabase (if configured + user_id provided)
    conversation_id = None
    if request.user_id:
        saved = save_conversation(
            user_id=request.user_id,
            prompt=request.prompt,
            gpt_response=gpt_response.text,
            gpt_error=gpt_response.error,
            gemini_response=gemini_response.text,
            gemini_error=gemini_response.error,
            groq_response=groq_response.text,
            groq_error=groq_response.error,
            session_id=request.session_id,
        )
        if saved:
            conversation_id = saved.get("id")
            # If the frontend didn't pass a session_id, fallback to the row ID so future ones can use it.
            if not request.session_id:
                request.session_id = conversation_id

    return AskResponse(
        gpt=gpt_response,
        gemini=gemini_response,
        groq=groq_response,
        conversation_id=conversation_id,
        session_id=request.session_id,
    )


# ---------------------------------------------------------------------------
# Routes — API Keys CRUD
# ---------------------------------------------------------------------------

@app.get("/api-keys/{user_id}", tags=["API Keys"])
async def get_keys(user_id: str):
    """Retrieve all saved API keys for a user."""
    keys = get_api_keys(user_id)
    # Transform into a dict: { "openai": "sk-...", "gemini": "AIza..." }
    result = {}
    for k in keys:
        result[k["provider"]] = k["api_key"]
    return {"keys": result}


@app.post("/api-keys", tags=["API Keys"])
async def save_key(request: SaveApiKeyRequest):
    """Save or update an API key for a user + provider."""
    saved = save_api_key(request.user_id, request.provider, request.api_key)
    return {"status": "saved", "data": saved}


@app.delete("/api-keys/{user_id}/{provider}", tags=["API Keys"])
async def remove_key(user_id: str, provider: str):
    """Delete a specific API key."""
    if provider not in ("openai", "gemini", "groq"):
        raise HTTPException(status_code=400, detail="Provider must be 'openai', 'gemini', or 'groq'")
    delete_api_key(user_id, provider)
    return {"status": "deleted"}


# ---------------------------------------------------------------------------
# Routes — Conversation History
# ---------------------------------------------------------------------------

@app.get("/history/{user_id}", tags=["History"])
async def get_history(user_id: str, limit: int = 50):
    """Retrieve conversation history for a user (newest first)."""
    conversations = get_conversations(user_id, limit)
    return {"conversations": conversations}


@app.delete("/history/{user_id}/{conversation_id}", tags=["History"])
async def remove_conversation(user_id: str, conversation_id: str):
    """Delete a specific conversation."""
    delete_conversation(user_id, conversation_id)
    return {"status": "deleted"}


# ---------------------------------------------------------------------------
# Routes — Migration
# ---------------------------------------------------------------------------

from services.supabase_service import migrate_user_data

@app.post("/migrate", tags=["Migration"])
async def migrate(request: MigrateRequest):
    """Migrate all keys and history from a local UUID to an authenticated UUID."""
    success = migrate_user_data(request.old_id, request.new_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to migrate data.")
    return {"status": "migrated"}



# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
