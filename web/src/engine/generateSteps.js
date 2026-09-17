// src/engine/generateSteps.js
// ─────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
// This is the single entry point for the entire execution engine.
// The UI never imports individual interpreters directly —
// it only calls generateSteps(code, language).
//
// This file acts as a router:
//   "C code?"   → runCInterpreter
//   "C++ code?" → runCppInterpreter
//   "Java?"     → runJavaInterpreter (placeholder)
//   "Python?"   → runPythonInterpreter (placeholder)
//
// Adding a new language = add one case here + one interpreter file.
// Nothing else in the app needs to change.
// ─────────────────────────────────────────────────────────────

import { runCInterpreter } from "./interpreters/cInterpreter.js";
import { runCppInterpreter } from "./interpreters/cppInterpreter.js";
import { runJavaInterpreter } from "./interpreters/javaInterpreter.js";
import { runPythonInterpreter } from "./interpreters/pythonInterpreter.js";

/**
 * Routes code to the correct interpreter based on language.
 *
 * @param {string} code     - raw source code
 * @param {string} language - "c" | "cpp" | "java" | "python"
 * @returns {Array<{line:number, code:string, variables:Object, note:string}>}
 */
export function generateSteps(code, language) {
  switch (language) {
    case "c":
      return runCInterpreter(code);
    case "cpp":
      return runCppInterpreter(code);
    case "java":
      return runJavaInterpreter(code);
    case "python":
      return runPythonInterpreter(code);
    default:
      console.warn(`[FlowTrace] Unknown language: "${language}"`);
      return [];
  }
}
