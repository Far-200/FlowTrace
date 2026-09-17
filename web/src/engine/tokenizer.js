// src/engine/tokenizer.js
// ─────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
// The tokenizer is the first stage of the execution pipeline.
// It takes a raw expression string like "x + 2 * y"
// and breaks it into a typed token list:
//   [ {type:"ID", value:"x"}, {type:"OP", value:"+"}, ... ]
// Keeping it isolated means it can be tested and reused
// by any interpreter (C, C++, or future languages).
// ─────────────────────────────────────────────────────────────

/**
 * Converts an expression string into an array of tokens.
 * Each token is: { type: "NUM" | "ID" | "OP", value: any }
 *
 * @param {string} expr - e.g. "x + 2 * (y - 1)"
 * @returns {Array<{type: string, value: any}>}
 */
export function tokenize(expr) {
  const tokens = [];
  let i = 0;

  while (i < expr.length) {
    // Skip whitespace
    if (/\s/.test(expr[i])) {
      i++;
      continue;
    }

    // Number literal (integers and floats)
    if (/[0-9]/.test(expr[i])) {
      let num = "";
      while (i < expr.length && /[0-9.]/.test(expr[i])) num += expr[i++];
      tokens.push({ type: "NUM", value: parseFloat(num) });
      continue;
    }

    // Identifier or keyword (variable names)
    if (/[a-zA-Z_]/.test(expr[i])) {
      let id = "";
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) id += expr[i++];
      tokens.push({ type: "ID", value: id });
      continue;
    }

    // Two-character operators — check BEFORE single-char
    const two = expr.slice(i, i + 2);
    if (["==", "!=", "<=", ">=", "&&", "||"].includes(two)) {
      tokens.push({ type: "OP", value: two });
      i += 2;
      continue;
    }

    // Single-character operator or punctuation
    tokens.push({ type: "OP", value: expr[i] });
    i++;
  }

  return tokens;
}
