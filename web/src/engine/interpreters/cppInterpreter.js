// src/engine/interpreters/cppInterpreter.js
// ─────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
// C++ syntax is a superset of C for the subset we simulate.
// For the MVP, we delegate directly to the C interpreter.
// This file is the hook for future C++-specific features:
//   - cout << x
//   - auto keyword
//   - range-based for
// When those land, the logic goes here, not in cInterpreter.
// ─────────────────────────────────────────────────────────────

import { runCInterpreter } from "./cInterpreter.js";

/**
 * Runs C++ code through the interpreter.
 * Currently delegates to the C interpreter.
 * Extend this function when C++-specific syntax is added.
 *
 * @param {string} code
 * @returns {Array<{line, code, variables, note}>}
 */
export function runCppInterpreter(code) {
  // Future: pre-process C++-specific syntax before handing to C engine
  // e.g. rewrite `cout << x` → `printf("%d", x)`
  return runCInterpreter(code);
}
