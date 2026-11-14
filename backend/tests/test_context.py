from services.context import build_messages, estimate_tokens


def turn(prompt, **replies):
    return {"prompt": prompt, **{f"{k}_response": v for k, v in replies.items()}}


def test_uses_agents_own_replies_and_appends_prompt():
    turns = [turn("hi", gpt="hello from gpt", claude="hello from claude")]
    ctx = build_messages(turns, "claude", "next?", budget=10_000)
    assert ctx.messages == [
        {"role": "user", "content": "hi"},
        {"role": "assistant", "content": "hello from claude"},
        {"role": "user", "content": "next?"},
    ]
    assert ctx.included_turns == 1 and ctx.trimmed_turns == 0


def test_falls_back_to_another_agents_reply_with_label():
    turns = [turn("hi", gpt="hello from gpt")]
    ctx = build_messages(turns, "gemini", "next?", budget=10_000)
    assert ctx.messages[1]["role"] == "assistant"
    assert ctx.messages[1]["content"].startswith("[Answer from GPT]")


def test_skips_unanswered_turns_so_roles_alternate():
    turns = [turn("lost"), turn("hi", gpt="yo")]
    ctx = build_messages(turns, "gpt", "next", budget=10_000)
    roles = [m["role"] for m in ctx.messages]
    assert roles == ["user", "assistant", "user"]


def test_trims_oldest_turns_to_fit_budget():
    turns = [turn(f"q{i}", gpt="x" * 400) for i in range(5)]  # ~101 tokens each
    ctx = build_messages(turns, "gpt", "now", budget=250)
    assert ctx.included_turns == 2
    assert ctx.trimmed_turns == 3
    assert ctx.messages[0]["content"] == "q3"  # newest turns are kept
    assert ctx.history_tokens <= 250


def test_estimate_tokens():
    assert estimate_tokens("") == 0
    assert estimate_tokens("abcd") == 1
    assert estimate_tokens("abcde") == 2
