"""
Conversation context
--------------------
Turns stored conversation rows into the message list sent to one agent, and
trims old turns so the history fits the configured token budget.

Each stored row is one turn: the user's prompt plus the reply of every agent
that answered it (columns `<agent>_response`). Every agent keeps its own
thread. When an agent did not answer a turn (it was not selected or it
failed), another agent's reply is used so the conversation stays coherent,
labelled with the agent that wrote it.
"""

from __future__ import annotations

from dataclasses import dataclass

from services.llm_providers import AGENTS


def estimate_tokens(text: str | None) -> int:
    """Rough estimate: ~4 characters per token for English text."""
    return (len(text) + 3) // 4 if text else 0


def _assistant_text(turn: dict, agent_id: str) -> str | None:
    own = turn.get(f"{agent_id}_response")
    if own:
        return own
    for other_id, other in AGENTS.items():
        reply = turn.get(f"{other_id}_response")
        if other_id != agent_id and reply:
            return f"[Answer from {other.label}]\n{reply}"
    return None


@dataclass
class ContextResult:
    messages: list[dict]
    included_turns: int
    trimmed_turns: int
    history_tokens: int


def build_messages(turns: list[dict], agent_id: str, prompt: str, budget: int) -> ContextResult:
    """
    Build the message list for `agent_id`.

    turns:  past turns, oldest first.
    budget: max estimated tokens of past conversation to include.
    """
    pairs: list[tuple[str, str]] = []
    for turn in turns:
        user = turn.get("prompt")
        answer = _assistant_text(turn, agent_id)
        # Skip turns nobody answered so user/assistant roles keep alternating
        # (Anthropic and Gemini require it).
        if user and answer:
            pairs.append((user, answer))

    kept: list[tuple[str, str]] = []
    used = 0
    for user, answer in reversed(pairs):  # newest first
        cost = estimate_tokens(user) + estimate_tokens(answer)
        if used + cost > budget:
            break
        kept.append((user, answer))
        used += cost
    kept.reverse()

    messages: list[dict] = []
    for user, answer in kept:
        messages.append({"role": "user", "content": user})
        messages.append({"role": "assistant", "content": answer})
    messages.append({"role": "user", "content": prompt})

    return ContextResult(
        messages=messages,
        included_turns=len(kept),
        trimmed_turns=len(pairs) - len(kept),
        history_tokens=used,
    )
