"""
Supabase Service
-----------------
Handles all database operations via the Supabase Python client.
Provides CRUD for API keys, conversation turns, and chat sessions.

Data model: each row in `conversations` is one turn of a chat (the user's
prompt plus every agent's reply). Rows sharing a `session_id` form one chat.
Older rows without a session_id are treated as one-turn chats whose id is
the row id.

The Supabase client is synchronous; async callers should wrap these
functions in `asyncio.to_thread`.
"""

import os
from datetime import datetime, timezone

from supabase import create_client, Client
from dotenv import load_dotenv

# Load .env from the project root
dotenv_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
load_dotenv(dotenv_path)

AGENT_IDS = ("gpt", "gemini", "groq", "deepseek", "claude", "grok")

# ---------------------------------------------------------------------------
# Initialize Supabase client
# ---------------------------------------------------------------------------
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

supabase: Client | None = None

if SUPABASE_URL and SUPABASE_KEY and "your-" not in SUPABASE_URL:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Supabase connected successfully")
    except Exception as e:
        print(f"⚠️  Supabase connection failed: {e}")
        print("   Running without persistence. Check your SUPABASE_KEY in .env")
else:
    print("⚠️  Supabase not configured — running without persistence")


def is_connected() -> bool:
    """Check if Supabase is properly configured."""
    return supabase is not None


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

def get_user_id_from_token(access_token: str) -> str | None:
    """Validate a Supabase access token and return the user's id."""
    if not is_connected():
        return None
    try:
        res = supabase.auth.get_user(access_token)
        return res.user.id if res and res.user else None
    except Exception as e:
        print(f"⚠️ Supabase token validation failed: {e}")
        return None


# ---------------------------------------------------------------------------
# API Keys — CRUD
# ---------------------------------------------------------------------------

def save_api_key(user_id: str, provider: str, api_key: str) -> dict | None:
    if not is_connected():
        return None

    try:
        response = (
            supabase.table("api_keys")
            .upsert(
                {
                    "user_id": user_id,
                    "provider": provider,
                    "api_key": api_key,
                    "updated_at": "now()",
                },
                on_conflict="user_id,provider",
            )
            .execute()
        )
        return response.data[0] if response.data else None
    except Exception as e:
        print(f"⚠️ Supabase save_api_key error: {e}")
        return None


def get_api_keys(user_id: str) -> list[dict]:
    if not is_connected():
        return []

    try:
        response = (
            supabase.table("api_keys")
            .select("provider, api_key")
            .eq("user_id", user_id)
            .execute()
        )
        return response.data or []
    except Exception as e:
        print(f"⚠️ Supabase get_api_keys error: {e}")
        return []


def get_api_key_map(user_id: str) -> dict[str, str]:
    """Return {provider: api_key} for a user."""
    return {k["provider"]: k["api_key"] for k in get_api_keys(user_id)}


def delete_api_key(user_id: str, provider: str) -> bool:
    if not is_connected():
        return False

    try:
        supabase.table("api_keys").delete().eq("user_id", user_id).eq("provider", provider).execute()
        return True
    except Exception as e:
        print(f"⚠️ Supabase delete_api_key error: {e}")
        return False


# ---------------------------------------------------------------------------
# Conversations — CRUD
# ---------------------------------------------------------------------------

def save_conversation(
    user_id: str,
    prompt: str,
    responses: dict[str, dict],
    session_id: str | None = None,
) -> dict | None:
    """
    Save one chat turn.

    responses: {agent_id: {"text": str | None, "error": str | None}}
               Only agents that were asked need to be present.
    """
    if not is_connected():
        return None

    row = {"user_id": user_id, "prompt": prompt, "session_id": session_id}
    for agent_id in AGENT_IDS:
        r = responses.get(agent_id)
        if r is not None:
            row[f"{agent_id}_response"] = r.get("text")
            row[f"{agent_id}_error"] = r.get("error")

    try:
        response = supabase.table("conversations").insert(row).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        print(f"⚠️ Supabase save_conversation error: {e}")
        print("💡 Hint: run backend/migrations/001_multi_agent_chat.sql in the Supabase SQL editor.")
        return None


