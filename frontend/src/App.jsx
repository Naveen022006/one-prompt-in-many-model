/**
 * App.jsx — Root Component
 * -------------------------
 * Orchestrates the PromptBox and ResponseBox components.
 * Handles the API call to the FastAPI backend.
 */

import { useState } from "react";
import PromptBox from "./components/PromptBox";
import ResponseBox from "./components/ResponseBox";
import "./App.css";

// Backend URL — change this if your backend runs elsewhere
const API_URL = "http://localhost:8000";

export default function App() {
  const [responses, setResponses] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Called when the user submits the prompt form.
   * Sends the data to FastAPI and updates state with the result.
   */
  const handleSubmit = async (formData) => {
    setIsLoading(true);
    setResponses(null); // Clear previous responses

    try {
      const res = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        // Try to extract a detail message from FastAPI's error response
        const errorBody = await res.json().catch(() => null);
        const detail = errorBody?.detail || `Server returned ${res.status}`;
        throw new Error(detail);
      }

      const data = await res.json();
      setResponses(data);
    } catch (err) {
      // If the entire request fails (network error, etc.), show error on both cards
      setResponses({
        gpt: { text: null, error: err.message },
        gemini: { text: null, error: err.message },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      {/* ---- Header ---- */}
      <header className="app-header">
        <div className="header-badge">
          <span className="dot" />
          Multi-Model AI Aggregator
        </div>
        <h1 className="app-title">One Prompt, Multiple Minds</h1>
        <p className="app-subtitle">
          Enter your prompt once and instantly compare responses from ChatGPT and
          Google Gemini — side by side.
        </p>
      </header>

      {/* ---- Main ---- */}
      <main className="app-main">
        <PromptBox onSubmit={handleSubmit} isLoading={isLoading} />
        <ResponseBox responses={responses} />
      </main>

      {/* ---- Footer ---- */}
      <footer className="app-footer">
        Built with <span>♥</span> using React + FastAPI &mdash; AI Multi-Model
        Aggregator MVP
      </footer>
    </div>
  );
}
