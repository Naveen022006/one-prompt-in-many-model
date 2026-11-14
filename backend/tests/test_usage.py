import asyncio

import pytest

import config
from services import supabase_service, usage


@pytest.fixture(autouse=True)
def reset(monkeypatch):
    usage._minute_window.clear()
    usage._daily_local.clear()
    usage._active.clear()
    monkeypatch.setattr(supabase_service, "count_messages_today", lambda _uid: None)
    monkeypatch.setattr(config, "DAILY_MESSAGE_LIMIT", 3)
    monkeypatch.setattr(config, "MESSAGES_PER_MINUTE", 100)
    monkeypatch.setattr(config, "MAX_CONCURRENT_STREAMS", 1)


def run(coro):
    return asyncio.run(coro)


def test_daily_limit():
    for _ in range(3):
        run(usage.acquire("u"))
        usage.release("u")
    with pytest.raises(usage.LimitExceeded, match="Daily limit"):
        run(usage.acquire("u"))
    assert run(usage.get_usage("u"))["remaining"] == 0


def test_daily_limit_uses_database_count(monkeypatch):
    monkeypatch.setattr(supabase_service, "count_messages_today", lambda _uid: 3)
    with pytest.raises(usage.LimitExceeded):
        run(usage.acquire("u"))


def test_per_minute_limit(monkeypatch):
    monkeypatch.setattr(config, "DAILY_MESSAGE_LIMIT", 100)
    monkeypatch.setattr(config, "MESSAGES_PER_MINUTE", 2)
    for _ in range(2):
        run(usage.acquire("u"))
        usage.release("u")
    with pytest.raises(usage.LimitExceeded, match="per minute") as exc:
        run(usage.acquire("u"))
    assert exc.value.retry_after and exc.value.retry_after > 0


def test_concurrency_limit_and_release():
    run(usage.acquire("u"))
    with pytest.raises(usage.LimitExceeded, match="still being generated"):
        run(usage.acquire("u"))
    usage.release("u")
    run(usage.acquire("u"))  # slot is free again


def test_users_are_independent():
    for _ in range(3):
        run(usage.acquire("a"))
        usage.release("a")
    run(usage.acquire("b"))
