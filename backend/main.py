"""
AI Multi-Model Aggregator — FastAPI Backend
=============================================
Main entry point for the API server.

Endpoints:
  GET  /                              → Health check
  POST /ask                           → Send prompt to GPT & Gemini (auto-saves to Supabase)
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
from dotenv import load_dotenv

# Load .env before anything else
load_dotenv()

from services.openai_service import get_gpt_response
from services.gemini_service import get_gemini_response
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
    description="Send one prompt, get responses from multiple AI models.",
    version="2.0.0",
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
    openai_api_key: str = Field(..., min_length=1, description="OpenAI API key")
    gemini_api_key: str = Field(..., min_length=1, description="Google Gemini API key")
    user_id: str = Field(default="", description="Optional user ID for saving conversation history")


class ModelResponse(BaseModel):
    """The response returned from a single model."""
    text: str | None = None
    error: str | None = None


class AskResponse(BaseModel):
    """Aggregated response returned to the client."""
    gpt: ModelResponse
    gemini: ModelResponse
    conversation_id: str | None = None  # ID of saved conversation (if Supabase is configured)


class SaveApiKeyRequest(BaseModel):
    """Payload to save an API key."""
    user_id: str = Field(..., min_length=1)
    provider: str = Field(..., pattern="^(openai|gemini)$")
    api_key: str = Field(..., min_length=1)


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
    Accept a prompt and API keys, call GPT & Gemini **simultaneously**,
    and return both responses. If user_id is provided and Supabase is
    configured, the conversation is automatically saved.
    """

    # Fire both requests concurrently
    gpt_task = get_gpt_response(request.prompt, request.openai_api_key)
    gemini_task = get_gemini_response(request.prompt, request.gemini_api_key)

    gpt_result, gemini_result = await asyncio.gather(
        gpt_task, gemini_task, return_exceptions=True
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
        )
        if saved:
            conversation_id = saved.get("id")

    return AskResponse(
        gpt=gpt_response,
        gemini=gemini_response,
        conversation_id=conversation_id,
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
    if provider not in ("openai", "gemini"):
        raise HTTPException(status_code=400, detail="Provider must be 'openai' or 'gemini'")
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
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
