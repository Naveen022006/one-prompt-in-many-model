/**
 * HistoryPage Component
 * ----------------------
 * Displays past conversations fetched from Supabase via the backend.
 * Groups individual conversation turns into sessions/threads automatically.
 */

import { useState } from "react";

export default function HistoryPage({ conversations, onDelete, onReuse, onContinue, isLoading }) {
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Group conversations into threads
  const threads = [];
  const threadMap = new Map();

  conversations.forEach((conv) => {
    // If it lacks a session_id, treat it as its own distinct session thread
    const sId = conv.session_id || conv.id;
    if (!threadMap.has(sId)) {
      const thread = {
        id: sId,
        turns: [],
        firstPrompt: "",
        created_at: conv.created_at, // Newest turn's time represents the thread
        db_ids: [], // to delete all rows associated with this session
      };
      threadMap.set(sId, thread);
      threads.push(thread);
    }
    // Since history comes in DESC (newest first), we unshift to make the array ASC (oldest first)
    threadMap.get(sId).turns.unshift(conv);
    threadMap.get(sId).db_ids.push(conv.id);
  });

  // Then ensure firstPrompt is set correctly (the earliest turn)
  threads.forEach((t) => {
    t.firstPrompt = t.turns[0].prompt;
  });

  // Filter conversations by search query (search any prompt in the thread)
  const filteredThreads = threads.filter((thread) =>
    thread.turns.some((turn) =>
      turn.prompt.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );


  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const truncate = (text, maxLen = 150) => {
    if (!text) return null;
    return text.length > maxLen ? text.slice(0, maxLen) + "…" : text;
  };

  const handleDeleteThread = (thread) => {
    // We send a delete request for every row in the thread simultaneously
    thread.db_ids.forEach(db_id => onDelete(db_id));
  };


  return (
    <div className="history-page">
      {/* Header */}
      <div className="history-header">
        <div>
          <div className="hero-label">Archive Access</div>
          <h1 className="history-title">Memory Bank</h1>
          <p className="history-subtitle">
            Accessing threaded historical sessions and cross-referenced model outputs.
          </p>
        </div>

        <div className="history-controls">
          <div className="history-search-wrapper">
            <span className="history-search-icon">🔍</span>
            <input
              id="history-search"
              className="history-search"
              type="text"
              placeholder="Search threads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="history-loading">
          {[1, 2, 3].map((i) => (
            <div key={i} className="history-card-skeleton skeleton" />
          ))}
        </div>
      ) : filteredThreads.length === 0 ? (
        <div className="history-empty">
          <div className="history-empty-icon">📭</div>
          <h3>No conversations yet</h3>
          <p>
            {searchQuery
              ? "No results match your search. Try different keywords."
              : "Start a new prompt on the Dashboard to build your history."}
          </p>
        </div>
      ) : (
        <div className="history-grid">
          {filteredThreads.map((thread) => {
            const isExpanded = expandedId === thread.id;
            
            // Collect badges for all turns to show on closed card
            const hasGpt = thread.turns.some(t => t.gpt_response);
            const hasGemini = thread.turns.some(t => t.gemini_response);
            const hasGroq = thread.turns.some(t => t.groq_response);
            const turnCount = thread.turns.length;

            return (
              <article
                key={thread.id}
                className={`history-card ${isExpanded ? "expanded" : ""}`}
              >
                {/* Card top bar */}
                <div className="history-card-top">
                  <span className="history-card-date">
                    {formatDate(thread.created_at)}
                    {turnCount > 1 && <span style={{marginLeft: "10px", opacity: 0.6}}>• {turnCount} turns</span>}
                  </span>
                  <div className="history-card-actions">
                    <button
                      className="history-card-action"
                      title="Reuse original prompt"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReuse(thread.firstPrompt);
                      }}
                    >
                      ↻
                    </button>
                    <button
                      className="history-card-action"
                      title="Continue thread"
                      onClick={(e) => {
                        e.stopPropagation();
                        onContinue(thread.turns);
                      }}
                    >
                      💬
                    </button>
                    <button
                      className="history-card-action delete"
                      title="Delete Thread"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteThread(thread);
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </div>

                {/* Initial Prompt */}
                <div
                  className="history-card-prompt"
                  onClick={() => toggleExpand(thread.id)}
                >
                  "{isExpanded ? thread.firstPrompt : truncate(thread.firstPrompt, 120)}"
                </div>

                {/* Model badges */}
                {!isExpanded && (
                  <div className="history-card-models">
                    {hasGpt && <span className="history-model-badge gpt">GPT-4o Mini</span>}
                    {hasGemini && <span className="history-model-badge gemini">Gemini</span>}
                    {hasGroq && <span className="history-model-badge" style={{background: 'var(--orange-dim)', color: 'var(--orange-primary)', border: '1px solid var(--orange-border)'}}>Groq</span>}
                  </div>
                )}

                {/* Expanded Thread View */}
                {isExpanded && (
                  <div className="history-card-expanded">
                    {thread.turns.map((turn, idx) => (
                      <div key={idx} className="thread-turn">
                        {idx > 0 && (
                           <div className="history-card-prompt" style={{marginTop: "20px", marginBottom: "15px", padding: "10px", background: "var(--bg-main)", borderRadius: "8px", fontSize: "0.95rem"}}>
                             <strong style={{color: "var(--text-dim)"}}>Follow-up: </strong> {turn.prompt}
                           </div>
                        )}
                        <div className="thread-responses">
                          {turn.gpt_response && (
                            <div className="history-response-block">
                              <div className="history-response-label">GPT-4o Mini</div>
                              <div className="history-response-text">{turn.gpt_response}</div>
                            </div>
                          )}
                          {turn.gemini_response && (
                            <div className="history-response-block">
                              <div className="history-response-label">Gemini 1.5 Flash</div>
                              <div className="history-response-text">{turn.gemini_response}</div>
                            </div>
                          )}
                          {turn.groq_response && (
                            <div className="history-response-block">
                              <div className="history-response-label">Llama 3 (Groq)</div>
                              <div className="history-response-text">{turn.groq_response}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Click hint */}
                {!isExpanded && (
                  <div className="history-card-expand-hint-wrapper">
                    <button
                      className="history-card-expand-hint"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(thread.id);
                      }}
                    >
                      View Details ↓
                    </button>
                    <button
                      className="history-card-expand-hint continue-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onContinue(thread.turns);
                      }}
                    >
                      Continue Thread →
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Footer count */}
      {filteredThreads.length > 0 && (
        <div className="history-footer">
          Showing {filteredThreads.length} of {threads.length} threads
        </div>
      )}
    </div>
  );
}
