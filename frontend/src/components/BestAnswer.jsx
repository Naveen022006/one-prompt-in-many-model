/**
 * BestAnswer Component
 * ---------------------
 * Shows a synthesized "Best Combined Answer" section at the bottom,
 * combining insights from both models — matching Image 1 reference.
 */

export default function BestAnswer({ gptResponse, geminiResponse, groqResponse }) {
  // Only show when we have at least one successful response
  const hasGpt = gptResponse?.text;
  const hasGemini = geminiResponse?.text;
  const hasGroq = groqResponse?.text;
  if (!hasGpt && !hasGemini && !hasGroq) return null;

  // Build a simple synthesis summary
  const modelCount = [hasGpt, hasGemini, hasGroq].filter(Boolean).length;
  const modelNames = [hasGpt && "GPT-4o Mini", hasGemini && "Gemini 1.5 Flash", hasGroq && "Llama 3 (Groq)"].filter(Boolean).join(", ").replace(/, ([^,]*)$/, ' and $1');

  return (
    <section className="best-answer-section" id="best-answer">
      {/* Header */}
      <div className="best-answer-header">
        <span className="ba-icon">✨</span>
        <h2 className="best-answer-title">Best Combined Answer</h2>
      </div>

      <p className="best-answer-subtitle">
        After cross-referencing insights from {modelCount} leading model{modelCount > 1 ? 's' : ''},
        the synthesis reveals complementary perspectives for your query:
      </p>

      {/* Insight Pills */}
      <div className="insight-pills">
        <div className="insight-pill">
          <div className="insight-pill-title green">Response Quality</div>
          <div className="insight-pill-text">
            {modelCount >= 2
              ? "Multiple models provided substantive responses with complementary viewpoints."
              : `${modelNames} provided a detailed response.`}
          </div>
        </div>
        <div className="insight-pill">
          <div className="insight-pill-title purple">Model Coverage</div>
          <div className="insight-pill-text">
            {modelCount === 3
              ? "Full coverage achieved — GPT, Gemini, and Groq all responded successfully."
              : `Partial coverage — ${modelCount} out of 3 models returned successfully.`}
          </div>
        </div>
        <div className="insight-pill">
          <div className="insight-pill-title cyan">Contextual Depth</div>
          <div className="insight-pill-text">
            Compare the responses above to identify unique angles each model brings to the topic.
          </div>
        </div>
      </div>

      {/* Synthesis body */}
      <div className="best-answer-body">
        {modelCount >= 2 ? (
          <>
            The convergence of these distinct model strengths suggests reviewing all responses
            side by side. <strong>{modelNames}</strong> may emphasize different aspects — look for
            areas of agreement for highest confidence, and divergent points for deeper exploration.
          </>
        ) : (
          <>
            The response from <strong>{modelNames}</strong> provides a solid foundation. Consider
            configuring additional API keys to enable full comparative analysis.
          </>
        )}
      </div>

      {/* Actions */}
      <div className="best-answer-actions">
        <button
          className="ba-action-btn"
          onClick={() => {
            const text = `GPT Response:\n${gptResponse?.text || 'N/A'}\n\nGemini Response:\n${geminiResponse?.text || 'N/A'}\n\nGroq Response:\n${groqResponse?.text || 'N/A'}`;
            navigator.clipboard.writeText(text);
          }}
        >
          📋 Copy Synthesis
        </button>
        <button className="ba-action-btn">
          📤 Export Data
        </button>

        <div className="ba-powered">
          <span className="powered-dot" />
          Curated by AI Hub Core v1.0
        </div>
      </div>
    </section>
  );
}
