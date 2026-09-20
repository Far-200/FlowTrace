export default function CurrentStepPanel({ currentStep, stepIdx, totalSteps }) {
  const note = currentStep?.note ?? "";
  const tone = note.startsWith("⚠️") ? "warning" : note.startsWith("📤") ? "output" : "default";
  return (
    <section className="panel inspector-panel current-step" aria-label="Current Step">
      <div className="panel-header">
        <span>⚡ Current Step</span>
        <span className="panel-count">{Math.max(0, stepIdx + 1)} / {totalSteps}</span>
      </div>
      {currentStep ? (
        <details className={`step-disclosure tone-${tone}`}>
          <summary>
            <span className="inspector-meta"><span className="line-badge">L{currentStep.line}</span><span>Step {stepIdx + 1}</span></span>
            <code className="step-code compact-preview">{currentStep.code || "No source text"}</code>
            {note && <span className="step-note compact-preview">{note}</span>}
            <span className="disclosure-label">
              <span className="when-closed">Show full details</span><span className="when-open">Hide details</span>
              <span className="disclosure-chevron" aria-hidden="true">⌄</span>
            </span>
          </summary>
          <div className="step-full-details">
            <h3 className="detail-label">Source · line {currentStep.line}</h3>
            <pre className="step-code">{currentStep.code || "No source text"}</pre>
            {note && <>
              <h3 className="detail-label">Execution note</h3>
              <p className="step-note">{note}</p>
            </>}
          </div>
        </details>
      ) : <p className="inspector-empty">Ready to inspect.<br />Choose a sample, then press Step or Run.</p>}
    </section>
  );
}
