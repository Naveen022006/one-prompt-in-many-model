"""
Grok Service
-----------
Handles API calls to Grok API (xAI's AI model).
Grok is a large language model by Elon Musk's xAI that excels at reasoning and analysis.
"""

import os
import aiohttp
from dotenv import load_dotenv

# Load .env
dotenv_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
load_dotenv(dotenv_path)

GROK_API_KEY = os.getenv("GROK_API_KEY", "")
GROK_API_URL = "https://api.x.ai/v1/chat/completions"


async def get_grok_response(prompt: str, api_key: str = "", history: list = None) -> str:
    """
    Call Grok API with the given prompt.
    
    Args:
        prompt: The user's prompt
        api_key: Optional API key override (use GROK_API_KEY from .env if not provided)
        history: Optional conversation history
    
    Returns:
        The model's response text, or an error message
    """
    
    key = api_key.strip() or GROK_API_KEY
    if not key:
        return "Error: Grok API key not configured"
    
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
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }
        
        payload = {
            "model": "grok-beta",
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 2048,
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                GROK_API_URL,
                json=payload,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=60),
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    return f"Error: Grok API returned {response.status} - {error_text}"
                
                data = await response.json()
                
                # Extract response text from Grok API response
                if "choices" in data and len(data["choices"]) > 0:
                    return data["choices"][0]["message"]["content"]
                else:
                    return "Error: No response from Grok API"
    
    except aiohttp.ClientError as e:
        return f"Error: Grok API connection failed - {str(e)}"
    except Exception as e:
        return f"Error: Failed to process Grok response - {str(e)}"
