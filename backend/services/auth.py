"""
Request authentication
----------------------
The frontend signs users in with Supabase Auth and sends the access token as
`Authorization: Bearer <token>`. The backend validates it with Supabase and
uses the returned user id, so clients cannot act as another user.

Without Supabase configured (local, non-persistent mode), there is nothing to
validate against; requests then run as a single local user.
"""

from __future__ import annotations

import asyncio
import hashlib
import time

from fastapi import Header, HTTPException

from services import supabase_service

LOCAL_USER_ID = "local-user"
_CACHE_TTL_SECONDS = 60
_cache: dict[str, tuple[str, float]] = {}


async def current_user_id(authorization: str | None = Header(default=None)) -> str:
    if not supabase_service.is_connected():
        return LOCAL_USER_ID

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not signed in.")
    token = authorization[7:].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Not signed in.")

    # Cache by token hash so we don't call Supabase on every request.
    digest = hashlib.sha256(token.encode()).hexdigest()
    cached = _cache.get(digest)
    now = time.monotonic()
    if cached and cached[1] > now:
        return cached[0]

    user_id = await asyncio.to_thread(supabase_service.get_user_id_from_token, token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")

    if len(_cache) > 5000:
        _cache.clear()
    _cache[digest] = (user_id, now + _CACHE_TTL_SECONDS)
    return user_id


def ensure_same_user(path_user_id: str, user_id: str) -> None:
    """Reject requests whose path user id differs from the signed-in user."""
    if user_id != LOCAL_USER_ID and path_user_id != user_id:
        raise HTTPException(status_code=403, detail="Not allowed.")
