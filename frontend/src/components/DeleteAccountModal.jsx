/**
 * DeleteAccountModal Component
 * ----------------------------
 * Modal for permanently deleting user account with password confirmation.
 * Shows warning about irreversible action and requires password verification.
 */

import { useState } from "react";
import "./DeleteAccountModal.css";

export default function DeleteAccountModal({ onClose, onDeleteAccount, userId }) {
  const [password, showPassword] = useState("");
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!confirmed) {
      setError("Please confirm that you understand the consequences.");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password to confirm account deletion.");
      return;
    }

    setLoading(true);
    try {
      await onDeleteAccount(password);
      // Component will be unmounted after successful deletion
    } catch (err) {
      setError(err.message || "Failed to delete account. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header delete-header">
          <h2 className="modal-title">⚠️ Delete Account</h2>
          <button className="modal-close" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        {/* Warning Message */}
        <div className="delete-warning">
          <p className="warning-title">This action cannot be undone</p>
          <p className="warning-text">
            Deleting your account will permanently remove:
          </p>
          <ul className="warning-list">
            <li>All conversations and chat history</li>
            <li>All saved API keys and settings</li>
            <li>Your user profile and account data</li>
            <li>Any associated sessions and tokens</li>
          </ul>
          <p className="warning-notice">
            If you have important conversations, please export them first.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="delete-form">
          {/* Confirmation Checkbox */}
          <label className="confirm-checkbox">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              disabled={loading}
            />
            <span>
              I understand that my account and all associated data will be permanently deleted
            </span>
          </label>

          {/* Password Field */}
          {confirmed && (
            <div className="password-field-wrapper">
              <label className="password-label">
                <span className="label-text">Enter your password to confirm:</span>
                <div className="password-input-group">
                  <input
                    type={showPasswordField ? "text" : "password"}
                    className="password-input"
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => showPassword(e.target.value)}
                    disabled={loading}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPasswordField(!showPasswordField)}
                    title={showPasswordField ? "Hide password" : "Show password"}
                    disabled={loading}
                  >
                    {showPasswordField ? "Hide" : "Show"}
                  </button>
                </div>
              </label>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="modal-buttons">
            <button
              type="button"
              className="modal-btn cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-btn delete-btn"
              disabled={loading || !confirmed || (confirmed && !password.trim())}
            >
              {loading ? (
                <>
                  <span className="spinner-small" />
                  Deleting Account...
                </>
              ) : confirmed && !password.trim() ? (
                "Enter Password to Continue"
              ) : (
                "Delete Account Permanently"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
