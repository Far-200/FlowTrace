// src/components/MobileControls.jsx
// ─────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
// On mobile, controls are sticky-fixed at the bottom of the
// screen so they're always reachable with one thumb.
// Full-width buttons, larger tap targets, simplified labels.
// Desktop uses the existing Controls.jsx — this is mobile only.
// ─────────────────────────────────────────────────────────────

export default function MobileControls({
  onStep,
  onAutoRun,
  onReset,
  onRestart,
  isRunning,
  isDone,
  hasSteps,
  isSupported,
  isEmpty,
}) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: "#0d1117",
        borderTop: "1px solid #1f2937",
        padding: "10px 16px",
        paddingBottom: "calc(10px + env(safe-area-inset-bottom))", // iPhone notch
        display: "flex",
        gap: 8,
        boxShadow: "0 -8px 32px rgba(0,0,0,0.4)",
      }}
    >
      {/* Step */}
      <button
        onClick={onStep}
        disabled={isDone || !isSupported || isEmpty}
        style={{
          ...mobileBtn,
          flex: 2,
          background: isDone || !isSupported || isEmpty ? "#1a2030" : "#3b82f6",
          color: isDone || !isSupported || isEmpty ? "#374151" : "#fff",
          boxShadow:
            isDone || !isSupported || isEmpty
              ? "none"
              : "0 0 16px rgba(59,130,246,0.35)",
        }}
      >
        ▶ Step
      </button>

      {/* Auto-run / Pause */}
      <button
        onClick={onAutoRun}
        disabled={(isDone && !isRunning) || !isSupported || isEmpty}
        style={{
          ...mobileBtn,
          flex: 2,
          background: isRunning ? "#7c2d12" : "#064e3b",
          color: isRunning ? "#fdba74" : "#34d399",
          border: `1px solid ${isRunning ? "#9a3412" : "#065f46"}`,
          opacity: (isDone && !isRunning) || !isSupported || isEmpty ? 0.35 : 1,
        }}
      >
        {isRunning ? "⏸" : "⚡"}
      </button>

      {/* Restart (only after compilation) */}
      {hasSteps && (
        <button
          onClick={onRestart}
          style={{
            ...mobileBtn,
            flex: 1,
            background: "#1f2937",
            color: "#a78bfa",
            border: "1px solid #374151",
          }}
        >
          ⟳
        </button>
      )}

      {/* Reset */}
      <button
        onClick={onReset}
        style={{
          ...mobileBtn,
          flex: 1,
          background: "#1e293b",
          color: "#f87171",
          border: "1px solid #374151",
        }}
      >
        ↺
      </button>
    </div>
  );
}

const mobileBtn = {
  padding: "13px 8px",
  border: "none",
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "'JetBrains Mono', monospace",
  cursor: "pointer",
  transition: "all 0.15s",
  minHeight: 48, // WCAG tap target
  WebkitTapHighlightColor: "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
};
