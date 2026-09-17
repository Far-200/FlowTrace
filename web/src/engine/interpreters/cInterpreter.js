// src/engine/interpreters/cInterpreter.js
// ═══════════════════════════════════════════════════════════════
// FlowTrace — AST-based C Interpreter
//
// ARCHITECTURE:
//   Raw code → Lexer → Parser → AST → Interpreter → steps[]
//
// PUBLIC API:
//   runCInterpreter(code: string) → Step[]
//   Step = { line: number, code: string, variables: Object, note: string }
//
// SUPPORTED:
//   ✅ int / float / char declarations + assignments
//   ✅ Arrays: int arr[5] = {1,2,3}; arr[i] = x; x = arr[i];
//   ✅ Arithmetic: + - * / %
//   ✅ Compound assignment: += -= *= /= %=
//   ✅ Increment/decrement: x++ x-- ++x --x
//   ✅ Comparison: == != < > <= >=
//   ✅ Logical: && ||
//   ✅ Unary: - !
//   ✅ if / else if / else
//   ✅ while / for / do-while
//   ✅ Nested blocks (any depth)
//   ✅ printf simulation (%d %i %f %c %s)
//   ✅ return statement
//   ✅ // and /* */ comments stripped
//   ✅ #include / preprocessor silently ignored
//   ✅ Clean runtime error messages
//   ❌ Pointers, structs, functions, malloc
// ═══════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────
// SECTION 1 — LEXER
// ───────────────────────────────────────────────────────────────

const TT = {
  NUMBER: "NUMBER",
  STRING: "STRING",
  IDENT: "IDENT",
  INT: "int",
  FLOAT: "float",
  CHAR: "char",
  DOUBLE: "double",
  LONG: "long",
  SHORT: "short",
  VOID: "void",
  IF: "if",
  ELSE: "else",
  WHILE: "while",
  FOR: "for",
  DO: "do",
  RETURN: "return",
  PRINTF: "printf",
  PLUS: "+",
  MINUS: "-",
  STAR: "*",
  SLASH: "/",
  PERCENT: "%",
  AMP: "&",
  PIPE: "|",
  EQ: "=",
  EQEQ: "==",
  BANGEQ: "!=",
  LT: "<",
  GT: ">",
  LTEQ: "<=",
  GTEQ: ">=",
  AMPAMP: "&&",
  PIPEPIPE: "||",
  BANG: "!",
  PLUSPLUS: "++",
  MINUSMINUS: "--",
  PLUSEQ: "+=",
  MINUSEQ: "-=",
  STAREQ: "*=",
  SLASHEQ: "/=",
  PERCENTEQ: "%=",
  LPAREN: "(",
  RPAREN: ")",
  LBRACE: "{",
  RBRACE: "}",
  LBRACKET: "[",
  RBRACKET: "]",
  SEMI: ";",
  COMMA: ",",
  HASH: "#",
  EOF: "EOF",
};

const KEYWORDS = {
  int: TT.INT,
  float: TT.FLOAT,
  char: TT.CHAR,
  double: TT.DOUBLE,
  long: TT.LONG,
  short: TT.SHORT,
  void: TT.VOID,
  if: TT.IF,
  else: TT.ELSE,
  while: TT.WHILE,
  for: TT.FOR,
  do: TT.DO,
  return: TT.RETURN,
  printf: TT.PRINTF,
};

const TYPE_KEYWORDS = new Set([
  TT.INT,
  TT.FLOAT,
  TT.CHAR,
  TT.DOUBLE,
  TT.LONG,
  TT.SHORT,
  TT.VOID,
]);

