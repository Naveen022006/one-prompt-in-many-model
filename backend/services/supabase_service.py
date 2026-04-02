"""
Supabase Service
-----------------
Handles all database operations via the Supabase Python client.
Provides CRUD for API keys and conversation history.
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

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
        print("   The key should start with 'eyJ...' (find it in Project Settings → API → anon public)")
else:
    print("⚠️  Supabase not configured — running without persistence")


def is_connected() -> bool:
    """Check if Supabase is properly configured."""
    return supabase is not None


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
    gpt_response: str | None,
    gpt_error: str | None,
    gemini_response: str | None,
    gemini_error: str | None,
    groq_response: str | None = None,
    groq_error: str | None = None,
) -> dict | None:
    if not is_connected():
        return None

    try:
        response = (
            supabase.table("conversations")
            .insert(
                {
                    "user_id": user_id,
                    "prompt": prompt,
                    "gpt_response": gpt_response,
                    "gpt_error": gpt_error,
                    "gemini_response": gemini_response,
                    "gemini_error": gemini_error,
                    "groq_response": groq_response,
                    "groq_error": groq_error,
                }
            )
            .execute()
        )
        return response.data[0] if response.data else None
    except Exception as e:
        print(f"⚠️ Supabase save_conversation error: {e}")
        print("💡 Hint: Did you run the SQL script to create the 'conversations' table in your Supabase dashboard?")
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
