"""
AI Multi-Agent Chat — FastAPI Backend
=====================================
Endpoints (all except `/` require `Authorization: Bearer <supabase token>`
when Supabase is configured):

  GET    /                         Health check
  GET    /agents                   Available agents and whether a key is saved
  GET    /usage                    Today's message usage and limits
  POST   /chat/stream              Send a message to up to N agents, streamed as NDJSON
  GET    /chats                    List chats (sidebar)
  GET    /chats/{session_id}       All turns of one chat
  DELETE /chats/{session_id}       Delete a chat

  POST   /ask                      Non-streaming version of /chat/stream (legacy)
  GET    /api-keys/{user_id}       Retrieve saved API keys
  POST   /api-keys                 Save/update an API key
  DELETE /api-keys/{user_id}/{provider}
  GET    /history/{user_id}        Raw turns, newest first (legacy)
  DELETE /history/{user_id}/{id}   Delete one turn (legacy)
  POST   /delete-account           Delete all data of the signed-in user
  POST   /migrate                  Move data from a local id to the signed-in user
"""

from __future__ import annotations

import asyncio
import json
import uuid

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

import config
from services import supabase_service, usage
from services.auth import current_user_id, ensure_same_user
from services.context import build_messages
from services.llm_providers import AGENTS, ProviderError, complete_chat, stream_chat

PROVIDERS = tuple(sorted({a.key_provider for a in AGENTS.values()}))
PROVIDER_PATTERN = "^(" + "|".join(PROVIDERS) + ")$"
_background_tasks: set[asyncio.Task] = set()

