/**
 * ResponseCard Component
 * -----------------------
 * Single model response card matching the Comparative Analysis section
 * from the reference design. Shows model name, badge, provider, response text,
 * and footer stats (response time, token count placeholder).
 */

export default function ResponseCard({
  modelName,
  provider,
  badge,
  badgeClass,
  dotColor,
  response,
  isLoading,
}) {
  return (
    <article className="response-card">
      {/* Header — model name + badge */}
      <div className="card-header">
        <h3 className="card-model-name">{modelName}</h3>
        {badge && <span className={`card-badge ${badgeClass}`}>{badge}</span>}
      </div>

      <div className="card-provider">{provider}</div>

      {/* Body */}
      <div className="card-body">
        {isLoading ? (
          <div className="card-skeleton">
            <div className="skel-line skeleton" />
            <div className="skel-line skeleton" />
            <div className="skel-line skeleton" />
            <div className="skel-line skeleton" />
          </div>
        ) : response?.error ? (
          <div className="card-error">
            <span className="card-error-icon">⚠️</span>
            <span>{response.error}</span>
          </div>
        ) : response?.text ? (
          response.text
        ) : (
          <div className="card-empty">
            <div className="empty-pulse">💬</div>
            <span>Waiting for prompt…</span>
          </div>
        )}
      </div>

      {/* Footer stats */}
      {response?.text && (
        <div className="card-footer">
          <div className="card-stat">
            <span className={`stat-dot ${dotColor}`} />
            <span>{estimateTime(response.text)} </span>
          </div>
          <div className="card-stat">
            <span>~{estimateTokens(response.text)} tokens</span>
          </div>
        </div>
      )}
    </article>
  );
}

/** Rough estimate of response time based on text length */
function estimateTime(text) {
  const len = text?.length || 0;
  if (len < 200) return "< 1s";
  if (len < 800) return "~2s";
  return "~3s";
}

/** Rough estimate of token count (~4 chars per token) */
function estimateTokens(text) {
  return Math.ceil((text?.length || 0) / 4);
}
