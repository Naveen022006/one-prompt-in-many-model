"""
Usage limits
------------
Per-user limits on chat messages:

  * daily message limit   (DAILY_MESSAGE_LIMIT, resets at 00:00 UTC)
  * per-minute rate limit (MESSAGES_PER_MINUTE)
  * concurrent streams    (MAX_CONCURRENT_STREAMS)

The daily count comes from the conversations table when Supabase is
connected, so it survives restarts. An in-process counter is also kept and
the larger of the two is used, which covers unsaved messages and running
without Supabase. Rate and concurrency limits are in-process only; run a
single backend worker or move them to a shared store (e.g. Redis) when
scaling out.
"""

from __future__ import annotations

import asyncio
import time
from collections import defaultdict, deque
from datetime import datetime, timezone

import config
from services import supabase_service


class LimitExceeded(Exception):
    def __init__(self, message: str, retry_after: int | None = None):
        super().__init__(message)
        self.retry_after = retry_after


_lock = asyncio.Lock()
_minute_window: dict[str, deque] = defaultdict(deque)
_daily_local: dict[tuple[str, str], int] = defaultdict(int)
_active: dict[str, list[float]] = defaultdict(list)  # start times of running streams
_SLOT_TTL_SECONDS = max(config.REQUEST_TIMEOUT_SECONDS * 2, 300)


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _seconds_until_reset() -> int:
    now = datetime.now(timezone.utc)
    return 86400 - (now.hour * 3600 + now.minute * 60 + now.second)


async def daily_used(user_id: str) -> int:
    db_count = await asyncio.to_thread(supabase_service.count_messages_today, user_id)
    return max(db_count or 0, _daily_local[(user_id, _today())])


async def get_usage(user_id: str) -> dict:
    used = await daily_used(user_id)
    return {
        "used": used,
        "limit": config.DAILY_MESSAGE_LIMIT,
        "remaining": max(config.DAILY_MESSAGE_LIMIT - used, 0),
        "resets_in_seconds": _seconds_until_reset(),
        "per_minute_limit": config.MESSAGES_PER_MINUTE,
        "max_agents_per_message": config.MAX_AGENTS_PER_MESSAGE,
        "max_prompt_chars": config.MAX_PROMPT_CHARS,
        "context_token_budget": config.CONTEXT_TOKEN_BUDGET,
    }


async def acquire(user_id: str) -> None:
    """
    Check all limits, count the message, and take a concurrency slot.
    Raises LimitExceeded. Every successful call must be paired with release().
    """
    used = await daily_used(user_id)
    async with _lock:
        key = (user_id, _today())
        # Re-read under the lock so concurrent requests can't share one DB count.
        used = max(used, _daily_local[key])
        if used >= config.DAILY_MESSAGE_LIMIT:
            raise LimitExceeded(
                f"Daily limit of {config.DAILY_MESSAGE_LIMIT} messages reached. It resets at 00:00 UTC.",
                retry_after=_seconds_until_reset(),
            )

        now = time.monotonic()
        window = _minute_window[user_id]
        while window and now - window[0] > 60:
            window.popleft()
        if len(window) >= config.MESSAGES_PER_MINUTE:
            raise LimitExceeded(
                f"Too many messages. The limit is {config.MESSAGES_PER_MINUTE} per minute.",
                retry_after=int(60 - (now - window[0])) + 1,
            )

        # Expire slots that were never released (e.g. client vanished before
        # the stream started) so a user can't get locked out.
        active = _active[user_id]
        active[:] = [t for t in active if now - t < _SLOT_TTL_SECONDS]
        if len(active) >= config.MAX_CONCURRENT_STREAMS:
            raise LimitExceeded("Another reply is still being generated. Wait for it to finish or stop it.")

        window.append(now)
        for old in [k for k in _daily_local if k[1] != key[1]]:
            del _daily_local[old]  # drop previous days
        _daily_local[key] = used + 1
        active.append(now)


def release(user_id: str) -> None:
    """Free the concurrency slot taken by acquire(). Safe to call from finally blocks."""
    active = _active.get(user_id)
    if active:
        active.pop(0)
