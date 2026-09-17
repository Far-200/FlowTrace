// src/engine/interpreters/javaInterpreter.js
// ─────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
// Placeholder for the Java interpreter.
// The app imports this file so the module graph is complete,
// but it returns an empty steps array.
// The UI checks languageConfig.supported before calling this,
// so users see "coming soon" instead of a crash.
//
// When you're ready to build it:
//   1. Import evaluate from ../evaluator.js
//   2. Pattern-match Java syntax (System.out.println, etc.)
//   3. Return steps in the same { line, code, variables, note } shape
// ─────────────────────────────────────────────────────────────

/**
 * Java interpreter — not yet implemented.
 * Returns empty steps array so the app never crashes.
 *
 * @returns {Array}
 */
export function runJavaInterpreter() {
  // TODO: implement Java simulation
  return [];
}
