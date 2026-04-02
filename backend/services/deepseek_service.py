"""
Deepseek Service
-----------------
Handles API calls to Deepseek API (Chinese LLM provider).
Deepseek offers high-quality models optimized for various tasks.
"""

import os
import aiohttp
from dotenv import load_dotenv

# Load .env
dotenv_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
load_dotenv(dotenv_path)

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"


async def get_deepseek_response(prompt: str, api_key: str = "", history: list = None) -> str:
    """
    Call Deepseek API with the given prompt.
    
    Args:
        prompt: The user's prompt
        api_key: Optional API key override (use DEEPSEEK_API_KEY from .env if not provided)
        history: Optional conversation history
    
    Returns:
        The model's response text, or an error message
    """
    
    key = api_key.strip() or DEEPSEEK_API_KEY
    if not key:
        return "Error: Deepseek API key not configured"
    
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
            "Authorization": f"Bearer {key}",
        }
        
        payload = {
            "model": "deepseek-chat",
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 2000,
            "top_p": 1,
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                DEEPSEEK_API_URL,
                json=payload,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=60)
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    if "choices" in data and len(data["choices"]) > 0:
                        return data["choices"][0]["message"]["content"].strip()
                    else:
                        return "Error: Invalid response format from Deepseek"
                
                elif response.status == 401:
                    return "Error: Deepseek API key is invalid or expired"
                elif response.status == 429:
                    return "Error: Deepseek rate limit exceeded. Please try again later."
                else:
                    error_data = await response.json().catch(lambda: {})
                    error_msg = error_data.get("error", {}).get("message", f"HTTP {response.status}")
                    return f"Error: Deepseek API error - {error_msg}"
    
    except asyncio.TimeoutError:
        return "Error: Deepseek API request timed out"
    except Exception as e:
        return f"Error: {str(e)}"


# Import asyncio for timeout handling
import asyncio
