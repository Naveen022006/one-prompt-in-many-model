/**
 * PromptBox Component
 * --------------------
 * Redesigned to match the AI Hub reference — minimal prompt input area
 * with model chips and a "Generate Response" button.
 */

import { useState, useRef, useEffect } from "react";

export default function PromptBox({ onSubmit, isLoading, hasKeys, reusedPrompt }) {
  const [prompt, setPrompt] = useState("");
  const textareaRef = useRef(null);

  // Pre-fill prompt when reusing from history
  useEffect(() => {
    if (reusedPrompt) setPrompt(reusedPrompt);
  }, [reusedPrompt]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "24px";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    }
  }, [prompt]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!prompt.trim()) {
      alert("Please enter a prompt.");
      return;
    }

    if (!hasKeys) {
      alert("Please configure your API keys first (click 'API Keys' in the top bar).");
      return;
    }
    onSubmit(prompt.trim());
    setPrompt(""); // Clear the input field after submitting
  };

  // Submit on Enter (Shift+Enter for newline)
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <section className="prompt-area">
      <form onSubmit={handleSubmit} id="prompt-form">
        {/* Prompt Input */}
        <div className="prompt-input-wrapper">
          <span className="prompt-input-icon">✦</span>
          <textarea
            ref={textareaRef}
            id="prompt-input"
            className="prompt-textarea"
            placeholder="Ask anything..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
        </div>

        {/* Controls Row */}
        <div className="prompt-controls">
          {/* Model Chips */}
          <div className="model-chips">
            <span className="model-chip active">GPT-4o Mini</span>
            <span className="model-chip active-purple">Gemini 1.5 Flash</span>
            <span className="model-chip active-orange">Llama 3 (Groq)</span>
          </div>

          {/* Generate Button */}
          <button
            id="generate-btn"
            className="generate-btn"
            type="submit"
            disabled={isLoading || !prompt.trim()}
          >
            {isLoading ? (
              <>
                <span className="spinner" />
                Processing…
              </>
            ) : (
              <>
                Generate Response <span className="btn-icon">⚡</span>
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