function lex(source) {
  const tokens = [];
  let i = 0;
  let line = 1;

  // Strip block comments character by character (avoids regex /* */ issues)
  let stripped = "";
  let ci = 0;
  while (ci < source.length) {
    if (source[ci] === "/" && source[ci + 1] === "*") {
      ci += 2;
      let nlCount = 0;
      while (ci < source.length) {
        if (source[ci] === "\n") nlCount++;
        if (source[ci] === "*" && source[ci + 1] === "/") {
          ci += 2;
          break;
        }
        ci++;
      }
      stripped += "\n".repeat(nlCount);
    } else {
      stripped += source[ci++];
    }
  }
  source = stripped;

  while (i < source.length) {
    const ch = source[i];

    if (ch === "\n") {
      line++;
      i++;
      continue;
    }
    if (/[ \t\r]/.test(ch)) {
      i++;
      continue;
    }
    if (ch === "/" && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }
    if (ch === "#") {
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }

    // String literal
    if (ch === '"') {
      let str = "";
      i++;
      while (i < source.length && source[i] !== '"') {
        if (source[i] === "\\" && source[i + 1]) {
          str += source[i] + source[i + 1];
          i += 2;
        } else str += source[i++];
      }
      i++;
      tokens.push({ type: TT.STRING, value: str, line });
      continue;
    }

    // Char literal
    if (ch === "'") {
      i++;
      let val = source[i];
      if (val === "\\" && source[i + 1]) {
        val = source[i + 1];
        i++;
      }
      i += 2;
      tokens.push({ type: TT.NUMBER, value: val.charCodeAt(0), line });
      continue;
    }

    // Number
    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(source[i + 1]))) {
      let num = "";
      while (i < source.length && /[0-9.]/.test(source[i])) num += source[i++];
      tokens.push({ type: TT.NUMBER, value: parseFloat(num), line });
      continue;
    }

    // Identifier / keyword
    if (/[a-zA-Z_]/.test(ch)) {
      let id = "";
      while (i < source.length && /[a-zA-Z0-9_]/.test(source[i]))
        id += source[i++];
      tokens.push({ type: KEYWORDS[id] || TT.IDENT, value: id, line });
      continue;
    }

    // Two-char operators
    const two = source.slice(i, i + 2);
    const twoMap = {
      "==": TT.EQEQ,
      "!=": TT.BANGEQ,
      "<=": TT.LTEQ,
      ">=": TT.GTEQ,
      "&&": TT.AMPAMP,
      "||": TT.PIPEPIPE,
      "++": TT.PLUSPLUS,
      "--": TT.MINUSMINUS,
      "+=": TT.PLUSEQ,
      "-=": TT.MINUSEQ,
      "*=": TT.STAREQ,
      "/=": TT.SLASHEQ,
      "%=": TT.PERCENTEQ,
    };
    if (twoMap[two]) {
      tokens.push({ type: twoMap[two], value: two, line });
      i += 2;
      continue;
    }

    // Single-char operators
    const oneMap = {
      "+": TT.PLUS,
      "-": TT.MINUS,
      "*": TT.STAR,
      "/": TT.SLASH,
      "%": TT.PERCENT,
      "=": TT.EQ,
      "<": TT.LT,
      ">": TT.GT,
      "!": TT.BANG,
      "&": TT.AMP,
      "|": TT.PIPE,
      "(": TT.LPAREN,
      ")": TT.RPAREN,
      "{": TT.LBRACE,
      "}": TT.RBRACE,
      "[": TT.LBRACKET,
      "]": TT.RBRACKET,
      ";": TT.SEMI,
      ",": TT.COMMA,
    };
    if (oneMap[ch]) {
      tokens.push({ type: oneMap[ch], value: ch, line });
      i++;
      continue;
    }

    i++; // unknown char — skip
  }

  tokens.push({ type: TT.EOF, value: "", line });
  return tokens;
}

// ───────────────────────────────────────────────────────────────
// SECTION 2 — PARSER
// ───────────────────────────────────────────────────────────────