def get_conversations(user_id: str, limit: int = 50) -> list[dict]:
    if not is_connected():
        return []

    try:
        response = (
            supabase.table("conversations")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return response.data or []
    except Exception as e:
        print(f"⚠️ Supabase get_conversations error: {e}")
        return []


def delete_conversation(user_id: str, conversation_id: str) -> bool:
    if not is_connected():
        return False

    try:
        supabase.table("conversations").delete().eq("id", conversation_id).eq("user_id", user_id).execute()
        return True
    except Exception as e:
        print(f"⚠️ Supabase delete_conversation error: {e}")
        return False


def count_messages_today(user_id: str) -> int | None:
    """Number of turns the user sent since 00:00 UTC (None if unavailable)."""
    if not is_connected():
        return None
    start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    try:
        response = (
            supabase.table("conversations")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .gte("created_at", start.isoformat())
            .limit(1)
            .execute()
        )
        return response.count or 0
    except Exception as e:
        print(f"⚠️ Supabase count_messages_today error: {e}")
        return None


# ---------------------------------------------------------------------------
# Chat sessions (groups of turns)
# ---------------------------------------------------------------------------

def list_sessions(user_id: str, max_rows: int = 2000) -> list[dict]:
    """
    Chats for the sidebar, most recently updated first:
    [{"id", "title", "created_at", "updated_at", "turns"}]
    """
    if not is_connected():
        return []
    try:
        response = (
            supabase.table("conversations")
            .select("id, session_id, prompt, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)  # newest rows first, so the limit drops old chats
            .limit(max_rows)
            .execute()
        )
    except Exception as e:
        print(f"⚠️ Supabase list_sessions error: {e}")
        return []

    sessions: dict[str, dict] = {}
    for row in reversed(response.data or []):  # oldest first: first prompt becomes the title
        sid = row.get("session_id") or row["id"]
        s = sessions.get(sid)
        if s is None:
            sessions[sid] = {
                "id": sid,
                "title": (row.get("prompt") or "New chat")[:80],
                "created_at": row["created_at"],
                "updated_at": row["created_at"],
                "turns": 1,
            }
        else:
            s["updated_at"] = row["created_at"]
            s["turns"] += 1
    return sorted(sessions.values(), key=lambda s: s["updated_at"], reverse=True)


def get_session_turns(user_id: str, session_id: str) -> list[dict]:
    """All turns of one chat, oldest first. `session_id` must be a validated UUID."""
    if not is_connected():
        return []
    try:
        response = (
            supabase.table("conversations")
            .select("*")
            .eq("user_id", user_id)
            .or_(f"session_id.eq.{session_id},id.eq.{session_id}")
            .order("created_at", desc=False)
            .execute()
        )
        return response.data or []
    except Exception as e:
        print(f"⚠️ Supabase get_session_turns error: {e}")
        return []


def delete_session(user_id: str, session_id: str) -> bool:
    """Delete every turn of a chat. `session_id` must be a validated UUID."""
    if not is_connected():
        return False
    try:
        (
            supabase.table("conversations")
            .delete()
            .eq("user_id", user_id)
            .or_(f"session_id.eq.{session_id},id.eq.{session_id}")
            .execute()
        )
        return True
    except Exception as e:
        print(f"⚠️ Supabase delete_session error: {e}")
        return False


# ---------------------------------------------------------------------------
# Account
# ---------------------------------------------------------------------------

def delete_user_data(user_id: str) -> None:
    """Delete all API keys and conversations of a user. Raises on failure."""
    if not is_connected():
        return
    supabase.table("api_keys").delete().eq("user_id", user_id).execute()
    supabase.table("conversations").delete().eq("user_id", user_id).execute()


# ---------------------------------------------------------------------------
# Migration
# ---------------------------------------------------------------------------

def migrate_user_data(old_user_id: str, new_user_id: str) -> bool:
    if not is_connected():
        return False

    try:
        supabase.table("api_keys").update({"user_id": new_user_id}).eq("user_id", old_user_id).execute()
        supabase.table("conversations").update({"user_id": new_user_id}).eq("user_id", old_user_id).execute()
        return True
    except Exception as e:
        print(f"⚠️ Supabase migrate error: {e}")
        return False
