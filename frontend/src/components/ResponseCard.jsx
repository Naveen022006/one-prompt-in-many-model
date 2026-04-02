/**
 * ResponseCard Component
 * -----------------------
 * Single model response card with:
 *   - Markdown rendering (code blocks, bold, lists, etc.)
 *   - Copy-to-clipboard button
 *   - Skeleton loading animation
 *   - Error display
 */

import { useState } from "react";

/**
 * Lightweight markdown-to-HTML converter.
 * Handles: code blocks, inline code, bold, italic, headings,
 * unordered/ordered lists, blockquotes, links, and paragraphs.
 */
function renderMarkdown(text) {
  if (!text) return "";

  let html = text;

  // Escape HTML entities first
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="lang-${lang}">${code.trim()}</code></pre>`;
  });

  // Inline code (`...`)
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Headings (### > ## > #)
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold (**...**) and italic (*...*)
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");

  // Unordered lists (- item or * item)
  html = html.replace(/^[\-\*] (.+)$/gm, "<li>$1</li>");
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>");

  // Ordered lists (1. item)
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");

  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Line breaks (double newline = paragraph, single = <br>)
  html = html.replace(/\n\n/g, "</p><p>");
  html = html.replace(/\n/g, "<br>");

  // Wrap in paragraph if not already wrapped
  if (!html.startsWith("<")) {
    html = `<p>${html}</p>`;
  }

  return html;
}

export default function ResponseCard({
  modelName,
  provider,
  badge,
  badgeClass,
  dotColor,
  response,
  isLoading,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!response?.text) return;
    try {
      await navigator.clipboard.writeText(response.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = response.text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(response.text) }} />
        ) : (
          <div className="card-empty">
            <div className="empty-pulse">💬</div>
            <span>Waiting for prompt…</span>
          </div>
        )}
      </div>

      {/* Footer stats + Copy */}
      {response?.text && (
        <div className="card-footer">
          <div className="card-stat">
            <span className={`stat-dot ${dotColor}`} />
            <span>{estimateTime(response.text)} </span>
          </div>
          <div className="card-stat">
            <span>~{estimateTokens(response.text)} tokens</span>
          </div>
          <button
            className={`card-copy-btn ${copied ? "copied" : ""}`}
            onClick={handleCopy}
            title="Copy response"
          >
            {copied ? "✓ Copied" : "📋 Copy"}
          </button>
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
