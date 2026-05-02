// src/components/TraceLog.jsx
// ─────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
// Shows the full history of executed steps, newest-first.
// Each row shows the step number and a compact variable snapshot.
// Useful for tracing back *when* a variable changed.
// ─────────────────────────────────────────────────────────────

export default function TraceLog({ varHistory }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <span>📜 Trace Log</span>
        <span style={{ color: "#374151" }}>{varHistory.length} steps</span>
      </div>

      <div style={{ overflowY: "auto", maxHeight: 180, padding: "8px 0" }}>
        {varHistory.length === 0 ? (
          <div
            style={{
              color: "#374151",
              fontSize: 11,
              padding: "8px 16px",
            }}
          >
            No history yet
          </div>
        ) : (
          // Reverse so newest entry is at the top
          [...varHistory].reverse().map((entry, i) => (
            <div
              key={i}
              style={{
                padding: "5px 14px",
                borderBottom: "1px solid #111827",
                fontSize: 11,
                display: "flex",
                justifyContent: "space-between",
                // Fade out older entries slightly
                opacity: i === 0 ? 1 : 0.6,
              }}
            >
              <span style={{ color: "#4b5563" }}>#{entry.stepIdx + 1}</span>
              <span style={{ color: "#6b7280" }}>
                {Object.entries(entry.vars)
                  .map(([k, v]) => `${k}=${v}`)
                  .join("  ")}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
