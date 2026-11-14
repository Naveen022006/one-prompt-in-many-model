"""
Runtime configuration
---------------------
All tunables are read from environment variables (the root `.env` file) so
model IDs, limits, and context budgets can change without code edits.
"""

import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))


def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


# ---- Usage limits -----------------------------------------------------------
# One "message" = one user prompt, no matter how many agents answer it.
DAILY_MESSAGE_LIMIT = _int("DAILY_MESSAGE_LIMIT", 50)
MESSAGES_PER_MINUTE = _int("MESSAGES_PER_MINUTE", 10)
MAX_CONCURRENT_STREAMS = _int("MAX_CONCURRENT_STREAMS", 2)
MAX_PROMPT_CHARS = _int("MAX_PROMPT_CHARS", 8000)
MAX_AGENTS_PER_MESSAGE = _int("MAX_AGENTS_PER_MESSAGE", 3)

# ---- Generation ---------------------------------------------------------------
MAX_OUTPUT_TOKENS = _int("MAX_OUTPUT_TOKENS", 2048)
REQUEST_TIMEOUT_SECONDS = _int("REQUEST_TIMEOUT_SECONDS", 90)

# Token budget for past conversation sent to each agent. Older turns are
# dropped once the budget is used up. This is deliberately smaller than the
# models' real context windows to keep cost per message predictable.
CONTEXT_TOKEN_BUDGET = _int("CONTEXT_TOKEN_BUDGET", 12000)

SYSTEM_PROMPT = os.getenv(
    "SYSTEM_PROMPT",
    "You are a helpful assistant in a multi-agent chat. Answer clearly and "
    "concisely. Use Markdown for structure and code.",
)

# ---- Model IDs (override in .env when providers release/retire models) ------
MODEL_IDS = {
    "gpt": os.getenv("OPENAI_MODEL", "gpt-5.4-mini"),
    "gemini": os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite"),
    "groq": os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
    "claude": os.getenv("CLAUDE_MODEL", "claude-haiku-4-5"),
    "deepseek": os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
    "grok": os.getenv("GROK_MODEL", "grok-4.3"),
}
