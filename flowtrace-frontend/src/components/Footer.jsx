// src/components/Footer.jsx
// ─────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
// Simple status bar at the bottom. Shows which language is
// active and a reminder that execution is simulated.
// Trivial now, but a natural place to add keyboard shortcuts
// legend or a status indicator later.
// ─────────────────────────────────────────────────────────────

import { LANGUAGES } from "../utils/languageConfig.js";

export default function Footer({ language }) {
  const cfg = LANGUAGES[language];

  return (
    <div
      style={{
        borderTop: "1px solid #111827",
        padding: "10px 24px",
        fontSize: 10,
        color: "#374151",
        display: "flex",
        justifyContent: "space-between",
        background: "#0d1117",
      }}
    >
      <span>
        FlowTrace MVP · Language:{" "}
        <span style={{ color: "#6b7280" }}>
          {cfg?.icon} {cfg?.label}
        </span>
        {" · "}
        Supports: int, if/else, while, for, printf
      </span>
      <span>No compilation — pure simulation engine</span>
    </div>
  );
}
