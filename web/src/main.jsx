// src/main.jsx
// ─────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
// Entry point. Mounts the React app into #root.
// StrictMode is on — it double-invokes effects in dev
// to surface side-effect bugs early. Safe to remove for prod.
// ─────────────────────────────────────────────────────────────

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
