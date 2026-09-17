// src/components/Header.jsx
// ─────────────────────────────────────────────────────────────
// CHANGES: accepts isMobile prop.
// Mobile: smaller logo text, no subtitle, compact language tabs.
// Desktop: identical to before.
// ─────────────────────────────────────────────────────────────

import { LANGUAGES, LANGUAGE_LIST } from "../utils/languageConfig.js";

export default function Header({
  language,
  onLanguageChange,
  stepIdx,
  totalSteps,
  isMobile = false,
}) {
  return (
    <div
      style={{
        borderBottom: "1px solid #1f2937",
        background: "#0d1117",
      }}
    >
      {/* ── Top row ── */}
      <div
        style={{
          padding: isMobile ? "10px 14px" : "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isMobile ? 10 : 14,
          }}
        >
          <div
            style={{
              width: isMobile ? 28 : 34,
              height: isMobile ? 28 : 34,
              borderRadius: 8,
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: isMobile ? 13 : 16,
              flexShrink: 0,
            }}
          >
            ⚡
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: isMobile ? 14 : 17,
                letterSpacing: "-0.02em",
              }}
            >
              FlowTrace
            </div>
            {/* Hide subtitle on mobile */}
            {!isMobile && (
              <div
                style={{
                  fontSize: 10,
                  color: "#4b5563",
                  letterSpacing: "0.05em",
                }}
              >
                CODE EXECUTION VISUALIZER
              </div>
            )}
          </div>
        </div>

        {/* Step counter */}
        {totalSteps > 0 && (
          <div
            style={{
              fontSize: isMobile ? 11 : 12,
              color: "#6b7280",
              fontFamily: "monospace",
            }}
          >
            <span style={{ color: "#60a5fa", fontWeight: 700 }}>
              {stepIdx + 1}
            </span>
            {" / "}
            {totalSteps}
          </div>
        )}
      </div>

      {/* ── Language tabs ── */}
      <div
        style={{
          display: "flex",
          gap: isMobile ? 0 : 2,
          padding: isMobile ? "0 8px" : "0 24px 0",
          borderTop: "1px solid #111827",
          overflowX: "auto", // allow horizontal scroll on tiny screens
          WebkitOverflowScrolling: "touch",
        }}
      >
        {LANGUAGE_LIST.map((lang) => {
          const cfg = LANGUAGES[lang];
          const isActive = language === lang;
          return (
            <button
              key={lang}
              onClick={() => onLanguageChange(lang)}
              style={{
                background: isActive ? "#111827" : "transparent",
                border: "none",
                borderBottom: isActive
                  ? "2px solid #3b82f6"
                  : "2px solid transparent",
                color: isActive ? "#e2e8f0" : "#6b7280",
                padding: isMobile ? "9px 12px" : "10px 16px",
                fontSize: isMobile ? 11 : 12,
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: isActive ? 600 : 400,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: isMobile ? 4 : 6,
                transition: "all 0.15s",
                borderRadius: "6px 6px 0 0",
                flexShrink: 0,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <span>{cfg.icon}</span>
              <span>{cfg.label}</span>
              {!cfg.supported && (
                <span
                  style={{
                    fontSize: 9,
                    background: "#1f2937",
                    color: "#6b7280",
                    borderRadius: 4,
                    padding: "1px 4px",
                  }}
                >
                  {isMobile ? "·" : "SOON"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
