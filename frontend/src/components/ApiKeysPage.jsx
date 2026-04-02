/**
 * ApiKeysPage Component
 * ----------------------
 * Dedicated full-page interface for managing API keys.
 * - Add new keys
 * - Edit existing keys
 * - Delete keys
 * - View key status (active/inactive)
 * - Key validation
 * - Secure storage with Supabase
 */

import { useState, useEffect } from "react";
import { fetchApiKeys, saveApiKey, deleteApiKey } from "../lib/supabaseHelper";
import "./ApiKeysPage.css";

const API_MODELS = [
  {
    id: "openai",
    name: "GPT / OpenAI",
    icon: "⚡",
    color: "#10b981",
    description: "Default reasoning model (GPT-4o Mini)",
    placeholder: "sk-...",
    helpUrl: "https://platform.openai.com/api-keys",
    helpText: "Get your OpenAI API key from platform.openai.com/api-keys",
  },
  {
    id: "gemini",
    name: "Gemini / Google",
    icon: "✦",
    color: "#8b5cf6",
    description: "Multimodal vision support (Gemini 1.5 Flash)",
    placeholder: "AIzaSy...",
    helpUrl: "https://aistudio.google.com/app/apikey",
    helpText: "Get your Gemini API key from aistudio.google.com/app/apikey",
  },
  {
    id: "groq",
    name: "Llama / Groq",
    icon: "⚙️",
    color: "#f59e0b",
    description: "Ultra-fast inference (Llama 3.1 8B)",
    placeholder: "gsk_...",
    helpUrl: "https://console.groq.com/",
    helpText: "Get your Groq API key from console.groq.com",
  },
];

