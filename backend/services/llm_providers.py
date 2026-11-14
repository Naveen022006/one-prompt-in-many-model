"""
LLM Providers
-------------
One streaming interface for every supported agent:

    async for text_delta in stream_chat(agent_id, api_key, messages):
        ...

`messages` uses the OpenAI shape: [{"role": "user"|"assistant", "content": str}].
The system prompt is added here, in whatever form each provider expects.

OpenAI, Groq, DeepSeek and xAI share the OpenAI Chat Completions wire format.
Anthropic and Gemini have their own formats. Everything goes through httpx,
so no provider SDKs are needed.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import AsyncIterator

import httpx

import config


class ProviderError(Exception):
    """A user-facing error from a provider (safe to show in the UI)."""


@dataclass(frozen=True)
class Agent:
    id: str            # id used by the frontend and DB columns (gpt, gemini, ...)
    key_provider: str  # id used for the stored API key (openai, gemini, ...)
    label: str
    vendor: str
    kind: str          # "openai" | "anthropic" | "gemini"
    base_url: str = ""
    max_tokens_param: str = "max_tokens"

    @property
    def model(self) -> str:
        return config.MODEL_IDS[self.id]


AGENTS: dict[str, Agent] = {
    a.id: a
    for a in [
        Agent("gpt", "openai", "GPT", "OpenAI", "openai",
              "https://api.openai.com/v1", "max_completion_tokens"),
        Agent("claude", "claude", "Claude", "Anthropic", "anthropic"),
        Agent("gemini", "gemini", "Gemini", "Google", "gemini"),
        Agent("groq", "groq", "Llama (Groq)", "Groq", "openai",
              "https://api.groq.com/openai/v1", "max_completion_tokens"),
        Agent("deepseek", "deepseek", "DeepSeek", "DeepSeek", "openai",
              "https://api.deepseek.com"),
        Agent("grok", "grok", "Grok", "xAI", "openai",
              "https://api.x.ai/v1"),
    ]
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _timeout() -> httpx.Timeout:
    return httpx.Timeout(config.REQUEST_TIMEOUT_SECONDS, connect=10.0)


async def _raise_for_status(agent: Agent, resp: httpx.Response) -> None:
    if resp.status_code < 400:
        return
    body = (await resp.aread()).decode("utf-8", "replace")
    detail = ""
    try:
        data = json.loads(body)
        err = data.get("error") if isinstance(data, dict) else None
        if isinstance(err, dict):
            detail = err.get("message", "")
        elif isinstance(err, str):
            detail = err
        if not detail and isinstance(data, list) and data and isinstance(data[0], dict):
            detail = (data[0].get("error") or {}).get("message", "")
    except ValueError:
        detail = body[:300]

    code = resp.status_code
    if code in (401, 403):
        raise ProviderError(f"{agent.vendor} rejected the API key. Check it on the API Keys page.")
    if code == 429:
        raise ProviderError(f"{agent.vendor} rate limit or quota reached. Try again later.")
    if code == 404:
        raise ProviderError(
            f"{agent.vendor} model '{agent.model}' was not found. "
            f"Set a valid model ID in .env. {detail}".strip()
        )
    raise ProviderError(f"{agent.vendor} error {code}: {detail or 'request failed'}")


async def _sse_data(resp: httpx.Response) -> AsyncIterator[str]:
    """Yield the payload of each `data:` line in a server-sent event stream."""
    async for line in resp.aiter_lines():
        if line.startswith("data:"):
            yield line[5:].strip()


# ---------------------------------------------------------------------------
# Wire formats
# ---------------------------------------------------------------------------

async def _stream_openai(agent: Agent, key: str, messages: list[dict]) -> AsyncIterator[str]:
    payload = {
        "model": agent.model,
        "messages": [{"role": "system", "content": config.SYSTEM_PROMPT}, *messages],
        "stream": True,
        agent.max_tokens_param: config.MAX_OUTPUT_TOKENS,
    }
    headers = {"Authorization": f"Bearer {key}"}
    async with httpx.AsyncClient(timeout=_timeout()) as client:
        async with client.stream("POST", f"{agent.base_url}/chat/completions",
                                 json=payload, headers=headers) as resp:
            await _raise_for_status(agent, resp)
            async for data in _sse_data(resp):
                if data == "[DONE]":
                    break
                try:
                    chunk = json.loads(data)
                except ValueError:
                    continue
                if chunk.get("error"):
                    raise ProviderError(f"{agent.vendor}: {chunk['error'].get('message', 'stream error')}")
                for choice in chunk.get("choices") or []:
                    text = (choice.get("delta") or {}).get("content")
                    if text:
                        yield text


async def _stream_anthropic(agent: Agent, key: str, messages: list[dict]) -> AsyncIterator[str]:
    payload = {
        "model": agent.model,
        "system": config.SYSTEM_PROMPT,
        "messages": messages,
        "max_tokens": config.MAX_OUTPUT_TOKENS,
        "stream": True,
    }
    headers = {"x-api-key": key, "anthropic-version": "2023-06-01"}
    async with httpx.AsyncClient(timeout=_timeout()) as client:
        async with client.stream("POST", "https://api.anthropic.com/v1/messages",
                                 json=payload, headers=headers) as resp:
            await _raise_for_status(agent, resp)
            async for data in _sse_data(resp):
                try:
                    event = json.loads(data)
                except ValueError:
                    continue
                etype = event.get("type")
                if etype == "content_block_delta":
                    delta = event.get("delta") or {}
                    if delta.get("type") == "text_delta" and delta.get("text"):
                        yield delta["text"]
                elif etype == "error":
                    raise ProviderError(f"Anthropic: {(event.get('error') or {}).get('message', 'stream error')}")
                elif etype == "message_stop":
                    break


async def _stream_gemini(agent: Agent, key: str, messages: list[dict]) -> AsyncIterator[str]:
    contents = [
        {"role": "model" if m["role"] == "assistant" else "user", "parts": [{"text": m["content"]}]}
        for m in messages
    ]
    payload = {
        "contents": contents,
        "systemInstruction": {"parts": [{"text": config.SYSTEM_PROMPT}]},
        "generationConfig": {"maxOutputTokens": config.MAX_OUTPUT_TOKENS},
    }
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{agent.model}:streamGenerateContent?alt=sse"
    )
    async with httpx.AsyncClient(timeout=_timeout()) as client:
        async with client.stream("POST", url, json=payload,
                                 headers={"x-goog-api-key": key}) as resp:
            await _raise_for_status(agent, resp)
            async for data in _sse_data(resp):
                try:
                    chunk = json.loads(data)
                except ValueError:
                    continue
                for cand in chunk.get("candidates") or []:
                    for part in (cand.get("content") or {}).get("parts") or []:
                        # Skip "thought" parts from thinking models.
                        if part.get("text") and not part.get("thought"):
                            yield part["text"]
                block = (chunk.get("promptFeedback") or {}).get("blockReason")
                if block:
                    raise ProviderError(f"Gemini blocked the prompt ({block}).")


_STREAMERS = {
    "openai": _stream_openai,
    "anthropic": _stream_anthropic,
    "gemini": _stream_gemini,
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def stream_chat(agent_id: str, api_key: str, messages: list[dict]) -> AsyncIterator[str]:
    """Stream the reply of one agent as text deltas. Raises ProviderError."""
    agent = AGENTS.get(agent_id)
    if agent is None:
        raise ProviderError(f"Unknown agent '{agent_id}'.")
    key = (api_key or "").strip()
    if not key:
        raise ProviderError(f"No {agent.vendor} API key saved. Add one on the API Keys page.")

    try:
        async for text in _STREAMERS[agent.kind](agent, key, messages):
            yield text
    except ProviderError:
        raise
    except httpx.TimeoutException:
        raise ProviderError(f"{agent.vendor} timed out after {config.REQUEST_TIMEOUT_SECONDS}s.")
    except httpx.HTTPError as exc:
        raise ProviderError(f"Could not reach {agent.vendor}: {exc.__class__.__name__}.")


async def complete_chat(agent_id: str, api_key: str, messages: list[dict]) -> str:
    """Non-streaming convenience wrapper."""
    parts = [t async for t in stream_chat(agent_id, api_key, messages)]
    text = "".join(parts).strip()
    if not text:
        raise ProviderError("The model returned an empty response.")
    return text
