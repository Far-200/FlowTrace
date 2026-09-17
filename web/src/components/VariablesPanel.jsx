// src/components/VariablesPanel.jsx
// ─────────────────────────────────────────────────────────────
// Upgraded: smooth value change animation, type inference
// badge, value history mini-sparkline (last 4 values),
// empty state message.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";

// Tracks the last N values per variable for the mini history
const MAX_HISTORY = 5;

export default function VariablesPanel({ currentStep, prevStep }) {
  const varNames = currentStep ? Object.keys(currentStep.variables) : [];

  // varHistory: { [name]: number[] } — last MAX_HISTORY values
  const [varHistory, setVarHistory] = useState({});
  const prevVarsRef = useRef({});

  // `historyStep` records which currentStep varHistory was last derived
  // from. varHistory only exists to accumulate a sparkline across many
  // steps — it can't be computed from this render's props alone — so
  // per React's own "adjusting state when a prop changes" guidance
  // (https://react.dev/learn/you-might-not-need-an-effect), the update
  // happens conditionally right here during render instead of through
  // an effect: it runs exactly once per distinct currentStep, and
  // React re-renders immediately with the corrected state before
  // anything is painted, so this is not visible as an extra frame.
  const [historyStep, setHistoryStep] = useState(currentStep);
  if (currentStep !== historyStep) {
    setHistoryStep(currentStep);
    if (!currentStep) {
      setVarHistory({});
    } else {
      const curr = currentStep.variables;
      setVarHistory((prev) => {
        const next = { ...prev };
        for (const name of Object.keys(curr)) {
          const existing = next[name] ?? [];
          // Only push if value actually changed
          const last = existing[existing.length - 1];
          if (last !== curr[name]) {
            next[name] = [...existing, curr[name]].slice(-MAX_HISTORY);
          }
        }
        return next;
      });
    }
  }

  // prevVarsRef is a plain ref (not read during render), so — unlike
  // varHistory above — syncing it stays in an effect, which is the
  // correct place to mutate a ref as a side effect of a prop change.
  useEffect(() => {
    if (currentStep) {
      prevVarsRef.current = currentStep.variables;
    }
  }, [currentStep]);

  return (
    <div className="panel" style={{ flex: 1 }}>
      <div className="panel-header">
        <span>📦 Variables</span>
        <span style={{ color: "#3b82f6", fontSize: 10 }}>
          {varNames.length} active
        </span>
      </div>

      <div style={{ padding: "10px", minHeight: 80 }}>
        {varNames.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px 0",
              gap: 6,
              color: "#374151",
            }}
          >
            <span style={{ fontSize: 18, opacity: 0.3 }}>{}</span>
            <span style={{ fontSize: 11 }}>No variables declared yet</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            {varNames.map((name) => {
              const val = currentStep.variables[name];
              const prevVal = prevStep?.variables?.[name];
              const changed = prevVal !== undefined && prevVal !== val;
              const hist = varHistory[name] ?? [];

              return (
                <VarPill
                  key={name}
                  name={name}
                  val={val}
                  prevVal={prevVal}
                  changed={changed}
                  history={hist}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Individual variable pill ──────────────────────────────────
function VarPill({ name, val, prevVal, changed, history }) {
  const pillRef = useRef(null);
  const wasChanged = useRef(false);

  useEffect(() => {
    if (changed && pillRef.current) {
      // Trigger pulse animation by toggling class
      pillRef.current.classList.remove("ft-var-changed");
      void pillRef.current.offsetWidth; // force reflow
      pillRef.current.classList.add("ft-var-changed");
      wasChanged.current = true;
    }
  }, [changed, val]);

  // Infer display type hint
  const isFloat = !Number.isInteger(val);
  const typeHint = isFloat ? "float" : "int";

  // Delta indicator
  const delta = prevVal !== undefined && prevVal !== val ? val - prevVal : null;

  return (
    <div
      ref={pillRef}
      className={`var-pill ${changed ? "changed" : ""}`}
      style={{
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 4,
        minWidth: 80,
      }}
    >
      {/* Name + type hint row */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}
      >
        <span className="var-name">{name}</span>
        <span
          style={{
            fontSize: 9,
            color: "#374151",
            background: "#1f2937",
            borderRadius: 3,
            padding: "1px 4px",
            fontFamily: "monospace",
          }}
        >
          {typeHint}
        </span>
      </div>

      {/* Value + delta row */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span className="var-val">{formatVal(val)}</span>
        {delta !== null && (
          <span
            style={{
              fontSize: 10,
              color: delta > 0 ? "#34d399" : "#f87171",
              fontFamily: "monospace",
              opacity: 0.8,
            }}
          >
            {delta > 0 ? `+${delta}` : delta}
          </span>
        )}
      </div>

      {/* Mini value history — last N values as dots */}
      {history.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: 3,
            alignItems: "center",
            marginTop: 1,
          }}
        >
          {history.map((v, i) => (
            <div
              key={i}
              title={String(v)}
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: i === history.length - 1 ? "#3b82f6" : "#1f2937",
                border:
                  i === history.length - 1
                    ? "1px solid #60a5fa"
                    : "1px solid #374151",
                transition: "all 0.2s",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function formatVal(val) {
  if (Number.isInteger(val)) return String(val);
  return parseFloat(val.toFixed(4)).toString();
}
