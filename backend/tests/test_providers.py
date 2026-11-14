"""Stream parsing for each wire format, using httpx.MockTransport (no network)."""

import asyncio
import json

import httpx
import pytest

from services import llm_providers
from services.llm_providers import ProviderError, complete_chat, stream_chat


def sse(*events):
    return "".join(f"data: {e if isinstance(e, str) else json.dumps(e)}\n\n" for e in events)


@pytest.fixture
def mock_http(monkeypatch):
    """Route all httpx.AsyncClient requests to a handler set by the test."""
    state = {}
    real = httpx.AsyncClient

    def factory(*args, **kwargs):
        kwargs["transport"] = httpx.MockTransport(lambda req: state["handler"](req))
        return real(*args, **kwargs)

    monkeypatch.setattr(llm_providers.httpx, "AsyncClient", factory)
    return state


def collect(agent, messages=None):
    async def go():
        return [t async for t in stream_chat(agent, "key", messages or [{"role": "user", "content": "hi"}])]
    return asyncio.run(go())


def test_openai_compatible_stream(mock_http):
    seen = {}

    def handler(req):
        seen["body"] = json.loads(req.content)
        seen["auth"] = req.headers["authorization"]
        body = sse({"choices": [{"delta": {"content": "Hel"}}]},
                   {"choices": [{"delta": {"content": "lo"}}]}, "[DONE]")
        return httpx.Response(200, text=body)

    mock_http["handler"] = handler
    assert collect("deepseek") == ["Hel", "lo"]
    assert seen["auth"] == "Bearer key"
    assert seen["body"]["messages"][0]["role"] == "system"
    assert seen["body"]["stream"] is True


def test_openai_uses_max_completion_tokens(mock_http):
    seen = {}

    def handler(req):
        seen["body"] = json.loads(req.content)
        return httpx.Response(200, text=sse("[DONE]"))

    mock_http["handler"] = handler
    collect("gpt")
    assert "max_completion_tokens" in seen["body"] and "max_tokens" not in seen["body"]


def test_anthropic_stream(mock_http):
    seen = {}

    def handler(req):
        seen["body"] = json.loads(req.content)
        return httpx.Response(200, text=sse(
            {"type": "message_start"},
            {"type": "content_block_delta", "delta": {"type": "text_delta", "text": "Hi"}},
            {"type": "content_block_delta", "delta": {"type": "text_delta", "text": "!"}},
            {"type": "message_stop"},
        ))

    mock_http["handler"] = handler
    assert collect("claude") == ["Hi", "!"]
    assert "system" in seen["body"]
    assert all(m["role"] != "system" for m in seen["body"]["messages"])


def test_gemini_stream_skips_thoughts_and_maps_roles(mock_http):
    seen = {}

    def handler(req):
        seen["body"] = json.loads(req.content)
        return httpx.Response(200, text=sse(
            {"candidates": [{"content": {"parts": [{"text": "thinking", "thought": True}]}}]},
            {"candidates": [{"content": {"parts": [{"text": "Answer"}]}}]},
        ))

    mock_http["handler"] = handler
    msgs = [{"role": "user", "content": "a"}, {"role": "assistant", "content": "b"}, {"role": "user", "content": "c"}]
    assert collect("gemini", msgs) == ["Answer"]
    assert [c["role"] for c in seen["body"]["contents"]] == ["user", "model", "user"]


@pytest.mark.parametrize("status,match", [(401, "rejected the API key"), (429, "rate limit"), (404, "not found")])
def test_http_errors_become_friendly_messages(mock_http, status, match):
    mock_http["handler"] = lambda req: httpx.Response(status, json={"error": {"message": "boom"}})
    with pytest.raises(ProviderError, match=match):
        collect("grok")


def test_missing_key():
    async def go():
        return [t async for t in stream_chat("gpt", "  ", [])]
    with pytest.raises(ProviderError, match="No OpenAI API key"):
        asyncio.run(go())


def test_complete_chat_rejects_empty(mock_http):
    mock_http["handler"] = lambda req: httpx.Response(200, text=sse("[DONE]"))
    with pytest.raises(ProviderError, match="empty"):
        asyncio.run(complete_chat("groq", "key", [{"role": "user", "content": "hi"}]))
