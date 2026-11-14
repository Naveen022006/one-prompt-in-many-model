/**
 * ChatSidebar
 * -----------
 * ChatGPT-style left panel: new chat, search, past chats grouped by date,
 * today's usage, and account links.
 */

import { useMemo, useState } from "react";

function groupLabel(dateStr) {
  const d = new Date(dateStr);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const days = Math.floor((startOfToday - d) / 86400000) + 1;
  if (d >= startOfToday) return "Today";
  if (days <= 1) return "Yesterday";
  if (days <= 7) return "Previous 7 days";
  if (days <= 30) return "Previous 30 days";
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default function ChatSidebar({
  open,
  onClose,
  chats,
  chatsLoading,
  activeChatId,
  activePage,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onNavigate,
  onSignOut,
  usage,
  userEmail,
}) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? chats.filter((c) => (c.title || "").toLowerCase().includes(q)) : chats;
    const out = [];
    for (const chat of filtered) {
      const label = groupLabel(chat.updated_at || chat.created_at);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(chat);
      else out.push({ label, items: [chat] });
    }
    return out;
  }, [chats, query]);

  const usagePct = usage ? Math.min(100, Math.round((usage.used / Math.max(usage.limit, 1)) * 100)) : 0;

  return (
    <>
      <div className={`cs-backdrop ${open ? "open" : ""}`} onClick={onClose} />
      <aside className={`cs ${open ? "open" : ""}`} aria-label="Chats">
        <div className="cs-top">
          <div className="cs-brand">
            <span className="cs-brand-icon">⚡</span>
            <span>AI Curator</span>
          </div>
          <button className="cs-icon-btn cs-close" onClick={onClose} aria-label="Close sidebar">✕</button>
        </div>

        <button className="cs-new" onClick={onNewChat}>
          <span aria-hidden>＋</span> New chat
        </button>

        <input
          className="cs-search"
          type="search"
          placeholder="Search chats"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search chats"
        />

        <nav className="cs-list">
          {chatsLoading && chats.length === 0 && (
            <div className="cs-skeletons">
              {[0, 1, 2, 3].map((i) => <div key={i} className="cs-skeleton skeleton" />)}
            </div>
          )}
          {!chatsLoading && groups.length === 0 && (
            <p className="cs-empty">{query ? "No chats match your search." : "No chats yet. Start one!"}</p>
          )}
          {groups.map((g) => (
            <div key={g.label} className="cs-group">
              <div className="cs-group-label">{g.label}</div>
              {g.items.map((chat) => (
                <div
                  key={chat.id}
                  className={`cs-item ${activePage === "chat" && chat.id === activeChatId ? "active" : ""}`}
                >
                  <button className="cs-item-title" onClick={() => onSelectChat(chat.id)} title={chat.title}>
                    {chat.title || "New chat"}
                  </button>
                  <button
                    className="cs-item-delete"
                    onClick={() => onDeleteChat(chat)}
                    aria-label={`Delete chat ${chat.title}`}
                    title="Delete chat"
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          ))}
        </nav>

        <div className="cs-bottom">
          {usage && (
            <div className="cs-usage" title={`Resets at 00:00 UTC`}>
              <div className="cs-usage-row">
                <span>Messages today</span>
                <span>{usage.used} / {usage.limit}</span>
              </div>
              <div className="cs-usage-bar">
                <div
                  className={`cs-usage-fill ${usagePct >= 90 ? "high" : ""}`}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            </div>
          )}
          <button
            className={`cs-link ${activePage === "api-keys" ? "active" : ""}`}
            onClick={() => onNavigate("api-keys")}
          >
            🔑 API Keys
          </button>
          <button
            className={`cs-link ${activePage === "profile" ? "active" : ""}`}
            onClick={() => onNavigate("profile")}
            title={userEmail}
          >
            👤 <span className="cs-email">{userEmail || "Account"}</span>
          </button>
          <button className="cs-link danger" onClick={onSignOut}>⏻ Sign out</button>
        </div>
      </aside>
    </>
  );
}
