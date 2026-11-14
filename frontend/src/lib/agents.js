/**
 * Display metadata for each agent. The backend's /agents endpoint is the
 * source of truth for labels and model IDs; this list provides colors and a
 * fallback when the backend can't be reached.
 */

export const AGENT_META = {
  gpt: { label: "GPT", vendor: "OpenAI", keyProvider: "openai", color: "#10b981" },
  claude: { label: "Claude", vendor: "Anthropic", keyProvider: "claude", color: "#e8875b" },
  gemini: { label: "Gemini", vendor: "Google", keyProvider: "gemini", color: "#a78bfa" },
  groq: { label: "Llama (Groq)", vendor: "Groq", keyProvider: "groq", color: "#fb923c" },
  deepseek: { label: "DeepSeek", vendor: "DeepSeek", keyProvider: "deepseek", color: "#60a5fa" },
  grok: { label: "Grok", vendor: "xAI", keyProvider: "grok", color: "#f87171" },
};

export const AGENT_IDS = Object.keys(AGENT_META);

export const DEFAULT_MAX_AGENTS = 3;

/** Merge backend agent info with local display metadata. */
export function mergeAgents(serverAgents) {
  const byId = Object.fromEntries((serverAgents || []).map((a) => [a.id, a]));
  return AGENT_IDS.map((id) => ({
    id,
    ...AGENT_META[id],
    ...(byId[id] ? { label: byId[id].label, vendor: byId[id].vendor, model: byId[id].model } : {}),
    hasStoredKey: !!byId[id]?.has_key,
  }));
}

/** The agents that answered (or failed) a stored conversation row. */
export function agentsInRow(row) {
  return AGENT_IDS.filter((id) => row[`${id}_response`] || row[`${id}_error`]);
}
