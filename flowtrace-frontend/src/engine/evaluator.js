// src/engine/evaluator.js
// ─────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
// The evaluator is stage 2 of the pipeline.
// Given an expression string + current variable state,
// it returns a computed numeric value.
//
// It uses a classic Recursive Descent Parser — each function
// handles one level of operator precedence:
//
//   parseExpr → parseOr → parseAnd → parseComparison
//             → parseAddSub → parseMulDiv → parseUnary → parsePrimary
//
// Lower in the chain = higher precedence (evaluated first).
// This is the standard technique used in real compilers.
// ─────────────────────────────────────────────────────────────

import { tokenize } from "./tokenizer.js";

/**
 * Evaluates a math/logic expression string.
 *
 * @param {string} expr    - e.g. "x + 2 * (y - 1)"
 * @param {Object} vars    - current variable state, e.g. { x: 5, y: 3 }
 * @returns {number}       - result of the expression
 * @throws {Error}         - if variable is undeclared or syntax is bad
 */
export function evaluate(expr, vars) {
  const tokens = tokenize(expr);
  let pos = 0;

  // ── Helpers ──────────────────────────────────
  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  // ── Grammar rules (low → high precedence) ────

  function parseExpr() {
    return parseOr();
  }

  function parseOr() {
    let left = parseAnd();
    while (peek()?.value === "||") {
      consume();
      left = left || parseAnd();
    }
    return left;
  }

  function parseAnd() {
    let left = parseComparison();
    while (peek()?.value === "&&") {
      consume();
      left = left && parseComparison();
    }
    return left;
  }

  function parseComparison() {
    let left = parseAddSub();
    const CMP_OPS = ["==", "!=", "<", ">", "<=", ">="];
    while (peek() && CMP_OPS.includes(peek().value)) {
      const op = consume().value;
      const right = parseAddSub();
      if (op === "==") left = left == right ? 1 : 0;
      if (op === "!=") left = left != right ? 1 : 0;
      if (op === "<") left = left < right ? 1 : 0;
      if (op === ">") left = left > right ? 1 : 0;
      if (op === "<=") left = left <= right ? 1 : 0;
      if (op === ">=") left = left >= right ? 1 : 0;
    }
    return left;
  }

  function parseAddSub() {
    let left = parseMulDiv();
    while (peek() && (peek().value === "+" || peek().value === "-")) {
      const op = consume().value;
      const right = parseMulDiv();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  function parseMulDiv() {
    let left = parseUnary();
    while (peek() && ["*", "/", "%"].includes(peek().value)) {
      const op = consume().value;
      const right = parseUnary();
      if (op === "*") left = left * right;
      if (op === "/") left = Math.trunc(left / right);
      if (op === "%") left = left % right;
    }
    return left;
  }

  function parseUnary() {
    if (peek()?.value === "-") {
      consume();
      return -parsePrimary();
    }
    return parsePrimary();
  }

  function parsePrimary() {
    const t = peek();
    if (!t) return 0;

    // Numeric literal
    if (t.type === "NUM") {
      consume();
      return t.value;
    }

    // Variable lookup
    if (t.type === "ID") {
      consume();
      if (t.value in vars) return vars[t.value];
      throw new Error(`Undefined variable: "${t.value}"`);
    }

    // Parenthesized sub-expression
    if (t.value === "(") {
      consume(); // eat "("
      const val = parseExpr();
      consume(); // eat ")"
      return val;
    }

    throw new Error(`Unexpected token: "${t.value}"`);
  }

  return parseExpr();
}
