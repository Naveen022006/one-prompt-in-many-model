/**
 * App.jsx — Root Component
 * -------------------------
 * - Authenticates the user via Supabase Auth
 * - ChatGPT-style layout: chat list sidebar + conversation pane
 * - Hash URLs (#/c/<chat-id>, #/keys, #/account) so refresh and back/forward work
 * - Loads agents, saved API keys, chats, and usage for the signed-in user
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import ChatSidebar from "./components/chat/ChatSidebar";
import ChatView from "./components/chat/ChatView";
import ApiKeysPage from "./components/ApiKeysPage";
import UserProfilePage from "./components/UserProfilePage";
import AuthPage from "./components/AuthPage";
import { supabase } from "./lib/supabaseClient";
import { fetchApiKeys, migrateLocalData, PROVIDERS } from "./lib/supabaseHelper";
import { API_URL, deleteChat, getUsage, listAgents, listChats } from "./lib/api";
import { AGENT_IDS, DEFAULT_MAX_AGENTS, mergeAgents } from "./lib/agents";
import "./App.css";
import "./components/chat/chat.css";

const EMPTY_KEYS = Object.fromEntries(PROVIDERS.map((p) => [`${p}_api_key`, ""]));
const SELECTED_KEY = "ai_hub_selected_agents";

function parseHash() {
  const h = window.location.hash.replace(/^#\/?/, "");
  if (h.startsWith("c/")) return { page: "chat", chatId: decodeURIComponent(h.slice(2)) || null };
  if (h === "keys") return { page: "api-keys", chatId: null };
  if (h === "account") return { page: "profile", chatId: null };
  return { page: "chat", chatId: null };
}

function hashFor(page, chatId) {
  if (page === "api-keys") return "#/keys";
  if (page === "profile") return "#/account";
  return chatId ? `#/c/${encodeURIComponent(chatId)}` : "#/";
}

function loadSelected() {
  try {
    const saved = JSON.parse(localStorage.getItem(SELECTED_KEY));
    if (Array.isArray(saved)) return saved.filter((id) => AGENT_IDS.includes(id));
  } catch {
    /* ignore */
  }
  return null;
}

