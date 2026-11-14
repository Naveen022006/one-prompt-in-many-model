/**
 * AgentPicker
 * -----------
 * Toggle which agents answer the next message. Agents without an API key
 * are disabled and link to the API Keys page.
 */

export default function AgentPicker({ agents, selected, onChange, maxAgents, onAddKey, disabled }) {
  const toggle = (id) => {
    if (selected.includes(id)) onChange(selected.filter((a) => a !== id));
    else if (selected.length < maxAgents) onChange([...selected, id]);
  };

  const anyKey = agents.some((a) => a.hasKey);

  return (
    <div className="ap" role="group" aria-label="Agents">
      {agents.map((a) => {
        const isOn = selected.includes(a.id);
        const atMax = !isOn && selected.length >= maxAgents;
        return (
          <button
            key={a.id}
            type="button"
            className={`ap-chip ${isOn ? "on" : ""}`}
            style={{ "--agent": a.color }}
            onClick={() => (a.hasKey ? toggle(a.id) : onAddKey())}
            disabled={disabled || (a.hasKey && atMax)}
            aria-pressed={isOn}
            title={
              !a.hasKey
                ? `Add a ${a.vendor} API key to use ${a.label}`
                : atMax
                  ? `Up to ${maxAgents} agents per message`
                  : `${a.vendor}${a.model ? ` · ${a.model}` : ""}`
            }
          >
            <span className="ap-dot" />
            {a.label}
            {!a.hasKey && <span className="ap-nokey">＋key</span>}
          </button>
        );
      })}
      {!anyKey && (
        <button type="button" className="ap-hint" onClick={onAddKey}>
          Add an API key to start →
        </button>
      )}
    </div>
  );
}
