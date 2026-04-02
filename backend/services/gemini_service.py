"""
Google Gemini Service
---------------------
Handles async communication with the Google Gemini generative AI API.
Uses the official google-generativeai SDK with a per-request API key.
"""

import asyncio
import google.generativeai as genai
from google.api_core.exceptions import InvalidArgument, PermissionDenied, DeadlineExceeded


async def get_gemini_response(prompt: str, api_key: str, timeout: int = 30) -> str:
    """
    Send a prompt to Google Gemini and return the response text.

    Args:
        prompt:  The user's prompt string.
        api_key: A valid Google Gemini API key.
        timeout: Maximum seconds to wait for a response (default 30).

    Returns:
        The model's reply as a plain string.

    Raises:
        ValueError:  If the API key is missing or invalid.
        TimeoutError: If the request exceeds the timeout.
        RuntimeError: For any other API / network error.
    """
    if not api_key or not api_key.strip():
        raise ValueError("No Gemini API key provided. Skipping.")

    try:
        # Configure the SDK with the provided key (module-level config)
        genai.configure(api_key=api_key)

        # Use the highly affordable Gemini 1.5 Flash model
        model = genai.GenerativeModel("gemini-1.5-flash")

        # The SDK is synchronous, so run it in a thread to stay async-friendly
        response = await asyncio.wait_for(
            asyncio.to_thread(model.generate_content, prompt),
            timeout=timeout,
        )

        return response.text.strip()

    except asyncio.TimeoutError:
        raise TimeoutError(
            f"Gemini request timed out after {timeout}s. Try a shorter prompt or increase the timeout."
        )
    except (PermissionDenied, InvalidArgument) as exc:
        raise ValueError(
            "Invalid Gemini API key or permission denied. Please check and try again."
        ) from exc
    except Exception as exc:
        raise RuntimeError(f"Unexpected error calling Gemini: {exc}") from exc
