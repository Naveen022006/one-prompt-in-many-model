/**
 * TopNav Component
 * -----------------
 * Horizontal top navigation bar with page tabs, API Keys button,
 * settings icon, and avatar — matching the reference design.
 */

export default function TopNav({ activePage, onOpenApiKeys }) {
  return (
    <header className="topnav">
      {/* Tabs */}
      <div className="topnav-tabs">
        <button className={`topnav-tab ${activePage === 'dashboard' ? 'active' : ''}`}>
          Dashboard
        </button>
        <button className="topnav-tab">Models</button>
        <button className="topnav-tab">History</button>
        <button className="topnav-tab">Saved</button>
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

        <button className="topnav-icon-btn" title="Settings" id="settings-btn">
          ⚙️
        </button>

        <div className="topnav-avatar" title="Profile">
          U
        </div>
      </div>
    </header>
  );
}
