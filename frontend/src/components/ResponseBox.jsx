/**
 * ResponseBox Component
 * ----------------------
 * Displays the side-by-side responses from GPT and Gemini.
 * Handles three states per model: empty, success, and error.
 */

export default function ResponseBox({ responses }) {
  // Don't render anything if we haven't received a response yet
  if (!responses) return null;

  const { gpt, gemini } = responses;

  return (
    <section className="response-section" id="response-section">
      <h2 className="response-section-title">
        <span>⚡</span> Model Responses
      </h2>

      <div className="response-grid">
        {/* ---- GPT Card ---- */}
        <article className="response-card gpt" id="gpt-response">
          <div className="card-header">
            <div className="model-icon gpt">G</div>
            <span className="model-name">ChatGPT</span>
            <span className="model-tag gpt">GPT-3.5 Turbo</span>
          </div>

          <div className="response-body">
            {gpt.error ? (
              <div className="response-error">⚠️ {gpt.error}</div>
            ) : gpt.text ? (
              gpt.text
            ) : (
              <div className="response-empty">
                <span className="empty-icon">💤</span>
                No response received
              </div>
            )}
          </div>
        </article>

        {/* ---- Gemini Card ---- */}
        <article className="response-card gemini" id="gemini-response">
          <div className="card-header">
            <div className="model-icon gemini">G</div>
            <span className="model-name">Gemini</span>
            <span className="model-tag gemini">1.5 Flash</span>
          </div>

          <div className="response-body">
            {gemini.error ? (
              <div className="response-error">⚠️ {gemini.error}</div>
            ) : gemini.text ? (
              gemini.text
            ) : (
              <div className="response-empty">
                <span className="empty-icon">💤</span>
                No response received
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
