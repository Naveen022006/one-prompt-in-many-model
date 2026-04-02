/**
 * TopNav Component
 * -----------------
 * Horizontal top navigation bar with page tabs, API Keys button,
 * settings icon, and user avatar with initial.
 */

export default function TopNav({ activePage, onOpenApiKeys, onNavigate, userEmail }) {
  const initial = userEmail ? userEmail.charAt(0).toUpperCase() : "U";

  return (
    <header className="topnav">
      {/* Tabs */}
      <div className="topnav-tabs">
        <button
          className={`topnav-tab ${activePage === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate?.('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={`topnav-tab ${activePage === 'history' ? 'active' : ''}`}
          onClick={() => onNavigate?.('history')}
        >
          History
        </button>
      </div>

      {/* Right side */}
      <div className="topnav-right">
        <button
          className="topnav-btn"
          onClick={onOpenApiKeys}
          id="api-keys-btn"
        >
          🔑 API Keys
        </button>

        <div className="topnav-avatar" title={userEmail || "Profile"}>
          {initial}
        </div>
      </div>
    </header>
  );
}