function parse(tokens) {
  let pos = 0;

  const peek = () => tokens[pos];
  const peekType = () => tokens[pos].type;
  const advance = () => tokens[pos++];
  const check = (t) => peekType() === t;
  const isAtEnd = () => peekType() === TT.EOF;

  function expect(type, msg) {
    if (check(type)) return advance();
    const tok = peek();
    throw new ParseError(`Line ${tok.line}: ${msg} (got "${tok.value}")`);
  }

  class ParseError extends Error {}

  // ── PROGRAM ──────────────────────────────────────────────
  function parseProgram() {
    const body = [];
    while (!isAtEnd()) {
      try {
        const stmt = parseStatement();
        if (stmt) body.push(stmt);
      } catch (e) {
        if (e instanceof ParseError) throw e;
        advance();
      }
    }
    return { kind: "Program", body };
  }

  // ── STATEMENT ────────────────────────────────────────────
  function parseStatement() {
    if (check(TT.SEMI)) {
      advance();
      return null;
    }
    if (check(TT.LBRACE)) return parseBlock();
    if (TYPE_KEYWORDS.has(peekType())) return parseVarDecl();
    if (check(TT.IF)) return parseIf();
    if (check(TT.WHILE)) return parseWhile();
    if (check(TT.FOR)) return parseFor();
    if (check(TT.DO)) return parseDoWhile();
    if (check(TT.RETURN)) return parseReturn();
    if (check(TT.PRINTF)) return parsePrintf();
    return parseExprStmt();
  }

  // ── BLOCK ────────────────────────────────────────────────
  function parseBlock() {
    const line = peek().line;
    expect(TT.LBRACE, "Expected '{'");
    const body = [];
    while (!check(TT.RBRACE) && !isAtEnd()) {
      const stmt = parseStatement();
      if (stmt) body.push(stmt);
    }
    expect(TT.RBRACE, "Expected '}'");
    return { kind: "Block", body, line };
  }

  // ── VAR DECLARATION (scalars + arrays) ───────────────────
  function parseVarDecl() {
    const line = peek().line;
    const typeTok = advance();
    const typeName = typeTok.value;
    const name = expect(TT.IDENT, "Expected variable name").value;

    // ── Array declaration: int arr[N] or int arr[N] = {…} ──
    if (check(TT.LBRACKET)) {
      advance(); // consume '['
      let sizeNode = null;
      if (!check(TT.RBRACKET)) sizeNode = parseExpr();
      expect(TT.RBRACKET, "Expected ']' after array size");

      let elements = [];
      if (check(TT.EQ)) {
        advance(); // consume '='
        expect(TT.LBRACE, "Expected '{' in array initializer");
        while (!check(TT.RBRACE) && !isAtEnd()) {
          elements.push(parseExpr());
          if (check(TT.COMMA)) advance();
        }
        expect(TT.RBRACE, "Expected '}' in array initializer");
      }
      expect(TT.SEMI, "Expected ';' after array declaration");
      return { kind: "ArrayDecl", typeName, name, sizeNode, elements, line };
    }

    // ── Scalar declaration: int x = expr; or int x, y = 2; ──
    let init = null;
    if (check(TT.EQ)) {
      advance();
      init = parseExpr();
    }

    const decls = [{ name, init, line }];
    while (check(TT.COMMA)) {
      advance();
      const nextLine = peek().line;
      const nextName = expect(TT.IDENT, "Expected variable name").value;
      let nextInit = null;
      if (check(TT.EQ)) {
        advance();
        nextInit = parseExpr();
      }
      decls.push({ name: nextName, init: nextInit, line: nextLine });
    }

    expect(TT.SEMI, "Expected ';' after declaration");
    return { kind: "VarDeclList", typeName, decls, line };
  }

  // ── IF / ELSE ────────────────────────────────────────────
  function parseIf() {
    const line = peek().line;
    advance();
    expect(TT.LPAREN, "Expected '(' after 'if'");
    const condition = parseExpr();
    expect(TT.RPAREN, "Expected ')' after condition");
    const consequent = parseStatement();
    let alternate = null;
    if (check(TT.ELSE)) {
      advance();
      alternate = parseStatement();
    }
    return { kind: "If", condition, consequent, alternate, line };
  }

  // ── WHILE ────────────────────────────────────────────────
  function parseWhile() {
    const line = peek().line;
    advance();
    expect(TT.LPAREN, "Expected '(' after 'while'");
    const condition = parseExpr();
    expect(TT.RPAREN, "Expected ')' after condition");
    const body = parseStatement();
    return { kind: "While", condition, body, line };
  }

  // ── FOR ──────────────────────────────────────────────────
  function parseFor() {
    const line = peek().line;
    advance();
    expect(TT.LPAREN, "Expected '(' after 'for'");

    let init = null;
    if (!check(TT.SEMI)) {
      if (TYPE_KEYWORDS.has(peekType())) {
        init = parseVarDecl(); // consumes its own ';'
      } else {
        const expr = parseExpr();
        expect(TT.SEMI, "Expected ';' in for-init");
        init = { kind: "ExprStmt", expr, line: expr.line };
      }
    } else {
      advance();
    }

    let condition = null;
    if (!check(TT.SEMI)) condition = parseExpr();
    expect(TT.SEMI, "Expected ';' in for-condition");

    let update = null;
    if (!check(TT.RPAREN)) update = parseExpr();
    expect(TT.RPAREN, "Expected ')' after for-clauses");

    const body = parseStatement();
    return { kind: "For", init, condition, update, body, line };
  }

  // ── DO-WHILE ─────────────────────────────────────────────
  function parseDoWhile() {
    const line = peek().line;
    advance();
    const body = parseStatement();
    expect(TT.WHILE, "Expected 'while' after do-body");
    expect(TT.LPAREN, "Expected '(' after 'while'");
    const condition = parseExpr();
    expect(TT.RPAREN, "Expected ')'");
    expect(TT.SEMI, "Expected ';' after do-while");
    return { kind: "DoWhile", condition, body, line };
  }

  // ── RETURN ───────────────────────────────────────────────
  function parseReturn() {
    const line = peek().line;
    advance();
    let value = null;
    if (!check(TT.SEMI)) value = parseExpr();
    expect(TT.SEMI, "Expected ';' after return");
    return { kind: "Return", value, line };
  }

  // ── PRINTF ───────────────────────────────────────────────
  function parsePrintf() {
    const line = peek().line;
    advance();
    expect(TT.LPAREN, "Expected '(' after printf");
    const fmt = expect(TT.STRING, "Expected format string in printf").value;
    const args = [];
    while (check(TT.COMMA)) {
      advance();
      args.push(parseExpr());
    }
    expect(TT.RPAREN, "Expected ')' after printf args");
    expect(TT.SEMI, "Expected ';' after printf");
    return { kind: "Printf", fmt, args, line };
  }

  // ── EXPRESSION STATEMENT ─────────────────────────────────
  function parseExprStmt() {
    const line = peek().line;
    // Skip unsupported function calls (scanf, main, etc.)
    if (check(TT.IDENT) && tokens[pos + 1]?.type === TT.LPAREN) {
      while (!check(TT.SEMI) && !check(TT.RBRACE) && !isAtEnd()) advance();
      if (check(TT.SEMI)) advance();
      return null;
    }
    const expr = parseExpr();
    expect(TT.SEMI, "Expected ';' after expression");
    return { kind: "ExprStmt", expr, line };
  }

  // ── EXPRESSIONS (lowest → highest precedence) ────────────

  function parseExpr() {
    return parseAssignment();
  }

  function parseAssignment() {
    const line = peek().line;

    // Pre-increment/decrement: ++x  --x
    if (check(TT.PLUSPLUS) || check(TT.MINUSMINUS)) {
      const op = advance().type;
      const name = expect(TT.IDENT, "Expected variable after prefix op").value;
      return { kind: "PreUpdate", op, name, line };
    }

    // ── Array element assignment: arr[i] = expr ──────────────
    if (check(TT.IDENT) && tokens[pos + 1]?.type === TT.LBRACKET) {
      const name = advance().value; // consume IDENT
      advance(); // consume '['
      const index = parseExpr();
      expect(TT.RBRACKET, "Expected ']'");

      const assignOps = new Set([
        TT.EQ,
        TT.PLUSEQ,
        TT.MINUSEQ,
        TT.STAREQ,
        TT.SLASHEQ,
        TT.PERCENTEQ,
      ]);
      if (assignOps.has(tokens[pos]?.type)) {
        const op = advance().type;
        const value = parseAssignment();
        return { kind: "ArrayAssign", name, index, op, value, line };
      }
      // Not an assignment — it's a read (arr[i] used as expression)
      // Return ArrayAccess so evalExpr can handle it
      return { kind: "ArrayAccess", name, index, line };
    }

    // ── Scalar assignment: x = expr ──────────────────────────
    if (check(TT.IDENT)) {
      const assignOps = new Set([
        TT.EQ,
        TT.PLUSEQ,
        TT.MINUSEQ,
        TT.STAREQ,
        TT.SLASHEQ,
        TT.PERCENTEQ,
      ]);
      if (assignOps.has(tokens[pos + 1]?.type)) {
        const name = advance().value;
        const op = advance().type;
        const value = parseAssignment();
        return { kind: "Assign", name, op, value, line };
      }
    }

    return parseLogical();
  }

  function parseLogical() {
    let left = parseComparison();
    while (check(TT.AMPAMP) || check(TT.PIPEPIPE)) {
      const op = advance().value;
      const right = parseComparison();
      left = { kind: "Binary", op, left, right, line: left.line };
    }
    return left;
  }

  function parseComparison() {
    let left = parseAddSub();
    const cmpOps = new Set([
      TT.EQEQ,
      TT.BANGEQ,
      TT.LT,
      TT.GT,
      TT.LTEQ,
      TT.GTEQ,
    ]);
    while (cmpOps.has(peekType())) {
      const op = advance().value;
      const right = parseAddSub();
      left = { kind: "Binary", op, left, right, line: left.line };
    }
    return left;
  }

  function parseAddSub() {
    let left = parseMulDiv();
    while (check(TT.PLUS) || check(TT.MINUS)) {
      const op = advance().value;
      const right = parseMulDiv();
      left = { kind: "Binary", op, left, right, line: left.line };
    }
    return left;
  }

  function parseMulDiv() {
    let left = parseUnary();
    while (check(TT.STAR) || check(TT.SLASH) || check(TT.PERCENT)) {
      const op = advance().value;
      const right = parseUnary();
      left = { kind: "Binary", op, left, right, line: left.line };
    }
    return left;
  }

  function parseUnary() {
    const line = peek().line;
    if (check(TT.MINUS)) {
      advance();
      return { kind: "Unary", op: "-", expr: parseUnary(), line };
    }
    if (check(TT.BANG)) {
      advance();
      return { kind: "Unary", op: "!", expr: parseUnary(), line };
    }
    return parsePostfix();
  }

  function parsePostfix() {
    let node = parsePrimary();
    if (check(TT.PLUSPLUS)) {
      advance();
      return { kind: "PostUpdate", op: "++", name: node.name, line: node.line };
    }
    if (check(TT.MINUSMINUS)) {
      advance();
      return { kind: "PostUpdate", op: "--", name: node.name, line: node.line };
    }
    return node;
  }

  function parsePrimary() {
    const tok = peek();

    if (check(TT.NUMBER)) {
      advance();
      return { kind: "Literal", value: tok.value, line: tok.line };
    }

    if (check(TT.IDENT)) {
      advance();
      // ── Array element read: arr[i] ────────────────────────
      if (check(TT.LBRACKET)) {
        advance(); // consume '['
        const index = parseExpr();
        expect(TT.RBRACKET, "Expected ']'");
        return { kind: "ArrayAccess", name: tok.value, index, line: tok.line };
      }
      return { kind: "Identifier", name: tok.value, line: tok.line };
    }

    if (check(TT.LPAREN)) {
      advance();
      const expr = parseExpr();
      expect(TT.RPAREN, "Expected ')'");
      return expr;
    }

    // Unexpected token — return 0 literal and skip
    const line = tok.line;
    advance();
    return { kind: "Literal", value: 0, line };
  }

  return parseProgram();
}