export default function ApiKeysPage({ userId, apiKeys: initialKeys, onUpdateKeys }) {
  const [keys, setKeys] = useState({
    openai_api_key: initialKeys?.openai_api_key || "",
    gemini_api_key: initialKeys?.gemini_api_key || "",
    groq_api_key: initialKeys?.groq_api_key || "",
  });

  const [editingKey, setEditingKey] = useState(null);
  const [showKeys, setShowKeys] = useState({
    openai: false,
    gemini: false,
    groq: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // Load keys on mount
  useEffect(() => {
    loadKeys();
  }, [userId]);

  const loadKeys = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const saved = await fetchApiKeys(userId);
      setKeys({
        openai_api_key: saved.openai || "",
        gemini_api_key: saved.gemini || "",
        groq_api_key: saved.groq || "",
      });
    } catch (err) {
      showFeedback("error", "Failed to load API keys");
    }
    setLoading(false);
  };

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: "", message: "" }), 3000);
  };

  const handleSaveKey = async (modelId, keyValue) => {
    if (!userId) {
      showFeedback("error", "Please sign in first");
      return;
    }

    if (!keyValue.trim()) {
      showFeedback("error", "API key cannot be empty");
      return;
    }

    setSaving(true);
    try {
      await saveApiKey(userId, modelId, keyValue.trim());
      
      setKeys((prev) => ({
        ...prev,
        [`${modelId}_api_key`]: keyValue.trim(),
      }));

      onUpdateKeys({
        ...keys,
        [`${modelId}_api_key`]: keyValue.trim(),
      });

      setEditingKey(null);
      showFeedback("success", `${API_MODELS.find(m => m.id === modelId).name} key saved! ✨`);
    } catch (err) {
      showFeedback("error", `Failed to save ${modelId} key`);
    }
    setSaving(false);
  };

  const handleDeleteKey = async (modelId) => {
    const model = API_MODELS.find(m => m.id === modelId);
    if (!confirm(`Delete ${model.name} API key? This cannot be undone.`)) {
      return;
    }

    setSaving(true);
    try {
      await deleteApiKey(userId, modelId);
      
      setKeys((prev) => ({
        ...prev,
        [`${modelId}_api_key`]: "",
      }));

      onUpdateKeys({
        ...keys,
        [`${modelId}_api_key`]: "",
      });

      setEditingKey(null);
      showFeedback("success", `${model.name} key deleted.`);
    } catch (err) {
      showFeedback("error", `Failed to delete ${modelId} key`);
    }
    setSaving(false);
  };

  const getKeyStatus = (modelId) => {
    const keyValue = keys[`${modelId}_api_key`];
    if (!keyValue || !keyValue.trim()) return "empty";
    if (keyValue.length < 10) return "invalid";
    return "active";
  };

  const toggleShowKey = (modelId) => {
    setShowKeys((prev) => ({
      ...prev,
      [modelId]: !prev[modelId],
    }));
  };

  return (
    <div className="api-keys-page">
      {/* Header */}
      <div className="api-keys-header">
        <div>
          <h1 className="api-keys-title">API Key Management</h1>
          <p className="api-keys-subtitle">
            Add and manage your API keys for GPT, Gemini, and Groq. Keys are encrypted and stored securely.
          </p>
        </div>
        <div className="api-keys-status-badge">
          <span className="status-icon">✓</span>
          <span className="status-count">
            {Object.values(keys).filter((k) => k && k.trim()).length} / 3 active
          </span>
        </div>
      </div>

      {/* Feedback Message */}
      {feedback.message && (
        <div className={`api-keys-feedback feedback-${feedback.type}`}>
          <span className="feedback-icon">
            {feedback.type === "success" ? "✓" : "⚠️"}
          </span>
          <span className="feedback-message">{feedback.message}</span>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="api-keys-loading-container">
          {API_MODELS.map((model) => (
            <div key={model.id} className="api-key-card-skeleton">
              <div className="skeleton-icon" />
              <div className="skeleton-content">
                <div className="skeleton-line" style={{ width: "80%" }} />
                <div className="skeleton-line" style={{ width: "100%", marginTop: "8px" }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* API Key Cards */}
          <div className="api-keys-grid">
            {API_MODELS.map((model) => {
              const keyValue = keys[`${model.id}_api_key`];
              const status = getKeyStatus(model.id);
              const isEditing = editingKey === model.id;

              return (
                <div key={model.id} className="api-key-card">
                  {/* Header */}
                  <div className="api-key-card-header">
                    <div className="api-key-icon" style={{ backgroundColor: model.color }}>
                      {model.icon}
                    </div>
                    <div className="api-key-card-title">
                      <h3 className="api-key-name">{model.name}</h3>
                      <p className="api-key-desc">{model.description}</p>
                    </div>
                    <div className={`api-key-status-badge status-${status}`}>
                      <span className="status-dot" />
                      {status === "active" ? "Active" : status === "invalid" ? "Invalid" : "Not Set"}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="api-key-card-content">
                    {isEditing ? (
                      <>
                        {/* Edit Mode */}
                        <div className="api-key-input-wrapper">
                          <input
                            className="api-key-input"
                            type={showKeys[model.id] ? "text" : "password"}
                            placeholder={model.placeholder}
                            defaultValue={keyValue}
                            onChange={(e) => {
                              const val = e.target.value;
                              setKeys((prev) => ({
                                ...prev,
                                [`${model.id}_api_key`]: val,
                              }));
                            }}
                            autoComplete="off"
                            autoFocus
                          />
                          <button
                            className="api-key-toggle-btn"
                            onClick={() => toggleShowKey(model.id)}
                            title={showKeys[model.id] ? "Hide" : "Show"}
                          >
                            {showKeys[model.id] ? "🙈" : "👁️"}
                          </button>
                        </div>

                        {/* Help Text */}
                        <div className="api-key-help">
                          <a
                            href={model.helpUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="api-key-help-link"
                          >
                            {model.helpText} →
                          </a>
                        </div>

                        {/* Action Buttons */}
                        <div className="api-key-actions">
                          <button
                            className="api-key-btn btn-save"
                            onClick={() =>
                              handleSaveKey(
                                model.id,
                                keys[`${model.id}_api_key`]
                              )
                            }
                            disabled={saving}
                          >
                            {saving ? "Saving..." : "Save Key"}
                          </button>
                          <button
                            className="api-key-btn btn-cancel"
                            onClick={() => {
                              setEditingKey(null);
                              loadKeys(); // Reload to discard changes
                            }}
                            disabled={saving}
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* View Mode */}
                        <div className="api-key-display">
                          {keyValue && keyValue.trim() ? (
                            <div className="api-key-masked">
                              <span className="masked-key">
                                {keyValue.substring(0, 10)}...
                                {keyValue.substring(keyValue.length - 5)}
                              </span>
                              <span className="key-length">
                                ({keyValue.length} chars)
                              </span>
                            </div>
                          ) : (
                            <div className="api-key-empty">
                              <span className="empty-text">No API key configured</span>
                              <a
                                href={model.helpUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="empty-link"
                              >
                                Get one here →
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="api-key-actions">
                          <button
                            className="api-key-btn btn-edit"
                            onClick={() => setEditingKey(model.id)}
                          >
                            {keyValue && keyValue.trim() ? "Edit Key" : "Add Key"}
                          </button>
                          {keyValue && keyValue.trim() && (
                            <button
                              className="api-key-btn btn-delete"
                              onClick={() => handleDeleteKey(model.id)}
                              disabled={saving}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Information Section */}
          <div className="api-keys-info">
            <div className="info-card">
              <h4 className="info-title">🔒 Security</h4>
              <p className="info-text">
                Your API keys are encrypted and stored securely in Supabase. They are never shared or
                logged. You can delete them at any time.
              </p>
            </div>

            <div className="info-card">
              <h4 className="info-title">💡 Tip</h4>
              <p className="info-text">
                You need at least one API key to generate responses. Keys are saved automatically and
                loaded on your next visit. You can use free tier keys from all providers.
              </p>
            </div>

            <div className="info-card">
              <h4 className="info-title">💰 Pricing</h4>
              <p className="info-text">
                <strong>GPT-4o Mini:</strong> $0.15 input / $0.60 output per 1M tokens
                <br />
                <strong>Gemini 1.5 Flash:</strong> $0.075 input / $0.30 output per 1M tokens
                <br />
                <strong>Llama 3 (Groq):</strong> Free or minimal cost
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
