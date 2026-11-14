/**
 * Composer
 * --------
 * Message input. Enter sends, Shift+Enter adds a new line. While replies
 * are streaming, the send button becomes a stop button.
 */

import { useEffect, useRef, useState } from "react";

export default function Composer({ onSend, onStop, isStreaming, disabledReason, maxChars, footer }) {
  const [text, setText] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 220) + "px";
  }, [text]);

  useEffect(() => {
    if (!isStreaming) ref.current?.focus();
  }, [isStreaming]);

  const tooLong = maxChars && text.length > maxChars;
  const canSend = text.trim() && !isStreaming && !disabledReason && !tooLong;

  const submit = (e) => {
    e?.preventDefault();
    if (!canSend) return;
    onSend(text.trim());
    setText("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form className="composer" onSubmit={submit}>
      <div className={`composer-box ${tooLong ? "error" : ""}`}>
        <textarea
          ref={ref}
          id="prompt-input"
          className="composer-input"
          rows={1}
          placeholder={disabledReason || "Message the agents…"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Message"
        />
        {isStreaming ? (
          <button type="button" className="composer-btn stop" onClick={onStop} aria-label="Stop generating" title="Stop">
            ■
          </button>
        ) : (
          <button type="submit" className="composer-btn" disabled={!canSend} aria-label="Send message" title={disabledReason || "Send"}>
            ↑
          </button>
        )}
      </div>
      <div className="composer-footer">
        <span>{footer}</span>
        {maxChars && text.length > maxChars * 0.8 && (
          <span className={tooLong ? "composer-count error" : "composer-count"}>
            {text.length} / {maxChars}
          </span>
        )}
      </div>
    </form>
  );
}
