/**
 * TopNav Component
 * -----------------
 * Horizontal top navigation bar with page tabs and user avatar.
 */

export default function TopNav({ activePage, onNavigate, userEmail }) {
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
          className="topnav-avatar"
          onClick={() => onNavigate?.('profile')}
          title={userEmail || "Profile"}
        >
          {initial}
        </button>
      </div>
    </header>
  );
}
