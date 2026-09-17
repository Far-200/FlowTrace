// src/engine/interpreters/pythonInterpreter.js
// ─────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
// Placeholder for the Python interpreter.
// Same contract as javaInterpreter — returns [] safely.
//
// Python will need a different approach because:
//   - No semicolons
//   - Indentation defines blocks (no braces)
//   - Dynamic typing (no `int` keyword)
// The tokenizer and evaluator may need extensions for Python.
// ─────────────────────────────────────────────────────────────

/**
 * Python interpreter — not yet implemented.
 * Returns empty steps array so the app never crashes.
 *
 * @param {string} _code
 * @returns {Array}
 */
export function runPythonInterpreter(_code) {
  // TODO: implement Python simulation
  return [];
}