// ───────────────────────────────────────────────────────────────
// SECTION 3 — INTERPRETER
// ───────────────────────────────────────────────────────────────

const MAX_ITER = 100;

function interpret(ast, sourceLines) {
  const steps = [];
  const env = {}; // { varName: number | number[] }

  function addStep(lineNum, note = "") {
    const code = (sourceLines[lineNum - 1] ?? "").trim();
    // Snapshot env — arrays need a shallow copy of their contents
    const variables = {};
    for (const [k, v] of Object.entries(env)) {
      variables[k] = Array.isArray(v) ? [...v] : v;
    }
    steps.push({ line: lineNum, code, variables, note });
  }

  // ── EXPRESSION EVALUATOR ──────────────────────────────────
  function evalExpr(node) {
    switch (node.kind) {
      case "Literal":
        return node.value;

      case "Identifier": {
        if (!(node.name in env)) {
          throw new RuntimeError(
            `Undefined variable "${node.name}"`,
            node.line,
          );
        }
        const v = env[node.name];
        // If someone uses the array name bare (not indexed), return length
        if (Array.isArray(v)) return v.length;
        return v;
      }

      // ── Array element READ ──────────────────────────────────
      case "ArrayAccess": {
        const arr = env[node.name];
        if (!Array.isArray(arr)) {
          throw new RuntimeError(`"${node.name}" is not an array`, node.line);
        }
        const idx = Math.trunc(evalExpr(node.index));
        if (idx < 0 || idx >= arr.length) {
          throw new RuntimeError(
            `Index ${idx} out of bounds for "${node.name}" (size ${arr.length})`,
            node.line,
          );
        }
        return arr[idx];
      }

      // ── Array element WRITE ─────────────────────────────────
      case "ArrayAssign": {
        const arr = env[node.name];
        if (!Array.isArray(arr)) {
          throw new RuntimeError(`"${node.name}" is not an array`, node.line);
        }
        const idx = Math.trunc(evalExpr(node.index));
        if (idx < 0 || idx >= arr.length) {
          throw new RuntimeError(
            `Index ${idx} out of bounds for "${node.name}" (size ${arr.length})`,
            node.line,
          );
        }
        const rhs = evalExpr(node.value);
        switch (node.op) {
          case TT.EQ:
            arr[idx] = rhs;
            break;
          case TT.PLUSEQ:
            arr[idx] += rhs;
            break;
          case TT.MINUSEQ:
            arr[idx] -= rhs;
            break;
          case TT.STAREQ:
            arr[idx] *= rhs;
            break;
          case TT.SLASHEQ:
            if (rhs === 0)
              throw new RuntimeError("Division by zero", node.line);
            arr[idx] = Math.trunc(arr[idx] / rhs);
            break;
          case TT.PERCENTEQ:
            arr[idx] %= rhs;
            break;
        }
        return arr[idx];
      }

      case "Binary": {
        const L = evalExpr(node.left);
        const R = evalExpr(node.right);
        switch (node.op) {
          case "+":
            return L + R;
          case "-":
            return L - R;
          case "*":
            return L * R;
          case "/":
            if (R === 0) throw new RuntimeError("Division by zero", node.line);
            return Math.trunc(L / R);
          case "%":
            if (R === 0) throw new RuntimeError("Modulo by zero", node.line);
            return L % R;
          case "==":
            return L === R ? 1 : 0;
          case "!=":
            return L !== R ? 1 : 0;
          case "<":
            return L < R ? 1 : 0;
          case ">":
            return L > R ? 1 : 0;
          case "<=":
            return L <= R ? 1 : 0;
          case ">=":
            return L >= R ? 1 : 0;
          case "&&":
            return L && R ? 1 : 0;
          case "||":
            return L || R ? 1 : 0;
          default:
            return 0;
        }
      }

      case "Unary": {
        const val = evalExpr(node.expr);
        if (node.op === "-") return -val;
        if (node.op === "!") return val === 0 ? 1 : 0;
        return val;
      }

      case "Assign": {
        const rhs = evalExpr(node.value);
        if (!(node.name in env) && node.op !== TT.EQ) {
          throw new RuntimeError(
            `Undeclared variable "${node.name}"`,
            node.line,
          );
        }
        switch (node.op) {
          case TT.EQ:
            env[node.name] = rhs;
            break;
          case TT.PLUSEQ:
            env[node.name] += rhs;
            break;
          case TT.MINUSEQ:
            env[node.name] -= rhs;
            break;
          case TT.STAREQ:
            env[node.name] *= rhs;
            break;
          case TT.SLASHEQ:
            if (rhs === 0)
              throw new RuntimeError("Division by zero", node.line);
            env[node.name] = Math.trunc(env[node.name] / rhs);
            break;
          case TT.PERCENTEQ:
            env[node.name] %= rhs;
            break;
        }
        return env[node.name];
      }

      case "PostUpdate": {
        const before = env[node.name] ?? 0;
        env[node.name] = node.op === "++" ? before + 1 : before - 1;
        return before;
      }

      case "PreUpdate": {
        env[node.name] =
          (env[node.name] ?? 0) + (node.op === TT.PLUSPLUS ? 1 : -1);
        return env[node.name];
      }

      default:
        return 0;
    }
  }

  // ── STATEMENT EXECUTOR ────────────────────────────────────
  function execStmt(node) {
    if (!node) return null;

    switch (node.kind) {
      case "Program":
      case "Block": {
        for (const stmt of node.body) {
          const sig = execStmt(stmt);
          if (sig === "return") return sig;
        }
        return null;
      }

      // ── Scalar variable declaration ───────────────────────
      case "VarDeclList": {
        for (const decl of node.decls) {
          let val = 0;
          if (decl.init) {
            try {
              val = evalExpr(decl.init);
            } catch (e) {
              addStep(decl.line, `⚠️ ${e.message}`);
              continue;
            }
          }
          env[decl.name] = val;
          addStep(
            decl.line,
            decl.init
              ? `Declared ${decl.name} = ${fmt(val)}`
              : `Declared ${decl.name} = 0 (uninitialized)`,
          );
        }
        return null;
      }

      // ── Array declaration ─────────────────────────────────
      case "ArrayDecl": {
        // Determine size: explicit size OR length of initializer list
        let size = node.elements.length;
        if (node.sizeNode) {
          try {
            size = Math.max(
              Math.trunc(evalExpr(node.sizeNode)),
              node.elements.length,
            );
          } catch (e) {
            addStep(node.line, `⚠️ ${e.message}`);
            return null;
          }
        }

        const arr = [];
        for (let k = 0; k < size; k++) {
          if (k < node.elements.length) {
            try {
              arr.push(evalExpr(node.elements[k]));
            } catch {
              arr.push(0);
            }
          } else {
            arr.push(0); // C zero-initializes remaining elements
          }
        }

        env[node.name] = arr;
        addStep(
          node.line,
          `Declared ${node.name}[${size}] = [${arr.join(", ")}]`,
        );
        return null;
      }

      // ── Expression statement ──────────────────────────────
      case "ExprStmt": {
        const { expr } = node;
        try {
          const val = evalExpr(expr);
          let note = "";

          if (expr.kind === "Assign") {
            note = `${expr.name} = ${fmt(env[expr.name])}`;
          } else if (expr.kind === "ArrayAssign") {
            const arr = env[expr.name];
            const idx = Math.trunc(evalExpr(expr.index));
            note = `${expr.name}[${idx}] = ${fmt(arr[idx])}  →  [${arr.join(", ")}]`;
          } else if (expr.kind === "PostUpdate" || expr.kind === "PreUpdate") {
            note = `${expr.name} ${expr.op} → ${fmt(env[expr.name])}`;
          } else {
            note = `→ ${fmt(val)}`;
          }
          addStep(node.line, note);
        } catch (e) {
          addStep(node.line, `⚠️ ${e.message}`);
        }
        return null;
      }

      // ── If / Else ─────────────────────────────────────────
      case "If": {
        let condVal;
        try {
          condVal = evalExpr(node.condition);
        } catch (e) {
          addStep(node.line, `⚠️ ${e.message}`);
          return null;
        }

        const condSrc = exprToString(node.condition);
        addStep(
          node.line,
          `if (${condSrc}) → ${condVal ? "TRUE ✓" : "FALSE ✗"}`,
        );

        if (condVal) {
          return execStmt(node.consequent);
        } else if (node.alternate) {
          const elseLine = findElseLine(node.line, sourceLines);
          addStep(elseLine, `→ Taking else branch`);
          return execStmt(node.alternate);
        }
        return null;
      }

      // ── While ─────────────────────────────────────────────
      case "While": {
        let iters = 0;
        const condSrc = exprToString(node.condition);
        while (true) {
          let condVal;
          try {
            condVal = evalExpr(node.condition);
          } catch (e) {
            addStep(node.line, `⚠️ ${e.message}`);
            break;
          }

          addStep(
            node.line,
            `while (${condSrc}) → ${
              condVal
                ? `TRUE ✓  (iteration ${iters + 1})`
                : "FALSE ✗ — exit loop"
            }`,
          );
          if (!condVal) break;
          if (++iters > MAX_ITER) {
            addStep(
              node.line,
              `⚠️ Loop exceeded ${MAX_ITER} iterations — stopped`,
            );
            break;
          }
          const sig = execStmt(node.body);
          if (sig === "return") return sig;
        }
        return null;
      }

      // ── For ───────────────────────────────────────────────
      case "For": {
        if (node.init) execStmt(node.init);
        let iters = 0;
        const condSrc = node.condition ? exprToString(node.condition) : "true";
        while (true) {
          let condVal = 1;
          if (node.condition) {
            try {
              condVal = evalExpr(node.condition);
            } catch (e) {
              addStep(node.line, `⚠️ ${e.message}`);
              break;
            }
          }
          addStep(
            node.line,
            `for (${condSrc}) → ${
              condVal
                ? `TRUE ✓  (iteration ${iters + 1})`
                : "FALSE ✗ — exit loop"
            }`,
          );
          if (!condVal) break;
          if (++iters > MAX_ITER) {
            addStep(
              node.line,
              `⚠️ Loop exceeded ${MAX_ITER} iterations — stopped`,
            );
            break;
          }
          const sig = execStmt(node.body);
          if (sig === "return") return sig;
          if (node.update) {
            try {
              evalExpr(node.update);
            } catch (e) {
              addStep(node.line, `⚠️ ${e.message}`);
              break;
            }
            addStep(node.line, buildUpdateNote(node.update));
          }
        }
        return null;
      }

      // ── Do-While ──────────────────────────────────────────
      case "DoWhile": {
        let iters = 0;
        const condSrc = exprToString(node.condition);
        for (;;) {
          if (++iters > MAX_ITER) {
            addStep(
              node.line,
              `⚠️ Loop exceeded ${MAX_ITER} iterations — stopped`,
            );
            break;
          }
          const sig = execStmt(node.body);
          if (sig === "return") return sig;
          let condVal;
          try {
            condVal = evalExpr(node.condition);
          } catch (e) {
            addStep(node.line, `⚠️ ${e.message}`);
            break;
          }
          addStep(
            node.line,
            `do-while (${condSrc}) → ${condVal ? "TRUE ✓ — continue" : "FALSE ✗ — exit loop"}`,
          );
          if (!condVal) break;
        }
        return null;
      }

      // ── Printf ────────────────────────────────────────────
      case "Printf": {
        let output = node.fmt.replace(/\\n/g, "↵").replace(/\\t/g, "→");

        let argIdx = 0;
        output = output.replace(/%[difc s%]/g, (spec) => {
          if (spec === "%%") return "%";
          if (argIdx >= node.args.length) return spec;
          try {
            const val = evalExpr(node.args[argIdx++]);
            if (spec === "%c") return String.fromCharCode(val);
            if (spec === "%f") return val.toFixed(6);
            return String(Math.trunc(val));
          } catch {
            return "?";
          }
        });

        addStep(node.line, `📤 Output: "${output}"`);
        return null;
      }

      // ── Return ────────────────────────────────────────────
      case "Return": {
        let val = 0;
        if (node.value) {
          try {
            val = evalExpr(node.value);
          } catch (e) {
            addStep(node.line, `⚠️ ${e.message}`);
            return "return";
          }
        }
        addStep(node.line, `↩ return ${fmt(val)}`);
        return "return";
      }

      default:
        return null;
    }
  }

  execStmt(ast);
  return steps;
}

