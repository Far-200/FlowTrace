export default function CallStackPanel({ currentStep }) {
  const frames = currentStep?.callStack ?? [];
  return (
    <section className="panel inspector-panel call-stack" aria-label="Call Stack">
      <div className="panel-header"><span>▤ Call Stack</span><span className="panel-count">{frames.length} frames</span></div>
      {frames.length === 0 ? (
        <p className="inspector-empty">{currentStep ? "No active function calls." : "Step through a function sample to inspect its frames."}</p>
      ) : (
        <ol className="inspector-list" aria-label="Active calls, current frame first">
          {[...frames].reverse().map((frame) => (
            <li key={frame.id}>
              <details className={`inspector-item stack-frame ${frame.isActive ? "active" : ""}`}>
                <summary aria-current={frame.isActive ? "step" : undefined}>
                  <span className="item-heading">
                    <strong>{frame.functionName}()</strong><span className="line-badge">L{frame.line}</span>
                    <span className="disclosure-chevron" aria-hidden="true">⌄</span>
                  </span>
                  <span className="inspector-meta">
                    <span className={frame.isActive ? "active-label" : ""}>{frame.isActive ? "● Active frame" : "Waiting for return"}</span>
                    <span>#{frame.id} · {Object.keys(frame.locals).length} bindings</span>
                  </span>
                </summary>
                <div className="item-details">
                  {Object.keys(frame.locals).length === 0 ? <p className="inspector-empty">No parameters or locals yet.</p> : (
                    <dl className="inspector-values">
                      {Object.entries(frame.locals).map(([name, value]) => (
                        <div key={name}>
                          <dt>{name} <small>{Object.hasOwn(frame.parameters, name) ? "param" : "local"}</small></dt>
                          <dd>{Array.isArray(value) ? `[${value.join(", ")}]` : String(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              </details>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