app = FastAPI(
    title="AI Multi-Agent Chat",
    description="One chat, several AI agents answering side by side.",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production!
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(usage.LimitExceeded)
async def _limit_handler(_request, exc: usage.LimitExceeded):
    headers = {"Retry-After": str(exc.retry_after)} if exc.retry_after else None
    return JSONResponse(status_code=429, content={"detail": str(exc)}, headers=headers)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    agents: list[str] = Field(..., min_length=1)
    session_id: str | None = None
    # Only used when no key is stored server-side (e.g. running without Supabase).
    api_keys: dict[str, str] = Field(default_factory=dict)
    # Only used when Supabase is not configured; otherwise history is loaded from the DB.
    history: list[dict] = Field(default_factory=list)


class ModelResponse(BaseModel):
    text: str | None = None
    error: str | None = None


class AskRequest(BaseModel):
    """Legacy payload kept for backwards compatibility."""
    prompt: str = Field(..., min_length=1)
    history: list[dict] = Field(default_factory=list)
    openai_api_key: str = ""
    gemini_api_key: str = ""
    groq_api_key: str = ""
    deepseek_api_key: str = ""
    claude_api_key: str = ""
    grok_api_key: str = ""
    session_id: str | None = None
    selected_models: list[str] = Field(default_factory=lambda: ["gpt"])


class SaveApiKeyRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    provider: str = Field(..., pattern=PROVIDER_PATTERN)
    api_key: str = Field(..., min_length=1, max_length=500)


class MigrateRequest(BaseModel):
    old_id: str = Field(..., min_length=1)
    new_id: str = Field(..., min_length=1)


class DeleteAccountRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    password: str = Field(default="")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _valid_uuid(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return str(uuid.UUID(value))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid chat id.")


def _validate_message(prompt: str, agents: list[str]) -> list[str]:
    prompt = prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Message is empty.")
    if len(prompt) > config.MAX_PROMPT_CHARS:
        raise HTTPException(
            status_code=400,
            detail=f"Message is too long ({len(prompt)} characters). The limit is {config.MAX_PROMPT_CHARS}.",
        )
    unique = list(dict.fromkeys(agents))
    unknown = [a for a in unique if a not in AGENTS]
    if unknown:
        raise HTTPException(status_code=400, detail=f"Unknown agent(s): {', '.join(unknown)}")
    if len(unique) > config.MAX_AGENTS_PER_MESSAGE:
        raise HTTPException(
            status_code=400,
            detail=f"Pick at most {config.MAX_AGENTS_PER_MESSAGE} agents per message.",
        )
    return unique


async def _resolve_keys(user_id: str, fallback: dict[str, str]) -> dict[str, str]:
    stored = await asyncio.to_thread(supabase_service.get_api_key_map, user_id)
    return {p: (stored.get(p) or fallback.get(p) or "") for p in PROVIDERS}


async def _load_history(user_id: str, session_id: str, client_history: list[dict]) -> list[dict]:
    if supabase_service.is_connected():
        return await asyncio.to_thread(supabase_service.get_session_turns, user_id, session_id)
    return client_history


def _ndjson(event: dict) -> bytes:
    return (json.dumps(event, ensure_ascii=False) + "\n").encode("utf-8")


# ---------------------------------------------------------------------------
# Health / metadata
# ---------------------------------------------------------------------------

@app.get("/", tags=["Health"])
async def health_check():
    return {
        "status": "ok",
        "message": "AI Multi-Agent Chat is running",
        "supabase": supabase_service.is_connected(),
    }


@app.get("/agents", tags=["Chat"])
async def list_agents(user_id: str = Depends(current_user_id)):
    stored = await asyncio.to_thread(supabase_service.get_api_key_map, user_id)
    return {
        "agents": [
            {
                "id": a.id,
                "label": a.label,
                "vendor": a.vendor,
                "model": a.model,
                "key_provider": a.key_provider,
                "has_key": bool(stored.get(a.key_provider)),
            }
            for a in AGENTS.values()
        ],
        "max_agents_per_message": config.MAX_AGENTS_PER_MESSAGE,
    }


@app.get("/usage", tags=["Chat"])
async def get_usage(user_id: str = Depends(current_user_id)):
    return await usage.get_usage(user_id)


# ---------------------------------------------------------------------------
# Chat (streaming)
# ---------------------------------------------------------------------------

@app.post("/chat/stream", tags=["Chat"])
async def chat_stream(request: ChatRequest, user_id: str = Depends(current_user_id)):
    """
    Stream replies from the selected agents as newline-delimited JSON:

      {"type": "meta", "session_id", "agents", "context": {agent: {...}}}
      {"type": "delta", "agent", "text"}            (many)
      {"type": "agent_done", "agent", "error"}      (one per agent)
      {"type": "done", "conversation_id", "usage"}
    """
    agents = _validate_message(request.prompt, request.agents)
    prompt = request.prompt.strip()
    session_id = _valid_uuid(request.session_id) or str(uuid.uuid4())

    keys = await _resolve_keys(user_id, request.api_keys)
    history = await _load_history(user_id, session_id, request.history)
    contexts = {
        a: build_messages(history, a, prompt, config.CONTEXT_TOKEN_BUDGET) for a in agents
    }

    # Raises LimitExceeded -> 429 before the stream starts.
    await usage.acquire(user_id)

    async def event_stream():
        queue: asyncio.Queue = asyncio.Queue()
        texts = {a: [] for a in agents}
        errors: dict[str, str | None] = {a: None for a in agents}
        finished = False

        async def run(agent_id: str):
            try:
                key = keys[AGENTS[agent_id].key_provider]
                async for delta in stream_chat(agent_id, key, contexts[agent_id].messages):
                    texts[agent_id].append(delta)
                    await queue.put({"type": "delta", "agent": agent_id, "text": delta})
                if not "".join(texts[agent_id]).strip():
                    errors[agent_id] = "The model returned an empty response."
            except ProviderError as exc:
                errors[agent_id] = str(exc)
            except asyncio.CancelledError:
                raise
            except Exception as exc:  # never let one agent break the stream
                print(f"⚠️ {agent_id} failed: {exc!r}")
                errors[agent_id] = "Unexpected error while generating a reply."
            await queue.put({"type": "agent_done", "agent": agent_id, "error": errors[agent_id]})

        def responses() -> dict[str, dict]:
            out = {}
            for a in agents:
                text = "".join(texts[a]).strip() or None
                out[a] = {"text": text, "error": None if text and not errors[a] else errors[a]}
            return out

        tasks = [asyncio.create_task(run(a)) for a in agents]
        try:
            yield _ndjson({
                "type": "meta",
                "session_id": session_id,
                "agents": agents,
                "context": {
                    a: {
                        "included_turns": c.included_turns,
                        "trimmed_turns": c.trimmed_turns,
                        "history_tokens": c.history_tokens,
                    }
                    for a, c in contexts.items()
                },
            })

            remaining = len(agents)
            while remaining:
                event = await queue.get()
                if event["type"] == "agent_done":
                    remaining -= 1
                yield _ndjson(event)

            saved = await asyncio.to_thread(
                supabase_service.save_conversation, user_id, prompt, responses(), session_id
            )
            finished = True
            yield _ndjson({
                "type": "done",
                "conversation_id": saved.get("id") if saved else None,
                "persisted": bool(saved),
                "usage": await usage.get_usage(user_id),
            })
        finally:
            for t in tasks:
                t.cancel()
            usage.release(user_id)
            if not finished:
                # Client stopped or disconnected: keep the partial answers,
                # like ChatGPT does. Can't await here, so run it in the background.
                partial = responses()
                for r in partial.values():
                    if not r["text"] and not r["error"]:
                        r["error"] = "Stopped before a reply was generated."
                task = asyncio.get_running_loop().create_task(asyncio.to_thread(
                    supabase_service.save_conversation, user_id, prompt, partial, session_id
                ))
                _background_tasks.add(task)
                task.add_done_callback(_background_tasks.discard)

    return StreamingResponse(
        event_stream(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ---------------------------------------------------------------------------
# Chats (sessions)
# ---------------------------------------------------------------------------

@app.get("/chats", tags=["Chats"])
async def list_chats(user_id: str = Depends(current_user_id)):
    return {"chats": await asyncio.to_thread(supabase_service.list_sessions, user_id)}


@app.get("/chats/{session_id}", tags=["Chats"])
async def get_chat(session_id: str, user_id: str = Depends(current_user_id)):
    sid = _valid_uuid(session_id)
    turns = await asyncio.to_thread(supabase_service.get_session_turns, user_id, sid)
    if not turns:
        raise HTTPException(status_code=404, detail="Chat not found.")
    return {"session_id": sid, "turns": turns}


@app.delete("/chats/{session_id}", tags=["Chats"])
async def remove_chat(session_id: str, user_id: str = Depends(current_user_id)):
    sid = _valid_uuid(session_id)
    await asyncio.to_thread(supabase_service.delete_session, user_id, sid)
    return {"status": "deleted"}


# ---------------------------------------------------------------------------
# Legacy non-streaming endpoint
# ---------------------------------------------------------------------------

@app.post("/ask", tags=["Chat"])
async def ask(request: AskRequest, user_id: str = Depends(current_user_id)):
    agents = _validate_message(request.prompt, request.selected_models)
    prompt = request.prompt.strip()
    session_id = _valid_uuid(request.session_id) or str(uuid.uuid4())
    fallback = {
        "openai": request.openai_api_key, "gemini": request.gemini_api_key,
        "groq": request.groq_api_key, "deepseek": request.deepseek_api_key,
        "claude": request.claude_api_key, "grok": request.grok_api_key,
    }
    keys = await _resolve_keys(user_id, fallback)
    history = await _load_history(user_id, session_id, request.history)

    await usage.acquire(user_id)
    try:
        async def one(agent_id: str) -> ModelResponse:
            ctx = build_messages(history, agent_id, prompt, config.CONTEXT_TOKEN_BUDGET)
            try:
                text = await complete_chat(agent_id, keys[AGENTS[agent_id].key_provider], ctx.messages)
                return ModelResponse(text=text)
            except ProviderError as exc:
                return ModelResponse(error=str(exc))

        results = dict(zip(agents, await asyncio.gather(*(one(a) for a in agents))))
    finally:
        usage.release(user_id)

    saved = await asyncio.to_thread(
        supabase_service.save_conversation, user_id, prompt,
        {a: r.model_dump() for a, r in results.items()}, session_id,
    )
    body = {a: ModelResponse().model_dump() for a in AGENTS}
    body.update({a: r.model_dump() for a, r in results.items()})
    body["conversation_id"] = saved.get("id") if saved else None
    body["session_id"] = session_id
    return body


# ---------------------------------------------------------------------------
# API Keys
# ---------------------------------------------------------------------------

@app.get("/api-keys/{path_user_id}", tags=["API Keys"])
async def get_keys(path_user_id: str, user_id: str = Depends(current_user_id)):
    ensure_same_user(path_user_id, user_id)
    return {"keys": await asyncio.to_thread(supabase_service.get_api_key_map, user_id)}


@app.post("/api-keys", tags=["API Keys"])
async def save_key(request: SaveApiKeyRequest, user_id: str = Depends(current_user_id)):
    ensure_same_user(request.user_id, user_id)
    saved = await asyncio.to_thread(
        supabase_service.save_api_key, user_id, request.provider, request.api_key.strip()
    )
    return {"status": "saved" if saved else "not_persisted"}


@app.delete("/api-keys/{path_user_id}/{provider}", tags=["API Keys"])
async def remove_key(path_user_id: str, provider: str, user_id: str = Depends(current_user_id)):
    ensure_same_user(path_user_id, user_id)
    if provider not in PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Provider must be one of: {', '.join(PROVIDERS)}")
    await asyncio.to_thread(supabase_service.delete_api_key, user_id, provider)
    return {"status": "deleted"}


# ---------------------------------------------------------------------------
# Legacy history
# ---------------------------------------------------------------------------

@app.get("/history/{path_user_id}", tags=["History"])
async def get_history(path_user_id: str, limit: int = 50, user_id: str = Depends(current_user_id)):
    ensure_same_user(path_user_id, user_id)
    limit = max(1, min(limit, 500))
    return {"conversations": await asyncio.to_thread(supabase_service.get_conversations, user_id, limit)}


@app.delete("/history/{path_user_id}/{conversation_id}", tags=["History"])
async def remove_conversation(path_user_id: str, conversation_id: str, user_id: str = Depends(current_user_id)):
    ensure_same_user(path_user_id, user_id)
    await asyncio.to_thread(supabase_service.delete_conversation, user_id, conversation_id)
    return {"status": "deleted"}


# ---------------------------------------------------------------------------
# Account
# ---------------------------------------------------------------------------

@app.post("/delete-account", tags=["Account"])
async def delete_account(request: DeleteAccountRequest, user_id: str = Depends(current_user_id)):
    """Delete all API keys and conversations of the signed-in user."""
    ensure_same_user(request.user_id, user_id)
    try:
        await asyncio.to_thread(supabase_service.delete_user_data, user_id)
    except Exception as e:
        print(f"⚠️ delete_account failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete account data.")
    return {"status": "deleted", "message": "Account data has been permanently deleted."}


@app.post("/migrate", tags=["Migration"])
async def migrate(request: MigrateRequest, user_id: str = Depends(current_user_id)):
    """Move keys and history from a pre-login local id to the signed-in user."""
    ensure_same_user(request.new_id, user_id)
    ok = await asyncio.to_thread(supabase_service.migrate_user_data, request.old_id, user_id)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to migrate data.")
    return {"status": "migrated"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