// ───────────────────────────────────────────────────────────────
// SECTION 4 — UTILITIES
// ───────────────────────────────────────────────────────────────

class RuntimeError extends Error {
  constructor(msg, line) {
    super(`Line ${line}: ${msg}`);
    this.line = line;
  }
}

function fmt(val) {
  if (Array.isArray(val)) return `[${val.join(", ")}]`;
  if (Number.isInteger(val)) return String(val);
  return val.toFixed(4).replace(/\.?0+$/, "");
}

function exprToString(node) {
  if (!node) return "";
  switch (node.kind) {
    case "Literal":
      return String(node.value);
    case "Identifier":
      return node.name;
    case "ArrayAccess":
      return `${node.name}[${exprToString(node.index)}]`;
    case "ArrayAssign":
      return `${node.name}[${exprToString(node.index)}] ${node.op} ${exprToString(node.value)}`;
    case "Binary":
      return `${exprToString(node.left)} ${node.op} ${exprToString(node.right)}`;
    case "Unary":
      return `${node.op}${exprToString(node.expr)}`;
    case "Assign":
      return `${node.name} ${node.op} ${exprToString(node.value)}`;
    case "PostUpdate":
      return `${node.name}${node.op}`;
    case "PreUpdate":
      return `${node.op}${node.name}`;
    default:
      return "...";
  }
}

function buildUpdateNote(node) {
  if (!node) return "";
  if (node.kind === "PostUpdate" || node.kind === "PreUpdate")
    return `${node.name} ${node.op} → (updated)`;
  if (node.kind === "Assign") return `${node.name} ${node.op} (updated)`;
  return "update";
}

function findElseLine(ifLine, sourceLines) {
  for (let i = ifLine; i < sourceLines.length; i++) {
    if (/^\s*else\b/.test(sourceLines[i])) return i + 1;
  }
  return ifLine;
}

// ───────────────────────────────────────────────────────────────
// SECTION 5 — PUBLIC API
// ───────────────────────────────────────────────────────────────

export function runCInterpreter(code) {
  const sourceLines = code.split("\n");
  try {
    const tokens = lex(code);
    const ast = parse(tokens);
    return interpret(ast, sourceLines);
  } catch (e) {
    return [
      {
        line: 1,
        code: sourceLines[0] ?? "",
        variables: {},
        note: `⚠️ Parse error: ${e.message}`,
      },
    ];
  }
}
