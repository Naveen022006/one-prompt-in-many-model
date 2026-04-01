"""
OpenAI GPT Service
-------------------
Handles async communication with the OpenAI Chat Completions API.
Uses the official openai Python SDK with a per-request API key.
"""

import asyncio
from openai import AsyncOpenAI, APIError, AuthenticationError, APITimeoutError


async def get_gpt_response(prompt: str, api_key: str, timeout: int = 30) -> str:
    """
    Send a prompt to OpenAI GPT and return the response text.

    Args:
        prompt:  The user's prompt string.
        api_key: A valid OpenAI API key.
        timeout: Maximum seconds to wait for a response (default 30).

    Returns:
        The assistant's reply as a plain string.

    Raises:
        ValueError:  If the API key is invalid.
        TimeoutError: If the request exceeds the timeout.
        RuntimeError: For any other API / network error.
    """
    try:
        # Create a client scoped to this single request
        client = AsyncOpenAI(api_key=api_key, timeout=timeout)

        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant. Provide clear, concise answers.",
                },
                {"role": "user", "content": prompt},
            ],
            max_tokens=1024,
            temperature=0.7,
        )

        # Extract the text from the first choice
        return response.choices[0].message.content.strip()

    except AuthenticationError:
        raise ValueError("Invalid OpenAI API key. Please check and try again.")
    except APITimeoutError:
        raise TimeoutError(
            f"OpenAI request timed out after {timeout}s. Try a shorter prompt or increase the timeout."
        )
    except APIError as exc:
        raise RuntimeError(f"OpenAI API error: {exc.message}") from exc
    except Exception as exc:
        raise RuntimeError(f"Unexpected error calling OpenAI: {exc}") from exc
