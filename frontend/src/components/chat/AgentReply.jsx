/**
 * AgentReply
 * ----------
 * One agent's answer inside a turn: streaming text, error, or loader,
 * plus a copy button.
 */

import { memo, useState } from "react";
import { renderMarkdown } from "./markdown";

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function AgentReply({ agent, reply }) {
  const [copied, setCopied] = useState(false);
  const status = reply?.status || "done";
  const text = reply?.text || "";

  const onCopy = async () => {
    if (await copyText(text)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  // Copy buttons inside rendered code blocks.
  const onBodyClick = async (e) => {
    const btn = e.target.closest("[data-copy-code]");
    if (!btn) return;
    const code = btn.closest(".md-code")?.querySelector("code")?.textContent || "";
    if (await copyText(code)) {
      btn.textContent = "Copied";
      setTimeout(() => (btn.textContent = "Copy"), 1500);
    }
  };

  return (
    <article className={`ar ${status}`} style={{ "--agent": agent.color }}>
      <header className="ar-head">
        <span className="ar-dot" />
        <span className="ar-name">{agent.label}</span>
        {agent.model && <span className="ar-model">{agent.model}</span>}
        {status === "streaming" && <span className="ar-live">typing…</span>}
        {reply?.stopped && <span className="ar-live">stopped</span>}
      </header>

      <div className="ar-body md" onClick={onBodyClick}>
        {text ? (
          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />
        ) : status === "streaming" ? (
          <div className="ar-thinking" aria-label="Thinking"><span /><span /><span /></div>
        ) : null}
        {status === "streaming" && text && <span className="ar-cursor" aria-hidden />}
        {reply?.error && (
          <div className="ar-error" role="alert">⚠ {reply.error}</div>
        )}
      </div>

      {text && status !== "streaming" && (
        <footer className="ar-foot">
          <button type="button" className="ar-action" onClick={onCopy}>
            {copied ? "✓ Copied" : "Copy"}
          </button>
          <span className="ar-tokens">~{Math.ceil(text.length / 4)} tokens</span>
        </footer>
      )}
    </article>
  );
}

export default memo(AgentReply);
