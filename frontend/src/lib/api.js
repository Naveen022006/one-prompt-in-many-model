/**
 * Backend API client
 * ------------------
 * Every request carries the Supabase access token so the backend can verify
 * who is calling. Configure the backend URL with VITE_API_URL in the root .env.
 */

import { supabase } from "./supabaseClient";

export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function authHeaders(extra = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

/** fetch() with the auth header. Throws ApiError on non-2xx responses. */
export async function apiFetch(path, { headers, ...options } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: await authHeaders({ "Content-Type": "application/json", ...headers }),
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new ApiError(`Cannot reach the server at ${API_URL}. Is the backend running?`, 0);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = body?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d) => d.msg).join("; ")
          : `Server returned ${res.status}`;
    throw new ApiError(message, res.status);
  }
  return res;
}

async function getJson(path, options) {
  const res = await apiFetch(path, options);
  return res.json();
}

// ---- Chats -----------------------------------------------------------------

export const listChats = () => getJson("/chats").then((d) => d.chats || []);
export const getChat = (id) => getJson(`/chats/${encodeURIComponent(id)}`);
export const deleteChat = (id) =>
  apiFetch(`/chats/${encodeURIComponent(id)}`, { method: "DELETE" });

// ---- Agents & usage --------------------------------------------------------

export const listAgents = () => getJson("/agents");
export const getUsage = () => getJson("/usage");

/**
 * Send a message and stream the agents' replies.
 * Calls onEvent for each NDJSON event (meta, delta, agent_done, done).
 * Resolves when the stream ends. Rejects with ApiError, or AbortError on stop.
 */
export async function streamChat(body, { onEvent, signal }) {
  const res = await apiFetch("/chat/stream", {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) onEvent(JSON.parse(line));
    }
  }
  const rest = buffer.trim();
  if (rest) onEvent(JSON.parse(rest));
}
