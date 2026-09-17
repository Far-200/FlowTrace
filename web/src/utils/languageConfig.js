// src/utils/languageConfig.js
// ─────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
// Single source of truth for every language FlowTrace knows about.
// Any component that needs a language's label, icon, or support
// status imports from here — no magic strings scattered around.
// ─────────────────────────────────────────────────────────────

export const LANGUAGES = {
  c: {
    id: "c",
    label: "C",
    icon: "⚙️",
    supported: true, // full interpreter exists
    comingSoon: null,
  },
  cpp: {
    id: "cpp",
    label: "C++",
    icon: "➕",
    supported: true, // reuses C interpreter for now
    comingSoon: null,
  },
  java: {
    id: "java",
    label: "Java",
    icon: "☕",
    supported: false,
    comingSoon: "Java simulation support is coming soon.",
  },
  python: {
    id: "python",
    label: "Python",
    icon: "🐍",
    supported: false,
    comingSoon: "Python simulation support is coming soon.",
  },
};

// Ordered list used to render the language selector tabs
export const LANGUAGE_LIST = ["c", "cpp", "java", "python"];
