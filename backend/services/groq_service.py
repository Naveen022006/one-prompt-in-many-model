"""
Groq Service
-------------
Handles async communication with the Groq API for ultra-fast completions.
Uses the official groq Python SDK with a per-request API key.
"""

import asyncio
from groq import AsyncGroq, APIError, AuthenticationError, APITimeoutError


async def get_groq_response(prompt: str, api_key: str, history: list = None, timeout: int = 30) -> str:
    """
    Send a prompt to Groq (using llama-3.1-8b-instant) and return the response text.

    Args:
        prompt:  The user's prompt string.
        api_key: A valid Groq API key.
        history: Optional list of previous messages `[{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]`
        timeout: Maximum seconds to wait for a response (default 30).

    Returns:
        The model's reply as a plain string.

    Raises:
        ValueError:  If the API key is missing or invalid.
        TimeoutError: If the request exceeds the timeout.
        RuntimeError: For any other API / network error.
    """
    if not api_key or not api_key.strip():
        raise ValueError("No Groq API key provided. Skipping.")

    try:
        # Create a client scoped to this single request
        client = AsyncGroq(api_key=api_key.strip(), timeout=timeout)

        messages = [
            {
                "role": "system",
                "content": "You are a helpful assistant. Provide clear, concise answers.",
            }
        ]
        if history:
            for msg in history:
                messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": prompt})

        # Llama 3.1 8B Instant is Groq's current recommended fast model
        response = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            max_tokens=1024,
            temperature=0.7,
        )

        return response.choices[0].message.content.strip()

    except AuthenticationError:
        raise ValueError("Invalid Groq API key. Please check and try again.")
    except APITimeoutError:
        raise TimeoutError(
            f"Groq request timed out after {timeout}s. Try a shorter prompt or increase the timeout."
        )
    except APIError as exc:
        raise RuntimeError(f"Groq API error: {exc.message}") from exc
    except Exception as exc:
        raise RuntimeError(f"Unexpected error calling Groq: {exc}") from exc
