"""
Claude Service
-----------------
Handles API calls to Anthropic's Claude API.
Claude offers state-of-the-art reasoning and instruction-following.
"""

import os
import aiohttp
import asyncio
from dotenv import load_dotenv

# Load .env
dotenv_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
load_dotenv(dotenv_path)

CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY", "")
CLAUDE_API_URL = "https://api.anthropic.com/v1/messages"


async def get_claude_response(prompt: str, api_key: str = "", history: list = None) -> str:
    """
    Call Claude API with the given prompt.
    
    Args:
        prompt: The user's prompt
        api_key: Optional API key override (use CLAUDE_API_KEY from .env if not provided)
        history: Optional conversation history
    
    Returns:
        The model's response text, or an error message
    """
    
    key = api_key.strip() or CLAUDE_API_KEY
    if not key:
        return "Error: Claude API key not configured"
    
    if not prompt.strip():
        return "Error: Empty prompt"
    
    try:
        messages = []
        
        # Add conversation history
        if history:
            messages.extend(history)
        
        # Add current prompt
        messages.append({"role": "user", "content": prompt})
        
        headers = {
            "Content-Type": "application/json",
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
        }
        
        payload = {
            "model": "claude-3-5-sonnet-20241022",
            "max_tokens": 2000,
            "messages": messages,
            "temperature": 0.7,
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                CLAUDE_API_URL,
                json=payload,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=60)
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    if "content" in data and len(data["content"]) > 0:
                        return data["content"][0]["text"].strip()
                    else:
                        return "Error: Invalid response format from Claude"
                
                elif response.status == 401:
                    return "Error: Claude API key is invalid or expired"
                elif response.status == 429:
                    return "Error: Claude rate limit exceeded. Please try again later."
                else:
                    error_data = await response.json().catch(lambda: {})
                    error_msg = error_data.get("error", {}).get("message", f"HTTP {response.status}")
                    return f"Error: Claude API error - {error_msg}"
    
    except asyncio.TimeoutError:
        return "Error: Claude API request timed out"
    except Exception as e:
        return f"Error: {str(e)}"