export default function App() {
  // ---- Auth ----
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  // ---- Routing ----
  const [route, setRoute] = useState(parseHash);
  const navigate = useCallback((page, chatId = null) => {
    const hash = hashFor(page, chatId);
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
    setRoute({ page, chatId });
  }, []);

  useEffect(() => {
    const onPop = () => setRoute(parseHash());
    window.addEventListener("popstate", onPop);
    window.addEventListener("hashchange", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("hashchange", onPop);
    };
  }, []);

  // ---- Data ----
  const [persistence, setPersistence] = useState(true);
  const [serverAgents, setServerAgents] = useState([]);
  const [maxAgents, setMaxAgents] = useState(DEFAULT_MAX_AGENTS);
  const [apiKeys, setApiKeys] = useState(EMPTY_KEYS);
  const [chats, setChats] = useState([]);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [usage, setUsage] = useState(null);
  const [selected, setSelected] = useState(() => loadSelected());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [banner, setBanner] = useState("");

  // ---- Init auth ----
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const refreshChats = useCallback(async () => {
    try {
      setChats(await listChats());
    } catch (err) {
      setBanner(err.message);
    } finally {
      setChatsLoading(false);
    }
  }, []);

  const refreshAgents = useCallback(async () => {
    try {
      const data = await listAgents();
      setServerAgents(data.agents || []);
      if (data.max_agents_per_message) setMaxAgents(data.max_agents_per_message);
    } catch (err) {
      setBanner(err.message);
    }
  }, []);

  const refreshUsage = useCallback(() => {
    getUsage().then(setUsage).catch(() => {});
  }, []);

  // ---- Load everything once signed in ----
  useEffect(() => {
    if (!userId) return;
    setBanner("");
    setChatsLoading(true);
    fetch(`${API_URL}/`)
      .then((r) => r.json())
      .then((h) => setPersistence(!!h.supabase))
      .catch(() => setBanner(`Cannot reach the server at ${API_URL}. Is the backend running?`));
    refreshAgents();
    refreshChats();
    refreshUsage();
    fetchApiKeys(userId).then((saved) =>
      setApiKeys(Object.fromEntries(PROVIDERS.map((p) => [`${p}_api_key`, saved[p] || ""])))
    );
  }, [userId, refreshAgents, refreshChats, refreshUsage]);

  // Agents with "has key" from either the server or keys entered this session.
  const agents = useMemo(
    () =>
      mergeAgents(serverAgents).map((a) => ({
        ...a,
        hasKey: a.hasStoredKey || !!apiKeys[`${a.keyProvider}_api_key`]?.trim(),
      })),
    [serverAgents, apiKeys]
  );

  // Default selection: the first agents that have a key.
  const effectiveSelected = useMemo(() => {
    const usable = new Set(agents.filter((a) => a.hasKey).map((a) => a.id));
    const base = selected ?? agents.filter((a) => a.hasKey).map((a) => a.id);
    return base.filter((id) => usable.has(id)).slice(0, maxAgents);
  }, [selected, agents, maxAgents]);

  const changeSelected = (ids) => {
    setSelected(ids);
    localStorage.setItem(SELECTED_KEY, JSON.stringify(ids));
  };

  // Plain {provider: key} map; only sent to the backend when it has no database.
  const keyMap = useMemo(
    () => Object.fromEntries(PROVIDERS.map((p) => [p, apiKeys[`${p}_api_key`] || ""])),
    [apiKeys]
  );

  // ---- Handlers ----
  const handleLoginComplete = async (newSession, oldLocalId) => {
    setSession(newSession);
    const newId = newSession?.user?.id;
    if (newId && oldLocalId && oldLocalId !== newId) {
      try {
        await migrateLocalData(oldLocalId, newId);
        localStorage.removeItem("ai_hub_user_id");
      } catch (e) {
        console.error("Failed to migrate history", e);
      }
    }
  };

  const handleNewChat = () => {
    navigate("chat", null);
    setSidebarOpen(false);
    setTimeout(() => document.getElementById("prompt-input")?.focus(), 50);
  };

  const handleSelectChat = (id) => {
    navigate("chat", id);
    setSidebarOpen(false);
  };

  const handleChatStarted = useCallback(
    (id, prompt) => {
      const now = new Date().toISOString();
      setChats((prev) => [{ id, title: prompt.slice(0, 80), created_at: now, updated_at: now, turns: 1 }, ...prev]);
      const hash = hashFor("chat", id);
      window.history.replaceState(null, "", hash);
      setRoute({ page: "chat", chatId: id });
    },
    []
  );

  const handleChatUpdated = useCallback(() => {
    if (persistence) refreshChats();
    refreshUsage();
  }, [persistence, refreshChats, refreshUsage]);

  const handleDeleteChat = async (chat) => {
    if (!confirm(`Delete "${chat.title || "this chat"}"? This cannot be undone.`)) return;
    try {
      await deleteChat(chat.id);
      setChats((prev) => prev.filter((c) => c.id !== chat.id));
      if (route.chatId === chat.id) navigate("chat", null);
    } catch (err) {
      setBanner(`Could not delete chat: ${err.message}`);
    }
  };

  const handleUpdateKeys = (keys) => {
    setApiKeys(keys);
    refreshAgents();
  };

  const handleLogOut = async () => {
    await supabase.auth.signOut();
    setApiKeys(EMPTY_KEYS);
    setChats([]);
    setUsage(null);
    setServerAgents([]);
    navigate("chat", null);
  };

  // ---- Render ----
  if (authLoading) {
    return (
      <div className="app-layout" style={{ justifyContent: "center", alignItems: "center" }}>
        <div className="status-dot" />
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
    <div className="chat-app">
      <ChatSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        chats={chats}
        chatsLoading={chatsLoading}
        activeChatId={route.chatId}
        activePage={route.page}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onNavigate={(p) => {
          navigate(p);
          setSidebarOpen(false);
        }}
        onSignOut={handleLogOut}
        usage={usage}
        userEmail={userEmail}
      />

      <main className="chat-main">
        {banner && (
          <div className="app-banner" role="alert">
            {banner}
            <button onClick={() => setBanner("")} aria-label="Dismiss">✕</button>
          </div>
        )}
        {!persistence && (
          <div className="app-banner warn">
            The backend has no database configured. Chats and keys are kept only until you reload.
          </div>
        )}

        {route.page === "chat" && (
          <ChatView
            chatId={route.chatId}
            onChatStarted={handleChatStarted}
            onChatUpdated={handleChatUpdated}
            agents={agents}
            selected={effectiveSelected}
            onSelectedChange={changeSelected}
            maxAgents={maxAgents}
            usage={usage}
            onUsage={setUsage}
            persistence={persistence}
            apiKeys={keyMap}
            onOpenSidebar={() => setSidebarOpen(true)}
            onNavigate={(p) => navigate(p)}
          />
        )}

        {route.page !== "chat" && (
          <div className="chat-page">
            <button className="cs-icon-btn cv-menu page-menu" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">☰</button>
            <div className="page-content">
              {route.page === "api-keys" && (
                <ApiKeysPage userId={userId} apiKeys={apiKeys} onUpdateKeys={handleUpdateKeys} />
              )}
              {route.page === "profile" && (
                <UserProfilePage
                  userId={userId}
                  userEmail={userEmail}
                  onSignOut={handleLogOut}
                  onNavigate={(p) => navigate(p === "dashboard" ? "chat" : p)}
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
