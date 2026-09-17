// src/components/Controls.jsx
// ─────────────────────────────────────────────────────────────
// Upgraded: hidden when editor is empty, restart button,
// keyboard shortcut labels on buttons, coming-soon guard.
// ─────────────────────────────────────────────────────────────

export default function Controls({
  onStep,
  onAutoRun,
  onReset,
  onRestart,
  onCompile,
  onClear,
  isRunning,
  isDone,
  hasSteps,
  isSupported,
  isEmpty, // NEW: hide all buttons when editor is empty
}) {
  // If editor is empty, show nothing — no point running empty code
  if (isEmpty) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          opacity: 0.35,
          fontSize: 11,
          color: "#4b5563",
          fontFamily: "monospace",
          padding: "4px 0",
        }}
      >
        ⚡ Write or load code to begin
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      {/* ── Step ── */}
      <button
        className={`btn btn-primary ${
          isDone || !isSupported ? "btn-disabled" : ""
        }`}
        onClick={onStep}
        disabled={isDone || !isSupported}
        title="Execute next line  [Ctrl+Enter]"
      >
        ▶ Step
        <kbd style={kbdStyle}>⌃↵</kbd>
      </button>

      {/* ── Auto-run / Pause ── */}
      <button
        className={`btn ${isRunning ? "btn-stop" : "btn-success"} ${
          (isDone && !isRunning) || !isSupported ? "btn-disabled" : ""
        }`}
        onClick={onAutoRun}
        disabled={(isDone && !isRunning) || !isSupported}
        title="Auto-run all steps  [Shift+Enter]"
      >
        {isRunning ? "⏸ Pause" : "⚡ Run"}
        <kbd style={kbdStyle}>{isRunning ? "⏸" : "⇧↵"}</kbd>
      </button>

      {/* ── Restart from beginning ── */}
      {hasSteps && (
        <button
          className="btn"
          style={{
            background: "#1f2937",
            color: "#a78bfa",
            border: "1px solid #374151",
          }}
          onClick={onRestart}
          title="Restart from step 1"
        >
          ⟳ Restart
        </button>
      )}

      {/* ── Reset ── */}
      <button
        className="btn btn-danger"
        onClick={onReset}
        title="Clear execution and return to edit mode  [Ctrl+R]"
      >
        ↺ Reset
        <kbd style={kbdStyle}>⌃R</kbd>
      </button>

      {/* ── Compile (only before first run) ── */}
      {!hasSteps && (
        <button
          className={`btn ${!isSupported ? "btn-disabled" : ""}`}
          style={{ background: "#1f2937", color: "#9ca3af" }}
          onClick={onCompile}
          disabled={!isSupported}
          title="Parse and count steps without executing"
        >
          ⚙ Compile
        </button>
      )}

      {/* ── Clear / New ── */}
      {!hasSteps && (
        <button
          className={`btn ${!isSupported ? "btn-disabled" : ""}`}
          style={{
            background: "#1f2937",
            color: "#6b7280",
            border: "1px solid #1f2937",
          }}
          onClick={onClear}
          title="Clear the editor"
        >
          ✕ Clear
        </button>
      )}

      {/* ── Completion badge ── */}
      {isDone && (
        <span
          style={{
            fontSize: 11,
            color: "#34d399",
            alignSelf: "center",
            marginLeft: 4,
            fontFamily: "monospace",
          }}
        >
          ✓ Done
        </span>
      )}

      {/* ── Coming soon notice ── */}
      {!isSupported && (
        <span
          style={{
            fontSize: 10,
            color: "#fbbf24",
            alignSelf: "center",
            fontFamily: "monospace",
            marginLeft: 4,
          }}
        >
          🚧 Simulation coming soon
        </span>
      )}
    </div>
  );
}

// Tiny keyboard hint badge styling
const kbdStyle = {
  marginLeft: 5,
  fontSize: 9,
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 3,
  padding: "1px 4px",
  color: "rgba(255,255,255,0.4)",
  fontFamily: "monospace",
  letterSpacing: "0.02em",
};
