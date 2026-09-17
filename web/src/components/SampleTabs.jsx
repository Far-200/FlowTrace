// src/components/SampleTabs.jsx
// ─────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
// Renders the row of sample program buttons below the header.
// Receives the sample names for the current language as props
// so it stays purely presentational — no data imports here.
// ─────────────────────────────────────────────────────────────

export default function SampleTabs({ samples, activeSample, onSelect }) {
  const names = Object.keys(samples);

  return (
    <div
      style={{
        padding: "10px 24px",
        borderBottom: "1px solid #1a1f2e",
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <span
        style={{
          fontSize: 10,
          color: "#4b5563",
          marginRight: 4,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        Samples:
      </span>

      {names.map((name) => (
        <button
          key={name}
          className={`sample-btn ${activeSample === name ? "active" : ""}`}
          onClick={() => onSelect(name)}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
