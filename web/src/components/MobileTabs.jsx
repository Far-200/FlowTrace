// src/components/MobileTabs.jsx
// ─────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
// On mobile, the right-column panels share a tabbed area.
// This tab bar lets users switch between them one at a time.
// Only rendered on mobile — desktop layout is unchanged.
// ─────────────────────────────────────────────────────────────

const TABS = [
  { id: "step", label: "Step", icon: "⚡" },
  { id: "variables", label: "Variables", icon: "📦" },
  { id: "stack", label: "Stack", icon: "▤" },
  { id: "trace", label: "Trace", icon: "📜" },
];

export default function MobileTabs({
  activeTab,
  onTabChange,
  stepCount,
  varCount,
}) {
  return (
    <div
      style={{
        display: "flex",
        borderBottom: "1px solid #1f2937",
        background: "#0d1117",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;

        // Badge count per tab
        const badge =
          tab.id === "trace"
            ? stepCount
            : tab.id === "variables"
              ? varCount
              : null;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1,
              padding: "12px 4px",
              background: "transparent",
              border: "none",
              borderBottom: isActive
                ? "2px solid #3b82f6"
                : "2px solid transparent",
              color: isActive ? "#e2e8f0" : "#6b7280",
              fontSize: 12,
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: isActive ? 600 : 400,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              transition: "all 0.15s",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <span style={{ fontSize: 14 }}>{tab.icon}</span>
            <span>{tab.label}</span>
            {badge > 0 && (
              <span
                style={{
                  fontSize: 9,
                  background: isActive ? "#3b82f6" : "#1f2937",
                  color: isActive ? "#fff" : "#6b7280",
                  borderRadius: 10,
                  padding: "1px 5px",
                  minWidth: 16,
                  textAlign: "center",
                  fontWeight: 700,
                }}
              >
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
