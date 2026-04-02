/**
 * UserProfilePage Component
 * -------------------------
 * User profile page with account details, settings, and actions.
 */

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import ChangePasswordModal from "./ChangePasswordModal";
import "./UserProfilePage.css";

export default function UserProfilePage({ userEmail, onSignOut, onNavigate }) {
  const [copied, setCopied] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordUpdate, setPasswordUpdate] = useState({ loading: false, message: "" });

  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : "U";

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(userEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy email", err);
    }
  };

  const handleChangePassword = async (currentPassword, newPassword) => {
    setPasswordUpdate({ loading: true, message: "" });

    try {
      // Update password using Supabase Auth
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        throw new Error(error.message || "Failed to change password");
      }

      setPasswordUpdate({
        loading: false,
        message: "Password updated successfully!",
      });

      setTimeout(() => {
        setShowChangePassword(false);
        setPasswordUpdate({ loading: false, message: "" });
      }, 1500);
    } catch (err) {
      setPasswordUpdate({
        loading: false,
        message: err.message || "Failed to change password",
      });
      throw err;
    }
  };

  const handleSignOut = () => {
    if (confirm("Are you sure you want to sign out?")) {
      onSignOut();
    }
  };

  return (
    <div className="user-profile-page">
      {/* Header */}
      <div className="profile-header">
        <button
          className="profile-back-btn"
          onClick={() => onNavigate("dashboard")}
          title="Back to dashboard"
        >
          ← Back
        </button>
        <h1 className="profile-title">Account Settings</h1>
        <div style={{ width: "40px" }} /> {/* Spacer for alignment */}
      </div>

      {/* Success Message */}
      {passwordUpdate.message && (
        <div
          className={`profile-feedback ${
            passwordUpdate.message.includes("success") ? "feedback-success" : "feedback-error"
          }`}
        >
          <span className="feedback-icon">
            {passwordUpdate.message.includes("success") ? "✓" : "⚠️"}
          </span>
          <span>{passwordUpdate.message}</span>
        </div>
      )}

      {/* Profile Card */}
      <div className="profile-card">
        {/* Avatar Section */}
        <div className="profile-avatar-section">
          <div className="profile-avatar">{userInitial}</div>
          <div className="profile-avatar-info">
            <h2 className="profile-name">User Account</h2>
            <p className="profile-email-label">Email Address</p>
          </div>
        </div>

        {/* Email Display */}
        <div className="profile-email-block">
          <div className="profile-email-content">
            <span className="profile-email-icon">✉️</span>
            <div className="profile-email-details">
              <p className="profile-email-label">Email</p>
              <p className="profile-email-value">{userEmail}</p>
            </div>
          </div>
          <button
            className="profile-copy-btn"
            onClick={handleCopyEmail}
            title="Copy email"
          >
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="profile-sections">
        {/* Account Section */}
        <div className="profile-section">
          <h3 className="section-title">Account</h3>
          <div className="section-content">
            <div className="setting-item">
              <div className="setting-info">
                <p className="setting-label">Account Status</p>
                <p className="setting-description">Active & Verified</p>
              </div>
              <span className="setting-badge active">✓ Active</span>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <p className="setting-label">Account Type</p>
                <p className="setting-description">Standard User</p>
              </div>
              <span className="setting-badge">User</span>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <p className="setting-label">Data Storage</p>
                <p className="setting-description">
                  Your conversations and API keys are stored securely in Supabase
                </p>
              </div>
              <span className="setting-badge">Encrypted</span>
            </div>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="profile-section">
          <h3 className="section-title">Preferences</h3>
          <div className="section-content">
            <div className="setting-item">
              <div className="setting-info">
                <p className="setting-label">Theme</p>
                <p className="setting-description">Dark Mode (Active)</p>
              </div>
              <input
                type="checkbox"
                className="setting-toggle"
                checked={true}
                readOnly
                title="Theme setting"
              />
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <p className="setting-label">Auto-save Conversations</p>
                <p className="setting-description">Enabled automatically</p>
              </div>
              <input
                type="checkbox"
                className="setting-toggle"
                checked={true}
                readOnly
                title="Auto-save setting"
              />
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <p className="setting-label">Email Notifications</p>
                <p className="setting-description">Disabled</p>
              </div>
              <input
                type="checkbox"
                className="setting-toggle"
                checked={false}
                readOnly
                title="Notifications setting"
              />
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="profile-section">
          <h3 className="section-title">Security</h3>
          <div className="section-content">
            <div className="setting-item">
              <div className="setting-info">
                <p className="setting-label">Change Password</p>
                <p className="setting-description">
                  Update your password regularly for security
                </p>
              </div>
              <button
                className="setting-action-btn"
                onClick={() => setShowChangePassword(true)}
                title="Change your password"
              >
                Change
              </button>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <p className="setting-label">Two-Factor Authentication</p>
                <p className="setting-description">
                  Add an extra layer of security to your account
                </p>
              </div>
              <button className="setting-action-btn" disabled title="Coming soon">
                Coming Soon
              </button>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <p className="setting-label">API Keys</p>
                <p className="setting-description">Manage your API credentials</p>
              </div>
              <button
                className="setting-action-btn"
                onClick={() => onNavigate("api-keys")}
              >
                Manage
              </button>
            </div>
          </div>
        </div>

        {/* Data Section */}
        <div className="profile-section">
          <h3 className="section-title">Data & Privacy</h3>
          <div className="section-content">
            <div className="setting-item">
              <div className="setting-info">
                <p className="setting-label">Export Your Data</p>
                <p className="setting-description">
                  Download all your conversations as JSON
                </p>
              </div>
              <button className="setting-action-btn" disabled title="Coming soon">
                Coming Soon
              </button>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <p className="setting-label">Delete Account</p>
                <p className="setting-description">
                  Permanently delete all your data
                </p>
              </div>
              <button
                className="setting-action-btn delete"
                disabled
                title="Coming soon"
              >
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sign Out Button */}
      <div className="profile-footer">
        <button className="profile-signout-btn" onClick={handleSignOut}>
          <span className="signout-icon">⏻</span>
          Sign Out
        </button>
        <p className="profile-footer-text">
          You'll be logged out from all devices. To sign back in, use your email and password.
        </p>
      </div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePasswordModal
          onClose={() => setShowChangePassword(false)}
          onChangePassword={handleChangePassword}
        />
      )}
    </div>
  );
}
