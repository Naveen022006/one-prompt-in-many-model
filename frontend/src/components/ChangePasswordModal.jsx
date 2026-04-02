/**
 * ChangePasswordModal Component
 * ----------------------------
 * Modal for changing user password with validation
 */

import { useState } from "react";
import "./ChangePasswordModal.css";

export default function ChangePasswordModal({ onClose, onChangePassword }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Calculate password strength
  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    return Math.min(strength, 5);
  };

  const handleNewPasswordChange = (value) => {
    setNewPassword(value);
    setPasswordStrength(calculatePasswordStrength(value));
  };

  const getPasswordStrengthLabel = (strength) => {
    const labels = ["Very Weak", "Weak", "Fair", "Good", "Strong", "Very Strong"];
    return labels[strength] || "Very Weak";
  };

  const getPasswordStrengthColor = (strength) => {
    const colors = ["#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e"];
    return colors[strength] || "#ef4444";
  };

  const validateForm = () => {
    if (!currentPassword.trim()) {
      setError("Current password is required");
      return false;
    }

    if (!newPassword.trim()) {
      setError("New password is required");
      return false;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long");
      return false;
    }

    if (newPassword === currentPassword) {
      setError("New password must be different from current password");
      return false;
    }

    if (!confirmPassword.trim()) {
      setError("Please confirm your new password");
      return false;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onChangePassword(currentPassword, newPassword);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to change password");
    }
    setLoading(false);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal change-password-modal" role="dialog" aria-labelledby="modal-title">
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-label">Security</div>
            <h2 className="modal-title" id="modal-title">
              Change Password
            </h2>
          </div>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <p className="modal-description">
          Enter your current password and choose a strong new password. Your password should be at
          least 8 characters long and include a mix of uppercase, lowercase, numbers, and symbols.
        </p>

        {/* Error Message */}
        {error && (
          <div className="change-password-error">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="change-password-form">
          {/* Current Password */}
          <div className="password-field">
            <label htmlFor="current-password" className="password-label">
              Current Password
            </label>
            <div className="password-input-wrapper">
              <input
                id="current-password"
                className="password-input"
                type={showCurrentPassword ? "text" : "password"}
                placeholder="Enter your current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                disabled={loading}
                title={showCurrentPassword ? "Hide" : "Show"}
              >
                {showCurrentPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="password-field">
            <label htmlFor="new-password" className="password-label">
              New Password
            </label>
            <div className="password-input-wrapper">
              <input
                id="new-password"
                className="password-input"
                type={showNewPassword ? "text" : "password"}
                placeholder="Enter a strong new password"
                value={newPassword}
                onChange={(e) => handleNewPasswordChange(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowNewPassword(!showNewPassword)}
                disabled={loading}
                title={showNewPassword ? "Hide" : "Show"}
              >
                {showNewPassword ? "🙈" : "👁️"}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {newPassword && (
              <div className="password-strength">
                <div className="strength-bars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`strength-bar ${i < passwordStrength ? "active" : ""}`}
                      style={{
                        backgroundColor: i < passwordStrength ? getPasswordStrengthColor(passwordStrength) : "transparent",
                        borderColor: getPasswordStrengthColor(passwordStrength),
                      }}
                    />
                  ))}
                </div>
                <span
                  className="strength-label"
                  style={{ color: getPasswordStrengthColor(passwordStrength) }}
                >
                  {getPasswordStrengthLabel(passwordStrength)}
                </span>
              </div>
            )}

            {/* Password Requirements */}
            <div className="password-requirements">
              <p className="requirements-title">Password Requirements:</p>
              <ul className="requirements-list">
                <li className={newPassword.length >= 8 ? "met" : ""}>
                  {newPassword.length >= 8 ? "✓" : "○"} At least 8 characters
                </li>
                <li className={/[A-Z]/.test(newPassword) ? "met" : ""}>
                  {/[A-Z]/.test(newPassword) ? "✓" : "○"} One uppercase letter
                </li>
                <li className={/[a-z]/.test(newPassword) ? "met" : ""}>
                  {/[a-z]/.test(newPassword) ? "✓" : "○"} One lowercase letter
                </li>
                <li className={/[0-9]/.test(newPassword) ? "met" : ""}>
                  {/[0-9]/.test(newPassword) ? "✓" : "○"} One number
                </li>
                <li className={/[^a-zA-Z0-9]/.test(newPassword) ? "met" : ""}>
                  {/[^a-zA-Z0-9]/.test(newPassword) ? "✓" : "○"} One special character
                </li>
              </ul>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="password-field">
            <label htmlFor="confirm-password" className="password-label">
              Confirm New Password
            </label>
            <div className="password-input-wrapper">
              <input
                id="confirm-password"
                className="password-input"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
                title={showConfirmPassword ? "Hide" : "Show"}
              >
                {showConfirmPassword ? "🙈" : "👁️"}
              </button>
            </div>
            {confirmPassword && newPassword === confirmPassword && (
              <p className="password-match" style={{ color: "#22c55e" }}>
                ✓ Passwords match
              </p>
            )}
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="password-match" style={{ color: "#ef4444" }}>
                ✗ Passwords do not match
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="modal-actions">
            <button
              type="button"
              className="modal-btn btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="modal-btn btn-save" disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
