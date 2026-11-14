/**
 * ChatView
 * --------
 * The conversation pane: loads a chat, streams replies from the selected
 * agents side by side, supports stopping, and keeps the view scrolled to the
 * newest message.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import AgentPicker from "./AgentPicker";
import AgentReply from "./AgentReply";
import Composer from "./Composer";
import { ApiError, getChat, streamChat } from "../../lib/api";
import { agentsInRow } from "../../lib/agents";

const SUGGESTIONS = [
  "Explain the difference between TCP and UDP with an example",
  "Write a Python function that removes duplicates from a list, keeping order",
  "Give me three ideas for a weekend side project",
  "Summarize the pros and cons of microservices",
];

function rowToTurn(row) {
  const agents = agentsInRow(row);
  return {
    id: row.id,
    prompt: row.prompt,
    agents,
    replies: Object.fromEntries(
      agents.map((a) => [a, { text: row[`${a}_response`] || "", error: row[`${a}_error`] || null, status: "done" }])
    ),
  };
}

export default function ChatView({
  chatId,
  onChatStarted,
  onChatUpdated,
  agents,
  selected,
  onSelectedChange,
  maxAgents,
  usage,
  onUsage,
  persistence,
  apiKeys,
  onOpenSidebar,
  onNavigate,
}) {
  const [turns, setTurns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [streaming, setStreaming] = useState(false);

  const loadedChatRef = useRef(null); // chat whose turns are in state
  const abortRef = useRef(null);
  const scrollRef = useRef(null);
  const stickRef = useRef(true);
  const pendingRef = useRef({}); // buffered deltas: {turnId: {agent: text}}
  const frameRef = useRef(0);

  const agentById = Object.fromEntries(agents.map((a) => [a.id, a]));

  // ---- Load chat when the selected chat changes -------------------------
  useEffect(() => {
    if (chatId && chatId === loadedChatRef.current) return; // we just created it
    abortRef.current?.abort();
    loadedChatRef.current = chatId;
    setLoadError("");
    stickRef.current = true;

    if (!chatId) {
      setTurns([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setTurns([]);
    getChat(chatId)
      .then((data) => !cancelled && setTurns((data.turns || []).map(rowToTurn)))
      .catch((err) => !cancelled && setLoadError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [chatId]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // ---- Auto-scroll --------------------------------------------------------
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [turns]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  // ---- Turn updates -------------------------------------------------------
  const patchTurn = useCallback((turnId, fn) => {
    setTurns((prev) => prev.map((t) => (t.id === turnId ? fn(t) : t)));
  }, []);

  const flushDeltas = useCallback(() => {
    frameRef.current = 0;
    const pending = pendingRef.current;
    pendingRef.current = {};
    setTurns((prev) =>
      prev.map((t) => {
        const add = pending[t.id];
        if (!add) return t;
        const replies = { ...t.replies };
        for (const [agent, text] of Object.entries(add)) {
          replies[agent] = { ...replies[agent], text: (replies[agent]?.text || "") + text };
        }
        return { ...t, replies };
      })
    );
  }, []);

  const queueDelta = useCallback(
    (turnId, agent, text) => {
      const p = (pendingRef.current[turnId] ||= {});
      p[agent] = (p[agent] || "") + text;
      if (!frameRef.current) frameRef.current = requestAnimationFrame(flushDeltas);
    },
    [flushDeltas]
  );

  const flushNow = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    flushDeltas();
  }, [flushDeltas]);

  // ---- Send ---------------------------------------------------------------
  const send = useCallback(
    async (prompt) => {
      if (streaming || selected.length === 0) return;

      const sessionId = chatId || crypto.randomUUID();
      const turnId = crypto.randomUUID();
      const turnAgents = [...selected];
      const history = persistence
        ? []
        : turns.map((t) => ({
            prompt: t.prompt,
            ...Object.fromEntries(t.agents.map((a) => [`${a}_response`, t.replies[a]?.text || null])),
          }));

      setTurns((prev) => [
        ...prev,
        {
          id: turnId,
          prompt,
          agents: turnAgents,
          replies: Object.fromEntries(turnAgents.map((a) => [a, { text: "", error: null, status: "streaming" }])),
        },
      ]);
      stickRef.current = true;

      if (!chatId) {
        loadedChatRef.current = sessionId;
        onChatStarted(sessionId, prompt);
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming(true);

      try {
        await streamChat(
          {
            prompt,
            agents: turnAgents,
            session_id: sessionId,
            history,
            api_keys: persistence ? {} : apiKeys,
          },
          {
            signal: controller.signal,
            onEvent: (ev) => {
              if (ev.type === "delta") queueDelta(turnId, ev.agent, ev.text);
              else if (ev.type === "meta") patchTurn(turnId, (t) => ({ ...t, context: ev.context }));
              else if (ev.type === "agent_done") {
                flushNow();
                patchTurn(turnId, (t) => ({
                  ...t,
                  replies: { ...t.replies, [ev.agent]: { ...t.replies[ev.agent], status: "done", error: ev.error } },
                }));
              } else if (ev.type === "done") {
                if (ev.usage) onUsage(ev.usage);
                if (ev.persisted === false && persistence) {
                  patchTurn(turnId, (t) => ({ ...t, notice: "This message could not be saved to your history." }));
                }
              }
            },
          }
        );
      } catch (err) {
        flushNow();
        if (err.name === "AbortError") {
          patchTurn(turnId, (t) => ({
            ...t,
            replies: Object.fromEntries(
              Object.entries(t.replies).map(([a, r]) => [
                a,
                r.status === "streaming" ? { ...r, status: "done", stopped: true } : r,
              ])
            ),
          }));
        } else {
          const message = err instanceof ApiError ? err.message : "Something went wrong while streaming the reply.";
          patchTurn(turnId, (t) => ({
            ...t,
            error: message,
            // Hide agent cards that never received any text.
            agents: t.agents.filter((a) => t.replies[a]?.text),
            replies: Object.fromEntries(
              Object.entries(t.replies).map(([a, r]) => [a, r.status === "streaming" ? { ...r, status: "done" } : r])
            ),
          }));
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setStreaming(false);
        onChatUpdated();
      }
    },
    [streaming, selected, chatId, persistence, turns, apiKeys, onChatStarted, onChatUpdated, onUsage, patchTurn, queueDelta, flushNow]
  );

  const stop = () => abortRef.current?.abort();

  // ---- Render -------------------------------------------------------------
  const hasAnyKey = agents.some((a) => a.hasKey);
  const limitReached = usage && usage.remaining <= 0;
  const disabledReason = !hasAnyKey
    ? "Add an API key to start chatting"
    : limitReached
      ? "Daily message limit reached. It resets at 00:00 UTC."
      : selected.length === 0
        ? "Select at least one agent above"
        : "";

  const footer = [
    selected.length ? `${selected.length} agent${selected.length > 1 ? "s" : ""}` : null,
    usage ? `${usage.remaining} messages left today` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const title = turns[0]?.prompt;
  const wide = turns.some((t) => t.agents.length > 1) || selected.length > 1;

  return (
    <section className="cv">
      <header className="cv-head">
        <button className="cs-icon-btn cv-menu" onClick={onOpenSidebar} aria-label="Open sidebar">☰</button>
        <h1 className="cv-title">{title || "New chat"}</h1>
      </header>

      <div className="cv-scroll" ref={scrollRef} onScroll={onScroll}>
        <div className={`cv-inner ${wide ? "wide" : ""}`}>
          {loading && <div className="cv-status">Loading chat…</div>}
          {loadError && <div className="cv-status error">Could not load this chat: {loadError}</div>}

          {!loading && !loadError && turns.length === 0 && (
            <div className="cv-empty">
              <h2>What can I help with?</h2>
              <p>
                Pick up to {maxAgents} agents below. Each one answers your message, and every agent
                remembers the whole conversation.
              </p>
              <div className="cv-suggestions">
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="cv-suggestion" onClick={() => send(s)} disabled={!!disabledReason}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {turns.map((turn) => {
            const trimmed = turn.context
              ? Math.max(0, ...Object.values(turn.context).map((c) => c.trimmed_turns || 0))
              : 0;
            return (
              <div key={turn.id} className="turn">
                <div className="turn-user">
                  <div className="turn-bubble">{turn.prompt}</div>
                </div>
                {trimmed > 0 && (
                  <div className="turn-note">
                    {trimmed} older message{trimmed > 1 ? "s were" : " was"} left out to fit the context window.
                  </div>
                )}
                {turn.agents.length > 0 && (
                  <div className={`turn-replies n${Math.min(turn.agents.length, 3)}`}>
                    {turn.agents.map((a) => (
                      <AgentReply
                        key={a}
                        agent={agentById[a] || { id: a, label: a, color: "#94a3b8" }}
                        reply={turn.replies[a]}
                      />
                    ))}
                  </div>
                )}
                {turn.error && (
                  <div className="turn-error" role="alert">
                    ⚠ {turn.error}
                    {/limit/i.test(turn.error) ? null : (
                      <button className="turn-retry" onClick={() => send(turn.prompt)} disabled={streaming}>
                        Retry
                      </button>
                    )}
                  </div>
                )}
                {turn.notice && <div className="turn-note">{turn.notice}</div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="cv-bottom">
        <div className={`cv-inner ${wide ? "wide" : ""}`}>
          <AgentPicker
            agents={agents}
            selected={selected}
            onChange={onSelectedChange}
            maxAgents={maxAgents}
            onAddKey={() => onNavigate("api-keys")}
            disabled={streaming}
          />
          <Composer
            onSend={send}
            onStop={stop}
            isStreaming={streaming}
            disabledReason={disabledReason}
            maxChars={usage?.max_prompt_chars}
            footer={footer}
          />
        </div>
      </div>
    </section>
  );
}
