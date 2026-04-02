/**
 * App.jsx — Root Component
 * -------------------------
 * Orchestrates the full dashboard layout with Supabase integration:
 *   - Authenticates user via Supabase Auth
 *   - Auto-loads saved API keys on startup
 *   - Passes userId to all API calls for persistence
 *   - Routes between Dashboard and History pages
 */

import { useState, useCallback, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import TopNav from "./components/TopNav";
import PromptBox from "./components/PromptBox";
import ResponseCard from "./components/ResponseCard";
import ApiKeysModal from "./components/ApiKeysModal";
import HistoryPage from "./components/HistoryPage";
import AuthPage from "./components/AuthPage";
import { supabase } from "./lib/supabaseClient";
import {
  fetchApiKeys,
  fetchHistory,
  deleteConversation,
} from "./lib/supabaseHelper";
import "./App.css";

// Backend URL — change this if your backend runs elsewhere
const API_URL = "http://localhost:8000";

export default function App() {
  // ---- Auth State ----
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ---- App State ----
  const [activePage, setActivePage] = useState("dashboard");
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [apiKeys, setApiKeys] = useState({ openai_api_key: "", gemini_api_key: "", groq_api_key: "" });
  const [activeChat, setActiveChat] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState("");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [promptToReuse, setPromptToReuse] = useState("");

  const userId = session?.user?.id;
  const userEmail = session?.user?.email;
  const chatEndRef = useRef(null);

  // Check if AT LEAST ONE key is configured
  const hasKeys = !!(apiKeys.openai_api_key?.trim() || apiKeys.gemini_api_key?.trim() || apiKeys.groq_api_key?.trim());

  // ---- Initialize Auth ----
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ---- Auto-load saved API keys on startup (only if logged in) ----
  useEffect(() => {
    async function loadSavedKeys() {
      if (!userId) return;
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
    if (activePage === "history" && userId) {
      loadHistory();
    }
  }, [activePage, userId]);

  // ---- Auto-scroll chat feed to bottom on new messages ----
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeChat]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    const convs = await fetchHistory(userId);
    setHistory(convs);
    setHistoryLoading(false);
  };

  /**
   * Called when AuthPage completes login/signup
   */
  const handleLoginComplete = async (newSession, oldLocalStorageId) => {
    setSession(newSession);
    const newUserId = newSession?.user?.id;
    if (newUserId && oldLocalStorageId && oldLocalStorageId !== newUserId) {
      try {
        console.log("Migrating past local history to new authenticated account...");
        await fetch(`${API_URL}/migrate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ old_id: oldLocalStorageId, new_id: newUserId }),
        });
        localStorage.removeItem("ai_hub_user_id"); // Clear after migration
      } catch (e) {
        console.error("Failed to migrate history", e);
      }
    }
  };

  /**
   * Handle "New Prompt" — clears responses and goes to dashboard.
   */
  const handleNewPrompt = useCallback(() => {
    setActiveChat([]);
    setCurrentSessionId(crypto.randomUUID());
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
      // Ensure we have a session ID
      const sessionIdToSend = currentSessionId || crypto.randomUUID();
      if (!currentSessionId) setCurrentSessionId(sessionIdToSend);

      // Append a loading turn to the chat
      setActiveChat((prev) => [...prev, { prompt, isLoading: true, responses: null }]);
      setPromptToReuse(""); // Clear reuse after submitting

      try {
        const historyPayload = activeChat.map((turn) => ({
          prompt: turn.prompt,
          gpt_response: turn.responses?.gpt?.text,
          gemini_response: turn.responses?.gemini?.text,
          groq_response: turn.responses?.groq?.text,
        }));

        const res = await fetch(`${API_URL}/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            history: historyPayload,
            openai_api_key: apiKeys.openai_api_key,
            gemini_api_key: apiKeys.gemini_api_key,
            groq_api_key: apiKeys.groq_api_key,
            user_id: userId,
            session_id: sessionIdToSend,
          }),
        });

        if (!res.ok) {
          const errorBody = await res.json().catch(() => null);
          const detail = errorBody?.detail || `Server returned ${res.status}`;
          throw new Error(detail);
        }

        const data = await res.json();
        
        // Update the last turn with the response
        setActiveChat((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], isLoading: false, responses: data };
          return updated;
        });
      } catch (err) {
        // Update the last turn with error
        setActiveChat((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            isLoading: false,
            responses: {
              gpt: { text: null, error: err.message },
              gemini: { text: null, error: err.message },
              groq: { text: null, error: err.message },
            },
          };
          return updated;
        });
      }
    },
    [apiKeys, userId, activeChat]
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

  /**
   * Handle continuing a past conversation thread.
   */
  const handleContinueChat = (threadTurns) => {
    // threadTurns is an array of conversation turns from oldest to newest in a given session
    const historicalChat = threadTurns.map(conv => ({
      prompt: conv.prompt,
      isLoading: false,
      responses: {
        gpt: { text: conv.gpt_response, error: conv.gpt_error },
        gemini: { text: conv.gemini_response, error: conv.gemini_error },
        groq: { text: conv.groq_response, error: conv.groq_error },
      },
    }));
    setActiveChat(historicalChat);
    
    // Set the session ID so future prompts append to the same thread in DB
    const lastTurn = threadTurns[threadTurns.length - 1];
    setCurrentSessionId(lastTurn.session_id || lastTurn.id);
    
    setPromptToReuse(""); 
    setActivePage("dashboard");
    setTimeout(() => {
      const input = document.getElementById("prompt-input");
      if (input) input.focus();
    }, 100);
  };

  /**
   * Handle global signs out
   */
  const handleLogOut = async () => {
    await supabase.auth.signOut();
    setApiKeys({ openai_api_key: "", gemini_api_key: "", groq_api_key: "" });
    setActiveChat([]);
    setCurrentSessionId("");
    setHistory([]);
  };

  // ---- Conditional Rendering based on Auth ----

  if (authLoading) {
    return (
      <div className="app-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="status-dot"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="app-layout">
        <AuthPage onLoginComplete={handleLoginComplete} />
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* ---- Sidebar ---- */}
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        onNewPrompt={handleNewPrompt}
        onSignOut={handleLogOut}  // Passed down to allow sidebar logout
      />

      {/* ---- Main Content ---- */}
      <div className="main-content">
        <TopNav
          activePage={activePage}
          onOpenApiKeys={() => setShowApiKeys(true)}
          onNavigate={setActivePage}
          userEmail={userEmail}
        />

        <div className="page-content">
          {activePage === "dashboard" && (
            <>
              {/* ---- Hero (only show if no chat) ---- */}
              {activeChat.length === 0 && (
                <div className="dashboard-hero">
                  <div className="hero-label">Neural Synthesis Engine</div>
                  <h1 className="hero-title">
                    What shall we<br />
                    curate <span className="gradient-word">today?</span>
                  </h1>
                </div>
              )}

              {/* ---- Chat Feed ---- */}
              {activeChat.length > 0 && (
                <div className="chat-feed" style={{ marginBottom: "2rem" }}>
                  {activeChat.map((turn, idx) => (
                    <div key={idx} className="chat-turn" style={{ marginBottom: "2rem" }}>
                      <div className="chat-user-bubble" style={{ textAlign: "right", marginBottom: "1rem" }}>
                        <span style={{ padding: "12px 20px", borderRadius: "18px", display: "inline-block", maxWidth: "80%", wordBreak: "break-word" }}>
                          {turn.prompt}
                        </span>
                      </div>
                      <section className="analysis-section" style={{ marginTop: 0 }}>
                        <div className="section-header">
                          <h2 className="section-title">Comparative Analysis</h2>
                          <div className="section-status">
                            <span className={`status-dot ${turn.isLoading ? '' : 'inactive'}`} />
                            {turn.isLoading ? "Real-time processing active" : "Processing complete"}
                          </div>
                        </div>

                        <div className="response-grid">
                          <ResponseCard
                            modelName="GPT-4o Mini"
                            provider="OpenAI"
                            badge="Best Reasoning"
                            badgeClass="best-reasoning"
                            dotColor="cyan"
                            response={turn.responses?.gpt}
                            isLoading={turn.isLoading}
                          />
                          <ResponseCard
                            modelName="Gemini 1.5 Flash"
                            provider="Google DeepMind"
                            badge="Fastest"
                            badgeClass="fastest"
                            dotColor="green"
                            response={turn.responses?.gemini}
                            isLoading={turn.isLoading}
                          />
                          <ResponseCard
                            modelName="Llama 3 (Groq)"
                            provider="Groq"
                            badge="Ultra-Fast"
                            badgeClass="best-reasoning"
                            dotColor="orange"
                            response={turn.responses?.groq}
                            isLoading={turn.isLoading}
                          />
                        </div>


                      </section>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              )}

              {/* ---- Prompt Input (Sticky Bottom) ---- */}
              <div style={activeChat.length > 0 ? { position: 'sticky', bottom: '20px', zIndex: 10, background: 'var(--bg-main)' } : {}}>
                <PromptBox
                  onSubmit={handleSubmit}
                  isLoading={activeChat.length > 0 ? activeChat[activeChat.length - 1].isLoading : false}
                  hasKeys={hasKeys}
                  reusedPrompt={promptToReuse}
                />
              </div>

            </>
          )}

          {activePage === "history" && (
            <HistoryPage
              conversations={history}
              onDelete={handleDeleteConversation}
              onReuse={handleReusePrompt}
              onContinue={handleContinueChat}
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
