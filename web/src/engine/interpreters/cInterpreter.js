// src/engine/interpreters/cInterpreter.js
// ═══════════════════════════════════════════════════════════════
// FlowTrace — AST-based C Interpreter
//
// ARCHITECTURE:
//   Raw code → Lexer → Parser → AST → Interpreter → steps[]
//
// PUBLIC API:
//   runCInterpreter(code: string) → Step[]
//   Step = { line, code, variables, note, callStack: Frame[] }
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
//   ✅ int / void functions, int parameters, nested calls and recursion
//   ❌ Pointers, structs, prototypes, array parameters, malloc
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
      tokens.push({ type: Object.hasOwn(KEYWORDS, id) ? KEYWORDS[id] : TT.IDENT, value: id, line });
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
      const isFunction = TYPE_KEYWORDS.has(peekType()) &&
        tokens[pos + 1]?.type === TT.IDENT && tokens[pos + 2]?.type === TT.LPAREN;
      const stmt = isFunction ? parseFunction() : parseStatement();
      if (stmt) body.push(stmt);
    }
    return { kind: "Program", body };
  }

  function parseFunction() {
    const { value: returnType, line } = advance();
    if (returnType !== "int" && returnType !== "void") {
      throw new ParseError(`Line ${line}: Only int and void function returns are supported`);
    }
    const name = expect(TT.IDENT, "Expected function name").value;
    expect(TT.LPAREN, "Expected '('");
    const params = [];
    if (check(TT.VOID) && tokens[pos + 1]?.type === TT.RPAREN) advance();
    else if (!check(TT.RPAREN)) {
      do {
        expect(TT.INT, "Expected int parameter type");
        const param = expect(TT.IDENT, "Expected parameter name");
        if (params.some((p) => p.name === param.value)) {
          throw new ParseError(`Line ${param.line}: Duplicate parameter "${param.value}"`);
        }
        params.push({ name: param.value, typeName: "int", line: param.line });
        if (!check(TT.COMMA)) break;
        advance();
      } while (!isAtEnd());
    }
    expect(TT.RPAREN, "Expected ')' after parameters");
    const body = parseBlock();
    return { kind: "FunctionDecl", name, returnType, params, body, line };
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
    const endLine = expect(TT.RBRACE, "Expected '}'").line;
    return { kind: "Block", body, line, endLine };
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
      const start = pos;
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
      // Reparse reads through precedence rules (e.g. arr[i] + f()).
      pos = start;
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
      if (node.kind !== "Identifier") {
        throw new ParseError(`Line ${node.line}: "++" requires a variable, not an expression`);
      }
      return { kind: "PostUpdate", op: "++", name: node.name, line: node.line };
    }
    if (check(TT.MINUSMINUS)) {
      advance();
      if (node.kind !== "Identifier") {
        throw new ParseError(`Line ${node.line}: "--" requires a variable, not an expression`);
      }
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
      if (check(TT.LPAREN)) {
        advance();
        const args = [];
        if (!check(TT.RPAREN)) {
          do {
            args.push(parseExpr());
            if (!check(TT.COMMA)) break;
            advance();
          } while (!isAtEnd());
        }
        expect(TT.RPAREN, "Expected ')' after arguments");
        return { kind: "Call", name: tok.value, args, line: tok.line };
      }
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

    throw new ParseError(`Line ${tok.line}: Expected expression (got "${tok.value}")`);
  }

  return parseProgram();
}

// ───────────────────────────────────────────────────────────────
// SECTION 3 — INTERPRETER
// ───────────────────────────────────────────────────────────────

const MAX_ITER = 100;
const MAX_CALL_DEPTH = 64;
const MAX_OPERATIONS = 50000;
const MAX_STEPS = 5000;
const MAX_SNAPSHOT_VALUES = 200000;
const MAX_ARRAY_SIZE = 10000;

