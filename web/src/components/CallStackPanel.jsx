export default function CallStackPanel({ currentStep }) {
  const frames = currentStep?.callStack ?? [];

  return (
    <section className="panel call-stack" aria-label="Call Stack">
      <div className="panel-header">
        <span>▤ Call Stack</span>
        <span>{frames.length} frames</span>
      </div>
      <div className="call-stack-body">
        {frames.length === 0 ? (
          <p className="call-stack-empty">
            {currentStep ? "No active function calls" : "Step through a function sample to see its calls"}
          </p>
        ) : (
          <ol className="call-stack-frames" aria-label="Active calls, current frame first">
            {[...frames].reverse().map((frame) => (
              <li key={frame.id} className={`call-stack-frame ${frame.isActive ? "active" : ""}`}
                aria-current={frame.isActive ? "step" : undefined}>
                <div className="call-stack-title">
                  <strong>{frame.functionName}()</strong>
                  <span>L{frame.line}</span>
                </div>
                <div className="call-stack-status">
                  {frame.isActive ? "▶ Executing" : "Waiting for return"} · #{frame.id}
                </div>
                {Object.keys(frame.locals).length === 0 ? (
                  <p className="call-stack-empty">No parameters or locals yet</p>
                ) : (
                  <dl className="call-stack-values">
                    {Object.entries(frame.locals).map(([name, value]) => (
                      <div key={name}>
                        <dt>{name} <small>{Object.hasOwn(frame.parameters, name) ? "param" : "local"}</small></dt>
                        <dd>{Array.isArray(value) ? `[${value.join(", ")}]` : String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
