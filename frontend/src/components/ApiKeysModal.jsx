/**
 * ApiKeysModal Component
 * -----------------------
 * Modal for configuring API keys. Now integrates with Supabase via backend:
 *   - On open: loads saved keys from backend
 *   - On save: persists keys to backend AND updates local state
 */

import { useState, useEffect } from "react";
import { fetchApiKeys, saveApiKey } from "../lib/supabaseHelper";

export default function ApiKeysModal({ keys, onSave, onClose, userId }) {
  const [openaiKey, setOpenaiKey] = useState(keys.openai_api_key || "");
  const [geminiKey, setGeminiKey] = useState(keys.gemini_api_key || "");
  const [groqKey, setGroqKey] = useState(keys.groq_api_key || "");
  const [claudeKey, setClaudeKey] = useState(keys.claude_api_key || "");
  const [deepseekKey, setDeepseekKey] = useState(keys.deepseek_api_key || "");
  const [grokKey, setGrokKey] = useState(keys.grok_api_key || "");
  const [showOpenai, setShowOpenai] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const [showGroq, setShowGroq] = useState(false);
  const [showClaude, setShowClaude] = useState(false);
  const [showDeepseek, setShowDeepseek] = useState(false);
  const [showGrok, setShowGrok] = useState(false);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [saveStatus, setSaveStatus] = useState(""); // "", "saving", "saved"

  // Load saved keys from backend on mount
  useEffect(() => {
    async function loadKeys() {
      setIsLoadingKeys(true);
      const saved = await fetchApiKeys(userId);
      if (saved.openai) setOpenaiKey(saved.openai);
      if (saved.gemini) setGeminiKey(saved.gemini);
      if (saved.groq) setGroqKey(saved.groq);
      if (saved.claude) setClaudeKey(saved.claude);
      if (saved.deepseek) setDeepseekKey(saved.deepseek);
      if (saved.grok) setGrokKey(saved.grok);
      setIsLoadingKeys(false);
    }
    if (userId) loadKeys();
    else setIsLoadingKeys(false);
  }, [userId]);

  const handleSave = async () => {
    setSaveStatus("saving");

    // Save to backend (Supabase)
    if (userId) {
      const promises = [];
      if (openaiKey.trim()) {
        promises.push(saveApiKey(userId, "openai", openaiKey.trim()));
      }
      if (geminiKey.trim()) {
        promises.push(saveApiKey(userId, "gemini", geminiKey.trim()));
      }
      if (groqKey.trim()) {
        promises.push(saveApiKey(userId, "groq", groqKey.trim()));
      }
      if (claudeKey.trim()) {
        promises.push(saveApiKey(userId, "claude", claudeKey.trim()));
      }
      if (deepseekKey.trim()) {
        promises.push(saveApiKey(userId, "deepseek", deepseekKey.trim()));
      }
      if (grokKey.trim()) {
        promises.push(saveApiKey(userId, "grok", grokKey.trim()));
      }
      await Promise.all(promises);
    }

    // Update local state in App.jsx
    onSave({
      openai_api_key: openaiKey.trim(),
      gemini_api_key: geminiKey.trim(),
      groq_api_key: groqKey.trim(),
      claude_api_key: claudeKey.trim(),
      deepseek_api_key: deepseekKey.trim(),
      grok_api_key: grokKey.trim(),
    });

    setSaveStatus("saved");
    setTimeout(() => onClose(), 600); // Brief "saved" feedback before closing
  };

  // Close on overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal" role="dialog" aria-labelledby="modal-title">
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-label">Connectivity</div>
            <h2 className="modal-title" id="modal-title">API Configuration</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        <p className="modal-description">
          Integrate third-party LLM providers. Your keys are saved securely to
          Supabase and loaded automatically on your next visit.
        </p>

        {isLoadingKeys ? (
          <div className="api-keys-loading">
            <div className="api-key-card">
              <div className="skeleton" style={{ width: '100%', height: '40px' }} />
            </div>
            <div className="api-key-card">
              <div className="skeleton" style={{ width: '100%', height: '40px' }} />
            </div>
            <div className="api-key-card">
              <div className="skeleton" style={{ width: '100%', height: '40px' }} />
            </div>
          </div>
        ) : (
          <>
            {/* GPT / OpenAI */}
            <div className="api-key-card">
              <div className="api-key-icon gpt">⚡</div>
              <div className="api-key-info">
                <span className="api-key-name">GPT / OpenAI</span>
                <span className="api-key-desc">Default reasoning model</span>
              </div>
              <div className="api-key-input-wrapper">
                <input
                  id="modal-openai-key"
                  className="api-key-input"
                  type={showOpenai ? "text" : "password"}
                  placeholder="Enter OpenAI API Key"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  autoComplete="off"
                />
                <button
                  className="api-key-toggle"
                  onClick={() => setShowOpenai(!showOpenai)}
                  title={showOpenai ? "Hide key" : "Show key"}
                >
                  {showOpenai ? "🙈" : "👁️"}
                </button>
              </div>
              <span className={`api-key-status ${openaiKey.trim() ? 'active' : 'empty'}`}>
                {openaiKey.trim() ? 'Active' : 'Empty'}
              </span>
            </div>

            {/* Gemini / Google */}
            <div className="api-key-card">
              <div className="api-key-icon gemini">✦</div>
              <div className="api-key-info">
                <span className="api-key-name">Gemini / Google</span>
                <span className="api-key-desc">Multimodal vision support</span>
              </div>
              <div className="api-key-input-wrapper">
                <input
                  id="modal-gemini-key"
                  className="api-key-input"
                  type={showGemini ? "text" : "password"}
                  placeholder="Enter Gemini API Key"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  autoComplete="off"
                />
                <button
                  className="api-key-toggle"
                  onClick={() => setShowGemini(!showGemini)}
                  title={showGemini ? "Hide key" : "Show key"}
                >
                  {showGemini ? "🙈" : "👁️"}
                </button>
              </div>
              <span className={`api-key-status ${geminiKey.trim() ? 'active' : 'empty'}`}>
                {geminiKey.trim() ? 'Active' : 'Empty'}
              </span>
            </div>

            {/* Groq */}
            <div className="api-key-card">
              <div className="api-key-icon" style={{ background: "var(--orange-primary)", color: "#fff", padding: "0.4rem 0.5rem", borderRadius: "8px", fontWeight: "bold" }}>G</div>
              <div className="api-key-info">
                <span className="api-key-name">Groq</span>
                <span className="api-key-desc">Llama 3 ultra-fast inference</span>
              </div>
              <div className="api-key-input-wrapper">
                <input
                  id="modal-groq-key"
                  className="api-key-input"
                  type={showGroq ? "text" : "password"}
                  placeholder="Enter Groq API Key"
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                  autoComplete="off"
                />
                <button
                  className="api-key-toggle"
                  onClick={() => setShowGroq(!showGroq)}
                  title={showGroq ? "Hide key" : "Show key"}
                >
                  {showGroq ? "🙈" : "👁️"}
                </button>
              </div>
              <span className={`api-key-status ${groqKey.trim() ? 'active' : 'empty'}`}>
                {groqKey.trim() ? 'Active' : 'Empty'}
              </span>
            </div>

            {/* Claude / Anthropic */}
            <div className="api-key-card">
              <div className="api-key-icon" style={{ background: "var(--cyan-primary)", color: "#fff", padding: "0.4rem 0.5rem", borderRadius: "8px", fontWeight: "bold" }}>C</div>
              <div className="api-key-info">
                <span className="api-key-name">Claude / Anthropic</span>
                <span className="api-key-desc">Advanced reasoning & analysis</span>
              </div>
              <div className="api-key-input-wrapper">
                <input
                  id="modal-claude-key"
                  className="api-key-input"
                  type={showClaude ? "text" : "password"}
                  placeholder="Enter Claude API Key"
                  value={claudeKey}
                  onChange={(e) => setClaudeKey(e.target.value)}
                  autoComplete="off"
                />
                <button
                  className="api-key-toggle"
                  onClick={() => setShowClaude(!showClaude)}
                  title={showClaude ? "Hide key" : "Show key"}
                >
                  {showClaude ? "🙈" : "👁️"}
                </button>
              </div>
              <span className={`api-key-status ${claudeKey.trim() ? 'active' : 'empty'}`}>
                {claudeKey.trim() ? 'Active' : 'Empty'}
              </span>
            </div>

            {/* DeepSeek */}
            <div className="api-key-card">
              <div className="api-key-icon" style={{ background: "var(--blue-primary)", color: "#fff", padding: "0.4rem 0.5rem", borderRadius: "8px", fontWeight: "bold" }}>D</div>
              <div className="api-key-info">
                <span className="api-key-name">DeepSeek</span>
                <span className="api-key-desc">State-of-the-art reasoning</span>
              </div>
              <div className="api-key-input-wrapper">
                <input
                  id="modal-deepseek-key"
                  className="api-key-input"
                  type={showDeepseek ? "text" : "password"}
                  placeholder="Enter DeepSeek API Key"
                  value={deepseekKey}
                  onChange={(e) => setDeepseekKey(e.target.value)}
                  autoComplete="off"
                />
                <button
                  className="api-key-toggle"
                  onClick={() => setShowDeepseek(!showDeepseek)}
                  title={showDeepseek ? "Hide key" : "Show key"}
                >
                  {showDeepseek ? "🙈" : "👁️"}
                </button>
              </div>
              <span className={`api-key-status ${deepseekKey.trim() ? 'active' : 'empty'}`}>
                {deepseekKey.trim() ? 'Active' : 'Empty'}
              </span>
            </div>

            {/* Grok / xAI */}
            <div className="api-key-card">
              <div className="api-key-icon" style={{ background: "var(--red-primary)", color: "#fff", padding: "0.4rem 0.5rem", borderRadius: "8px", fontWeight: "bold" }}>G</div>
              <div className="api-key-info">
                <span className="api-key-name">Grok / xAI</span>
                <span className="api-key-desc">Advanced reasoning by Elon Musk's xAI</span>
              </div>
              <div className="api-key-input-wrapper">
                <input
                  id="modal-grok-key"
                  className="api-key-input"
                  type={showGrok ? "text" : "password"}
                  placeholder="Enter Grok API Key"
                  value={grokKey}
                  onChange={(e) => setGrokKey(e.target.value)}
                  autoComplete="off"
                />
                <button
                  className="api-key-toggle"
                  onClick={() => setShowGrok(!showGrok)}
                  title={showGrok ? "Hide key" : "Show key"}
                >
                  {showGrok ? "🙈" : "👁️"}
                </button>
              </div>
              <span className={`api-key-status ${grokKey.trim() ? 'active' : 'empty'}`}>
                {grokKey.trim() ? 'Active' : 'Empty'}
              </span>
            </div>
          </>
        )}

        {/* Save */}
        <button
          className="modal-save-btn"
          onClick={handleSave}
          id="modal-save-btn"
          disabled={isLoadingKeys || saveStatus === "saving"}
        >
          {saveStatus === "saving"
            ? "Saving…"
            : saveStatus === "saved"
            ? "✓ Saved!"
            : "Save Configuration"}
        </button>
      </div>
    </div>
  );
}
