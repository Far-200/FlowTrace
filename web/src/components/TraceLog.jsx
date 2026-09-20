import { useState } from "react";

export default function TraceLog({ varHistory, steps = [] }) {
  const [showAll, setShowAll] = useState(false);
  const entries = [...varHistory].reverse();
  const visible = showAll ? entries : entries.slice(0, 5);
  return (
    <section className="panel inspector-panel" aria-label="Trace Log">
      <div className="panel-header"><span>≡ Trace Log</span><span className="panel-count">{entries.length} steps</span></div>
      {entries.length === 0 ? (
        <p className="inspector-empty">Your execution history will appear here. Expand a step to inspect its snapshot.</p>
      ) : <>
        <ol className="inspector-list trace-list" aria-label="Execution history, newest first">
          {visible.map((entry) => {
            const step = steps[entry.stepIdx];
            const frame = step?.callStack?.at(-1);
            return (
              <li key={entry.stepIdx}>
                <details className="inspector-item trace-entry">
                  <summary>
                    <span className="item-heading">
                      <strong>Step {entry.stepIdx + 1}</strong>
                      {step && <span className="line-badge">L{step.line}</span>}
                      <span className="disclosure-chevron" aria-hidden="true">⌄</span>
                    </span>
                    <span className="trace-preview compact-preview">{step?.note || `${Object.keys(entry.vars).length} variables`}</span>
                  </summary>
                  <div className="item-details">
                    {frame && <p className="detail-label">{frame.functionName}() · frame #{frame.id}</p>}
                    {step?.code && <pre className="step-code">{step.code}</pre>}
                    {step?.note && <p className="step-note">{step.note}</p>}
                    <h3 className="detail-label">Variable snapshot</h3>
                    {Object.keys(entry.vars).length ? (
                      <dl className="inspector-values">
                        {Object.entries(entry.vars).map(([name, value]) => (
                          <div key={name}><dt>{name}</dt><dd>{Array.isArray(value) ? `[${value.join(", ")}]` : String(value)}</dd></div>
                        ))}
                      </dl>
                    ) : <p className="inspector-empty">No variables in this snapshot.</p>}
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
        {entries.length > 5 && <button type="button" className="inspector-more" aria-expanded={showAll}
          onClick={() => setShowAll((value) => !value)}>
          {showAll ? "Show latest 5 steps" : `Show all ${entries.length} steps`}
        </button>}
      </>}
    </section>
  );
}
