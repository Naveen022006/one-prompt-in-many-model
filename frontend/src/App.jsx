/**
 * App.jsx — Root Component
 * -------------------------
 * Orchestrates the full dashboard layout with Supabase integration:
 *   - Auto-loads saved API keys on startup
 *   - Passes userId to all API calls for persistence
 *   - Routes between Dashboard and History pages
 */

import { useState, useCallback, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import TopNav from "./components/TopNav";
import PromptBox from "./components/PromptBox";
import ResponseCard from "./components/ResponseCard";
import BestAnswer from "./components/BestAnswer";
import ApiKeysModal from "./components/ApiKeysModal";
import HistoryPage from "./components/HistoryPage";
import {
  getUserId,
  fetchApiKeys,
  fetchHistory,
  deleteConversation,
} from "./lib/supabaseHelper";
import "./App.css";

// Backend URL — change this if your backend runs elsewhere
const API_URL = "http://localhost:8000";

export default function App() {
  // ---- State ----
  const [userId] = useState(() => getUserId()); // Persistent UUID
  const [activePage, setActivePage] = useState("dashboard");
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [apiKeys, setApiKeys] = useState({ openai_api_key: "", gemini_api_key: "", groq_api_key: "" });
  const [responses, setResponses] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [promptToReuse, setPromptToReuse] = useState("");

  // Check if AT LEAST ONE key is configured
  const hasKeys = !!(apiKeys.openai_api_key?.trim() || apiKeys.gemini_api_key?.trim() || apiKeys.groq_api_key?.trim());

  // ---- Auto-load saved API keys on startup ----
  useEffect(() => {
    async function loadSavedKeys() {
      const saved = await fetchApiKeys(userId);
      if (saved.openai || saved.gemini || saved.groq) {
        setApiKeys({
          openai_api_key: saved.openai || "",
          gemini_api_key: saved.gemini || "",
          groq_api_key: saved.groq || "",
        });
      }
    }
    loadSavedKeys();
  }, [userId]);

  // ---- Load history when navigating to History page ----
  useEffect(() => {
    if (activePage === "history") {
      loadHistory();
    }
  }, [activePage]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    const convs = await fetchHistory(userId);
    setHistory(convs);
    setHistoryLoading(false);
  };

  /**
   * Handle "New Prompt" — clears responses and goes to dashboard.
   */
  const handleNewPrompt = useCallback(() => {
    setResponses(null);
    setPromptToReuse("");
    setActivePage("dashboard");
    setTimeout(() => {
      const input = document.getElementById("prompt-input");
      if (input) input.focus();
    }, 100);
  }, []);

  /**
   * Handle prompt submission — calls the FastAPI backend.
   * Now sends userId so conversations are auto-saved.
   */
  const handleSubmit = useCallback(
    async (prompt) => {
      setIsLoading(true);
      setResponses(null);
      setPromptToReuse(""); // Clear reuse after submitting

      try {
        const res = await fetch(`${API_URL}/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            openai_api_key: apiKeys.openai_api_key,
            gemini_api_key: apiKeys.gemini_api_key,
            groq_api_key: apiKeys.groq_api_key, // Include groq key
            user_id: userId, // Include user ID for auto-save
          }),
        });

        if (!res.ok) {
          const errorBody = await res.json().catch(() => null);
          const detail = errorBody?.detail || `Server returned ${res.status}`;
          throw new Error(detail);
        }

        const data = await res.json();
        setResponses(data);
      } catch (err) {
        setResponses({
          gpt: { text: null, error: err.message },
          gemini: { text: null, error: err.message },
          groq: { text: null, error: err.message },
        });
      } finally {
        setIsLoading(false);
      }
    },
    [apiKeys, userId]
  );

  /**
   * Handle deleting a conversation from history.
   */
  const handleDeleteConversation = async (conversationId) => {
    await deleteConversation(userId, conversationId);
    setHistory((prev) => prev.filter((c) => c.id !== conversationId));
  };

  /**
   * Handle reusing a prompt from history — navigate to dashboard with pre-filled prompt.
   */
  const handleReusePrompt = (prompt) => {
    setPromptToReuse(prompt);
    setActivePage("dashboard");
    setTimeout(() => {
      const input = document.getElementById("prompt-input");
      if (input) input.focus();
    }, 100);
  };

  return (
    <div className="app-layout">
      {/* ---- Sidebar ---- */}
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        onNewPrompt={handleNewPrompt}
      />

      {/* ---- Main Content ---- */}
      <div className="main-content">
        <TopNav
          activePage={activePage}
          onOpenApiKeys={() => setShowApiKeys(true)}
        />

        <div className="page-content">
          {activePage === "dashboard" && (
            <>
              {/* ---- Hero ---- */}
              <div className="dashboard-hero">
                <div className="hero-label">Neural Synthesis Engine</div>
                <h1 className="hero-title">
                  What shall we<br />
                  curate <span className="gradient-word">today?</span>
                </h1>
              </div>

              {/* ---- Prompt Input ---- */}
              <PromptBox
                onSubmit={handleSubmit}
                isLoading={isLoading}
                hasKeys={hasKeys}
                reusedPrompt={promptToReuse}
              />

              {/* ---- Comparative Analysis ---- */}
              {(responses || isLoading) && (
                <section className="analysis-section">
                  <div className="section-header">
                    <h2 className="section-title">Comparative Analysis</h2>
                    <div className="section-status">
                      <span className={`status-dot ${isLoading ? '' : 'inactive'}`} />
                      {isLoading ? "Real-time processing active" : "Processing complete"}
                    </div>
                  </div>

                  <div className="response-grid">
                    <ResponseCard
                      modelName="GPT-4o Mini"
                      provider="OpenAI"
                      badge="Best Reasoning"
                      badgeClass="best-reasoning"
                      dotColor="cyan"
                      response={responses?.gpt}
                      isLoading={isLoading}
                    />
                    <ResponseCard
                      modelName="Gemini 1.5 Flash"
                      provider="Google DeepMind"
                      badge="Fastest"
                      badgeClass="fastest"
                      dotColor="green"
                      response={responses?.gemini}
                      isLoading={isLoading}
                    />
                    <ResponseCard
                      modelName="Llama 3 (Groq)"
                      provider="Groq"
                      badge="Ultra-Fast"
                      badgeClass="best-reasoning" /* Reusing class for color */
                      dotColor="orange"
                      response={responses?.groq}
                      isLoading={isLoading}
                    />
                  </div>

                  {/* ---- Best Combined Answer ---- */}
                  {!isLoading && responses && (
                    <BestAnswer
                      gptResponse={responses.gpt}
                      geminiResponse={responses.gemini}
                      groqResponse={responses.groq}
                    />
                  )}
                </section>
              )}
            </>
          )}

          {activePage === "history" && (
            <HistoryPage
              conversations={history}
              onDelete={handleDeleteConversation}
              onReuse={handleReusePrompt}
              isLoading={historyLoading}
            />
          )}

          {/* Placeholder pages for other nav items */}
          {activePage === "saved" && (
            <div className="placeholder-page">
              <div className="hero-label">Curation</div>
              <h1 className="history-title">Saved Responses</h1>
              <p className="history-subtitle">
                Your personal library of optimized AI outputs. Coming soon.
              </p>
            </div>
          )}

          {activePage === "navigation" && (
            <div className="placeholder-page">
              <div className="hero-label">System</div>
              <h1 className="history-title">Navigation</h1>
              <p className="history-subtitle">
                System navigation and workspace settings. Coming soon.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ---- API Keys Modal ---- */}
      {showApiKeys && (
        <ApiKeysModal
          keys={apiKeys}
          onSave={setApiKeys}
          onClose={() => setShowApiKeys(false)}
          userId={userId}
        />
      )}
    </div>
  );
}
