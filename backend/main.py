"""
AI Multi-Model Aggregator — FastAPI Backend
=============================================
Main entry point for the API server.

POST /ask  →  Sends the prompt to GPT & Gemini concurrently and returns both responses.
GET  /      →  Health-check endpoint.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import asyncio

from services.openai_service import get_gpt_response
from services.gemini_service import get_gemini_response

# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------
app = FastAPI(
    title="AI Multi-Model Aggregator",
    description="Send one prompt, get responses from multiple AI models.",
    version="1.0.0",
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


class ModelResponse(BaseModel):
    """The response returned from a single model."""
    text: str | None = None
    error: str | None = None


class AskResponse(BaseModel):
    """Aggregated response returned to the client."""
    gpt: ModelResponse
    gemini: ModelResponse


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/", tags=["Health"])
async def health_check():
    """Simple health check to verify the API is running."""
    return {"status": "ok", "message": "AI Multi-Model Aggregator is running 🚀"}


@app.post("/ask", response_model=AskResponse, tags=["Ask"])
async def ask(request: AskRequest):
    """
    Accept a prompt and API keys, call GPT & Gemini **simultaneously**,
    and return both responses (or per-model error messages).
    """

    # Fire both requests concurrently using asyncio.gather.
    # return_exceptions=True ensures one failure doesn't cancel the other.
    gpt_task = get_gpt_response(request.prompt, request.openai_api_key)
    gemini_task = get_gemini_response(request.prompt, request.gemini_api_key)

    gpt_result, gemini_result = await asyncio.gather(
        gpt_task, gemini_task, return_exceptions=True
    )

    # ---- Build per-model response objects ----

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

    return AskResponse(gpt=gpt_response, gemini=gemini_response)


# ---------------------------------------------------------------------------
# Entry point (for running with `python main.py` directly)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