function interpret(ast, sourceLines) {
  const steps = [];
  const globals = Object.create(null);
  let env = globals; // Only the active frame and globals are visible.
  const functions = new Map();
  const frames = [];
  let nextFrameId = 1;
  let operations = 0;
  let snapshotValues = 0;

  function tick(line, count = 1) {
    operations += count;
    if (operations > MAX_OPERATIONS) {
      throw new ExecutionLimitError(`Execution exceeded ${MAX_OPERATIONS} operations`, line);
    }
  }

  function copyVariables(scope) {
    return Object.fromEntries(Object.entries(scope).map(([k, v]) =>
      [k, Array.isArray(v) ? [...v] : v]));
  }

  function snapshot(lineNum, note) {
    if (frames.length) frames.at(-1).line = lineNum;
    return {
      line: lineNum,
      code: (sourceLines[lineNum - 1] ?? "").trim(),
      variables: copyVariables({ ...globals, ...env }),
      note,
      callStack: frames.map((frame, index) => ({
        id: frame.id,
        functionName: frame.fn.name,
        line: frame.line,
        parameters: copyVariables(Object.fromEntries(frame.fn.params.map(
          ({ name }) => [name, frame.env[name]],
        ))),
        locals: copyVariables(frame.env), // Includes parameters, which are locals.
        isActive: index === frames.length - 1,
      })),
    };
  }

  function addStep(lineNum, note = "") {
    if (steps.length >= MAX_STEPS) {
      throw new ExecutionLimitError(`Trace exceeded ${MAX_STEPS} steps`, lineNum);
    }
    const scopes = [globals, env, ...frames.map((frame) => frame.env)];
    for (const scope of scopes) {
      for (const value of Object.values(scope)) {
        snapshotValues += Array.isArray(value) ? value.length + 1 : 1;
      }
    }
    if (snapshotValues > MAX_SNAPSHOT_VALUES) {
      throw new ExecutionLimitError("Trace snapshot memory limit exceeded", lineNum);
    }
    steps.push(snapshot(lineNum, note));
  }

  function reportError(error, line) {
    // Function failures must unwind, never fabricate a return value. Preserve
    // the legacy snippet recovery policy, except for hard execution limits.
    if (functions.size || error instanceof ExecutionLimitError) throw error;
    addStep(line, `⚠️ ${error.message}`);
  }

  function assignmentScope(name) {
    return Object.hasOwn(env, name) || !Object.hasOwn(globals, name) ? env : globals;
  }

  function callFunction(name, args, line, needsValue) {
    const fn = functions.get(name);
    if (!fn) throw new RuntimeError(`Unknown function "${name}"`, line);
    if (args.length !== fn.params.length) {
      throw new RuntimeError(`${name} expects ${fn.params.length} arguments, got ${args.length}`, line);
    }
    if (needsValue && fn.returnType === "void") {
      throw new RuntimeError(`Void function "${name}" cannot be used as a value`, line);
    }
    if (frames.length >= MAX_CALL_DEPTH) {
      throw new ExecutionLimitError(`Call depth exceeded ${MAX_CALL_DEPTH} frames`, line);
    }
    // Evaluate once, left to right, before entering the callee.
    const values = args.map((arg) => Math.trunc(evalExpr(arg)));
    const callerEnv = env;
    if (frames.length) frames.at(-1).line = line;
    const localEnv = Object.create(globals);
    fn.params.forEach((param, index) => { localEnv[param.name] = values[index]; });
    const frame = { id: nextFrameId++, fn, env: localEnv, line: fn.line };
    frames.push(frame);
    env = localEnv;
    let result;
    try {
      addStep(fn.line, `→ Enter ${name}(${values.join(", ")})`);
      const signal = execStmt(fn.body);
      if (signal?.kind === "return") result = signal.value;
      else {
        if (fn.returnType === "int" && name !== "main") {
          throw new RuntimeError(`Function "${name}" ended without returning a value`, fn.body.endLine);
        }
        result = fn.returnType === "int" ? 0 : undefined;
        addStep(fn.body.endLine, result === undefined ? "↩ return" : `↩ return ${result} (implicit)`);
      }
    } catch (error) {
      // Capture the deepest failing frame before finally restores the caller.
      error.step ??= snapshot(error.line ?? frame.line, `⚠️ ${error.message}`);
      throw error;
    } finally {
      frames.pop();
      env = callerEnv;
    }
    addStep(frames.length ? line : fn.body.endLine,
      `↩ ${name} returned${result === undefined ? "" : ` ${fmt(result)}`}${frames.length ? ` → resume ${frames.at(-1).fn.name}` : " → execution complete"}`);
    return result;
  }

  // ── EXPRESSION EVALUATOR ──────────────────────────────────
  function evalExpr(node, needsValue = true) {
    tick(node.line);
    switch (node.kind) {
      case "Call":
        return callFunction(node.name, node.args, node.line, needsValue);
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
            if (rhs === 0) throw new RuntimeError("Modulo by zero", node.line);
            arr[idx] %= rhs;
            break;
        }
        return arr[idx];
      }

      case "Binary": {
        const L = evalExpr(node.left);
        if (node.op === "&&" && !L) return 0;
        if (node.op === "||" && L) return 1;
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
        const target = assignmentScope(node.name);
        switch (node.op) {
          case TT.EQ:
            target[node.name] = rhs;
            break;
          case TT.PLUSEQ:
            target[node.name] += rhs;
            break;
          case TT.MINUSEQ:
            target[node.name] -= rhs;
            break;
          case TT.STAREQ:
            target[node.name] *= rhs;
            break;
          case TT.SLASHEQ:
            if (rhs === 0)
              throw new RuntimeError("Division by zero", node.line);
            target[node.name] = Math.trunc(target[node.name] / rhs);
            break;
          case TT.PERCENTEQ:
            if (rhs === 0) throw new RuntimeError("Modulo by zero", node.line);
            target[node.name] %= rhs;
            break;
        }
        return env[node.name];
      }

      case "PostUpdate": {
        const target = assignmentScope(node.name);
        const before = env[node.name] ?? 0;
        target[node.name] = node.op === "++" ? before + 1 : before - 1;
        return before;
      }

      case "PreUpdate": {
        const target = assignmentScope(node.name);
        target[node.name] =
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
    tick(node.line ?? 1);
    if (frames.length && node.line) frames.at(-1).line = node.line;

    switch (node.kind) {
      case "Program":
      case "Block": {
        for (const stmt of node.body) {
          const sig = execStmt(stmt);
          if (sig?.kind === "return") return sig;
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
              reportError(e, decl.line);
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
            reportError(e, node.line);
            return null;
          }
        }

        if (!Number.isFinite(size) || size < 0 || size > MAX_ARRAY_SIZE) {
          throw new ExecutionLimitError(`Array size must be between 0 and ${MAX_ARRAY_SIZE}`, node.line);
        }
        tick(node.line, size);
        const arr = [];
        for (let k = 0; k < size; k++) {
          if (k < node.elements.length) {
            try {
              arr.push(evalExpr(node.elements[k]));
            } catch (e) {
              if (functions.size || e instanceof ExecutionLimitError) throw e;
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
          const val = evalExpr(expr, false);
          let note = "";

          if (expr.kind === "Assign") {
            note = `${expr.name} = ${fmt(env[expr.name])}`;
          } else if (expr.kind === "ArrayAssign") {
            const arr = env[expr.name];
            // Do not evaluate the index twice: it may contain a function call.
            note = `${expr.name}[${exprToString(expr.index)}] = ${fmt(val)}  →  [${arr.join(", ")}]`;
          } else if (expr.kind === "PostUpdate" || expr.kind === "PreUpdate") {
            note = `${expr.name} ${expr.op} → ${fmt(env[expr.name])}`;
          } else {
            note = val === undefined ? "→ Call completed" : `→ ${fmt(val)}`;
          }
          addStep(node.line, note);
        } catch (e) {
          reportError(e, node.line);
        }
        return null;
      }

      // ── If / Else ─────────────────────────────────────────
      case "If": {
        let condVal;
        try {
          condVal = evalExpr(node.condition);
        } catch (e) {
          reportError(e, node.line);
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
            reportError(e, node.line);
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
          if (sig?.kind === "return") return sig;
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
              reportError(e, node.line);
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
          if (sig?.kind === "return") return sig;
          if (node.update) {
            try {
              evalExpr(node.update, false);
            } catch (e) {
              reportError(e, node.line);
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
          if (sig?.kind === "return") return sig;
          let condVal;
          try {
            condVal = evalExpr(node.condition);
          } catch (e) {
            reportError(e, node.line);
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

        // All arguments execute exactly once, even if the format omits one.
        const values = node.args.map((arg) => {
          try {
            return evalExpr(arg);
          } catch (e) {
            if (functions.size || e instanceof ExecutionLimitError) throw e;
            return undefined;
          }
        });

        let argIdx = 0;
        output = output.replace(/%[difc s%]/g, (spec) => {
          if (spec === "%%") return "%";
          if (argIdx >= node.args.length) return spec;
          try {
            const val = values[argIdx++];
            if (val === undefined) return "?";
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
        const fn = frames.at(-1)?.fn;
        if (fn && ((fn.returnType === "void" && node.value) ||
          (fn.returnType === "int" && !node.value))) {
          throw new RuntimeError(fn.returnType === "void"
            ? `Void function "${fn.name}" cannot return a value`
            : `Function "${fn.name}" must return a value`, node.line);
        }
        let val = fn?.returnType === "void" ? undefined : 0;
        if (node.value) {
          try {
            val = evalExpr(node.value);
          } catch (e) {
            reportError(e, node.line);
            return { kind: "return", value: 0 };
          }
        }
        if (fn?.returnType === "int") val = Math.trunc(val);
        addStep(node.line, val === undefined ? "↩ return" : `↩ return ${fmt(val)}`);
        return { kind: "return", value: val };
      }

      default:
        return null;
    }
  }

  try {
    for (const node of ast.body) {
      if (node.kind !== "FunctionDecl") continue;
      if (functions.has(node.name)) {
        throw new RuntimeError(`Duplicate function "${node.name}"`, node.line);
      }
      functions.set(node.name, node);
    }
    if (functions.size) {
      if (!functions.has("main")) throw new RuntimeError("Function definitions require main()", 1);
      const declarations = ast.body.filter((node) => node.kind !== "FunctionDecl");
      for (const node of declarations) {
        if (!["VarDeclList", "ArrayDecl"].includes(node.kind)) {
          throw new RuntimeError("Only global declarations are allowed outside functions", node.line);
        }
      }
      for (const node of declarations) execStmt(node);
      callFunction("main", [], functions.get("main").line, false);
    } else {
      execStmt(ast);
    }
  } catch (error) {
    steps.push(error.step ?? snapshot(error.line ?? 1, `⚠️ ${error.message}`));
  }
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

class ExecutionLimitError extends RuntimeError {}

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
    case "Call":
      return `${node.name}(${node.args.map(exprToString).join(", ")})`;
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
        callStack: [],
        note: `⚠️ Parse error: ${e.message}`,
      },
    ];
  }
}
