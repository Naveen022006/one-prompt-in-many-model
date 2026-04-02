/**
 * Sidebar Component
 * ------------------
 * Left navigation sidebar matching the AI Hub / Ethereal AI reference design.
 * Shows brand, "New Prompt" button, navigation items, and bottom links.
 */

export default function Sidebar({ activePage, onNavigate, onNewPrompt, onSignOut }) {
  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">⚡</div>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">AI Curator</span>
          <span className="sidebar-brand-sub">Intelligence Framework</span>
        </div>
      </div>

      {/* New Prompt */}
      <button className="sidebar-new-btn" onClick={onNewPrompt} id="new-prompt-btn">
        <span>  </span> New Chat
      </button>

      {/* Main Nav */}
      <nav className="sidebar-nav">
        <button
          className={`sidebar-nav-item ${activePage === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate('dashboard')}
          id="nav-dashboard"
        >
          <span className="nav-icon">📊</span>
          Dashboard
        </button>

        <button
          className={`sidebar-nav-item ${activePage === 'history' ? 'active' : ''}`}
          onClick={() => onNavigate('history')}
          id="nav-history"
        >
          <span className="nav-icon">🕐</span>
          History
        </button>

        <button
          className={`sidebar-nav-item ${activePage === 'saved' ? 'active' : ''}`}
          onClick={() => onNavigate('saved')}
          id="nav-saved"
        >
          <span className="nav-icon">🔖</span>
          Saved
        </button>

        <button
          className={`sidebar-nav-item ${activePage === 'navigation' ? 'active' : ''}`}
          onClick={() => onNavigate('navigation')}
          id="nav-navigation"
        >
          <span className="nav-icon">🧭</span>
          Navigation
        </button>
      </nav>

      {/* Bottom */}
      <div className="sidebar-bottom">
        <button className="sidebar-nav-item" id="nav-help">
          <span className="nav-icon">❓</span>
          Help
        </button>
        <button className="sidebar-nav-item" id="nav-privacy">
          <span className="nav-icon">🔒</span>
          Privacy
        </button>
        <button className="sidebar-nav-item" id="nav-signout" onClick={onSignOut} style={{ color: "var(--red-primary)" }}>
          <span className="nav-icon">⏻</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
