/**
 * HistoryPage Component
 * ----------------------
 * Displays past conversations fetched from Supabase via the backend.
 * Each card shows the prompt, truncated responses, and timestamp.
 * Users can click to expand, or delete conversations.
 */

import { useState } from "react";

export default function HistoryPage({ conversations, onDelete, onReuse, isLoading }) {
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter conversations by search query
  const filtered = conversations.filter((conv) =>
    conv.prompt.toLowerCase().includes(searchQuery.toLowerCase())
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

  return (
    <div className="history-page">
      {/* Header */}
      <div className="history-header">
        <div>
          <div className="hero-label">Archive Access</div>
          <h1 className="history-title">Memory Bank</h1>
          <p className="history-subtitle">
            Accessing historical data clusters and cross-referenced model outputs.
          </p>
        </div>

        <div className="history-controls">
          <div className="history-search-wrapper">
            <span className="history-search-icon">🔍</span>
            <input
              id="history-search"
              className="history-search"
              type="text"
              placeholder="Search prompts..."
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
      ) : filtered.length === 0 ? (
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
          {filtered.map((conv) => {
            const isExpanded = expandedId === conv.id;

            return (
              <article
                key={conv.id}
                className={`history-card ${isExpanded ? "expanded" : ""}`}
              >
                {/* Card top bar */}
                <div className="history-card-top">
                  <span className="history-card-date">
                    {formatDate(conv.created_at)}
                  </span>
                  <div className="history-card-actions">
                    <button
                      className="history-card-action"
                      title="Reuse this prompt"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReuse(conv.prompt);
                      }}
                    >
                      ↻
                    </button>
                    <button
                      className="history-card-action delete"
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(conv.id);
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </div>

                {/* Prompt */}
                <div
                  className="history-card-prompt"
                  onClick={() => toggleExpand(conv.id)}
                >
                  "{isExpanded ? conv.prompt : truncate(conv.prompt, 120)}"
                </div>

                {/* Model badges */}
                <div className="history-card-models">
                  {conv.gpt_response && (
                    <span className="history-model-badge gpt">GPT-4o Mini</span>
                  )}
                  {conv.gemini_response && (
                    <span className="history-model-badge gemini">Gemini</span>
                  )}
                  {conv.gpt_error && (
                    <span className="history-model-badge error">GPT Error</span>
                  )}
                  {conv.gemini_error && (
                    <span className="history-model-badge error">Gemini Error</span>
                  )}
                </div>

                {/* Expanded responses */}
                {isExpanded && (
                  <div className="history-card-expanded">
                    {conv.gpt_response && (
                      <div className="history-response-block">
                        <div className="history-response-label">GPT-4o Mini</div>
                        <div className="history-response-text">
                          {conv.gpt_response}
                        </div>
                      </div>
                    )}
                    {conv.gpt_error && (
                      <div className="history-response-block error">
                        <div className="history-response-label">GPT Error</div>
                        <div className="history-response-text">{conv.gpt_error}</div>
                      </div>
                    )}
                    {conv.gemini_response && (
                      <div className="history-response-block">
                        <div className="history-response-label">Gemini 1.5 Flash</div>
                        <div className="history-response-text">
                          {conv.gemini_response}
                        </div>
                      </div>
                    )}
                    {conv.gemini_error && (
                      <div className="history-response-block error">
                        <div className="history-response-label">Gemini Error</div>
                        <div className="history-response-text">{conv.gemini_error}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Click hint */}
                {!isExpanded && (
                  <button
                    className="history-card-expand-hint"
                    onClick={() => toggleExpand(conv.id)}
                  >
                    View Thread →
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Footer count */}
      {filtered.length > 0 && (
        <div className="history-footer">
          Showing {filtered.length} of {conversations.length} conversations
        </div>
      )}
    </div>
  );
}
