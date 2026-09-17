// src/components/CurrentStepPanel.jsx
// ─────────────────────────────────────────────────────────────
// Upgraded: animated step counter, note type icons,
// step navigation hint, prettier empty state.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";

// Classify a note string into a visual type for icon + color
function getNoteStyle(note) {
  if (!note) return null;
  if (note.startsWith("⚠️"))
    return {
      icon: "⚠️",
      color: "#f87171",
      bg: "rgba(248,113,113,0.08)",
      border: "rgba(248,113,113,0.2)",
    };
  if (note.startsWith("📤"))
    return {
      icon: "📤",
      color: "#a78bfa",
      bg: "rgba(167,139,250,0.08)",
      border: "rgba(167,139,250,0.2)",
    };
  if (note.startsWith("↩"))
    return {
      icon: "↩",
      color: "#fbbf24",
      bg: "rgba(251,191,36,0.08)",
      border: "rgba(251,191,36,0.2)",
    };
  if (note.includes("TRUE"))
    return {
      icon: "✓",
      color: "#34d399",
      bg: "rgba(52,211,153,0.08)",
      border: "rgba(52,211,153,0.2)",
    };
  if (note.includes("FALSE"))
    return {
      icon: "✗",
      color: "#f87171",
      bg: "rgba(248,113,113,0.08)",
      border: "rgba(248,113,113,0.2)",
    };
  if (note.startsWith("Declared"))
    return {
      icon: "📦",
      color: "#60a5fa",
      bg: "rgba(96,165,250,0.08)",
      border: "rgba(96,165,250,0.2)",
    };
  return {
    icon: "→",
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.08)",
    border: "rgba(251,191,36,0.2)",
  };
}

export default function CurrentStepPanel({ currentStep, stepIdx, totalSteps }) {
  // Ref to animate the panel on step change
  const panelRef = useRef(null);
  const prevIdx = useRef(-1);

  useEffect(() => {
    if (!panelRef.current || stepIdx === prevIdx.current) return;
    prevIdx.current = stepIdx;

    // Quick flash animation on step change
    const el = panelRef.current;
    el.style.transition = "none";
    el.style.background = "rgba(59,130,246,0.08)";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = "background 0.4s ease";
        el.style.background = "transparent";
      });
    });
  }, [stepIdx]);

  const noteStyle = getNoteStyle(currentStep?.note);

  return (
    <div className="panel">
      <div className="panel-header">
        <span>⚡ Current Step</span>
        {totalSteps > 0 && (
          <span style={{ color: "#3b82f6", fontSize: 10 }}>
            {stepIdx + 1} / {totalSteps}
          </span>
        )}
      </div>

      <div ref={panelRef} style={{ padding: "12px 14px", minHeight: 90 }}>
        {currentStep ? (
          <>
            {/* Line number badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  background: "rgba(59,130,246,0.12)",
                  border: "1px solid rgba(59,130,246,0.25)",
                  color: "#60a5fa",
                  borderRadius: 4,
                  padding: "2px 7px",
                  fontFamily: "monospace",
                  fontWeight: 600,
                }}
              >
                L{currentStep.line}
              </span>
              <span style={{ fontSize: 10, color: "#374151" }}>executing</span>
            </div>

            {/* Code line display */}
            <div
              style={{
                fontSize: 12,
                color: "#93c5fd",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 500,
                marginBottom: 10,
                wordBreak: "break-all",
                lineHeight: 1.6,
                background: "rgba(59,130,246,0.06)",
                border: "1px solid rgba(59,130,246,0.12)",
                borderRadius: 6,
                padding: "6px 10px",
              }}
            >
              {currentStep.code || "—"}
            </div>

            {/* Note badge with type-based color */}
            {currentStep.note && noteStyle && (
              <div
                style={{
                  fontSize: 11,
                  color: noteStyle.color,
                  background: noteStyle.bg,
                  border: `1px solid ${noteStyle.border}`,
                  borderRadius: 6,
                  padding: "5px 10px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 6,
                  lineHeight: 1.5,
                }}
              >
                <span style={{ flexShrink: 0, fontSize: 12 }}>
                  {noteStyle.icon}
                </span>
                <span style={{ fontFamily: "monospace" }}>
                  {/* Strip leading emoji from note since we show it separately */}
                  {currentStep.note.replace(/^(⚠️|📤)\s*/, "")}
                </span>
              </div>
            )}
          </>
        ) : (
          // Empty state
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "12px 0",
              color: "#374151",
            }}
          >
            <div style={{ fontSize: 22, opacity: 0.4 }}>▷</div>
            <div style={{ fontSize: 11, textAlign: "center", lineHeight: 1.7 }}>
              Press{" "}
              <span
                style={{
                  color: "#60a5fa",
                  fontFamily: "monospace",
                  background: "rgba(96,165,250,0.1)",
                  borderRadius: 3,
                  padding: "1px 5px",
                }}
              >
                ▶ Step
              </span>{" "}
              or{" "}
              <span
                style={{
                  color: "#34d399",
                  fontFamily: "monospace",
                  background: "rgba(52,211,153,0.1)",
                  borderRadius: 3,
                  padding: "1px 5px",
                }}
              >
                ⚡ Run
              </span>{" "}
              to begin
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
