/**
 * API key and account helpers
 * ---------------------------
 * Thin wrappers around the backend endpoints. The frontend never talks to
 * the Supabase tables directly; all data flows through the FastAPI backend,
 * which checks the signed-in user's token.
 */

import { apiFetch } from "./api";

export const PROVIDERS = ["openai", "gemini", "groq", "claude", "deepseek", "grok"];

/**
 * Fetch saved API keys.
 * @returns {{ openai?: string, gemini?: string, groq?: string, claude?: string, deepseek?: string, grok?: string }}
 */
export async function fetchApiKeys(userId) {
  try {
    const res = await apiFetch(`/api-keys/${encodeURIComponent(userId)}`);
    const keys = (await res.json()).keys || {};
    return Object.fromEntries(PROVIDERS.map((p) => [p, keys[p] || null]));
  } catch (err) {
    console.warn("Could not fetch API keys:", err.message);
    return {};
  }
}

/** Save a single API key. Throws on failure so the UI can show it. */
export async function saveApiKey(userId, provider, apiKey) {
  await apiFetch("/api-keys", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, provider, api_key: apiKey }),
  });
}

/** Delete an API key. Throws on failure. */
export async function deleteApiKey(userId, provider) {
  await apiFetch(`/api-keys/${encodeURIComponent(userId)}/${provider}`, { method: "DELETE" });
}

/** Delete all data of the signed-in user. */
export async function deleteAccountData(userId, password) {
  await apiFetch("/delete-account", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, password }),
  });
}

/** Move data created under a pre-login local id to the signed-in user. */
export async function migrateLocalData(oldId, newId) {
  await apiFetch("/migrate", {
    method: "POST",
    body: JSON.stringify({ old_id: oldId, new_id: newId }),
  });
}
