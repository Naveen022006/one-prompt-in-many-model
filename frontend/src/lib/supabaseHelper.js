/**
 * Supabase Helper — Frontend utility module
 * -------------------------------------------
 * Manages user identity (UUID in localStorage) and provides
 * helper functions to call the backend's Supabase-backed endpoints.
 *
 * Important: The frontend NEVER talks to Supabase directly.
 * All data flows through the FastAPI backend.
 */

const API_URL = "http://localhost:8000";
const USER_ID_KEY = "ai_hub_user_id";

// ---------------------------------------------------------------------------
// User Identity
// ---------------------------------------------------------------------------

/**
 * Get or create a persistent user ID.
 * Stored in localStorage so it survives page refreshes.
 */
export function getUserId() {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = crypto.randomUUID(); // Built-in in modern browsers
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

// ---------------------------------------------------------------------------
// API Keys
// ---------------------------------------------------------------------------

/**
 * Fetch saved API keys from the backend.
 * @returns {{ openai?: string, gemini?: string }}
 */
export async function fetchApiKeys(userId) {
  try {
    const res = await fetch(`${API_URL}/api-keys/${userId}`);
    if (!res.ok) return {};
    const data = await res.json();
    return data.keys || {};
  } catch {
    console.warn("Could not fetch API keys from backend");
    return {};
  }
}

/**
 * Save a single API key to the backend.
 * @param {string} userId
 * @param {"openai"|"gemini"} provider
 * @param {string} apiKey
 */
export async function saveApiKey(userId, provider, apiKey) {
  try {
    await fetch(`${API_URL}/api-keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, provider, api_key: apiKey }),
    });
  } catch {
    console.warn(`Could not save ${provider} API key`);
  }
}

/**
 * Delete an API key from the backend.
 */
export async function deleteApiKey(userId, provider) {
  try {
    await fetch(`${API_URL}/api-keys/${userId}/${provider}`, {
      method: "DELETE",
    });
  } catch {
    console.warn(`Could not delete ${provider} API key`);
  }
}

// ---------------------------------------------------------------------------
// Conversation History
// ---------------------------------------------------------------------------

/**
 * Fetch conversation history (newest first).
 * @returns {Array<Object>}
 */
export async function fetchHistory(userId, limit = 50) {
  try {
    const res = await fetch(`${API_URL}/history/${userId}?limit=${limit}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.conversations || [];
  } catch {
    console.warn("Could not fetch history from backend");
    return [];
  }
}

/**
 * Delete a conversation from history.
 */
export async function deleteConversation(userId, conversationId) {
  try {
    await fetch(`${API_URL}/history/${userId}/${conversationId}`, {
      method: "DELETE",
    });
  } catch {
    console.warn("Could not delete conversation");
  }
}
