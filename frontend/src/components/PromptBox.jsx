/**
 * PromptBox Component
 * --------------------
 * Renders the input form: prompt textarea, API key fields, and submit button.
 * Lifts all state up via the onSubmit callback.
 */

import { useState } from "react";

export default function PromptBox({ onSubmit, isLoading }) {
  // Local form state
  const [prompt, setPrompt] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");

  /**
   * Handle form submission.
   * Validates that all fields are filled, then calls the parent handler.
   */
  const handleSubmit = (e) => {
    e.preventDefault();

    // Basic client-side validation
    if (!prompt.trim() || !openaiKey.trim() || !geminiKey.trim()) {
      alert("Please fill in all fields before submitting.");
      return;
    }

    onSubmit({
      prompt: prompt.trim(),
      openai_api_key: openaiKey.trim(),
      gemini_api_key: geminiKey.trim(),
    });
  };

  return (
    <section className="prompt-section">
      <form className="prompt-card" onSubmit={handleSubmit} id="prompt-form">
        {/* ---- API Key Row ---- */}
        <div className="input-row">
          <div className="input-group">
            <label className="input-label" htmlFor="openai-key">
              <span className="icon">🔑</span> OpenAI API Key
            </label>
            <input
              id="openai-key"
              className="text-input"
              type="password"
              placeholder="sk-..."
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="gemini-key">
              <span className="icon">🔑</span> Gemini API Key
            </label>
            <input
              id="gemini-key"
              className="text-input"
              type="password"
              placeholder="AIza..."
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>

        {/* ---- Prompt Textarea ---- */}
        <div className="input-group full">
          <label className="input-label" htmlFor="prompt-input">
            <span className="icon">💬</span> Your Prompt
          </label>
          <textarea
            id="prompt-input"
            className="prompt-textarea"
            placeholder="Ask anything… e.g. &quot;Explain quantum computing in simple terms&quot;"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
          />
        </div>

        {/* ---- Submit ---- */}
        <button
          id="submit-btn"
          className="submit-btn"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner" /> Generating…
            </>
          ) : (
            <>🚀 Ask All Models</>
          )}
        </button>
      </form>
    </section>
  );
}
