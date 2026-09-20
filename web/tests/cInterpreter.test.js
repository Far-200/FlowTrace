import assert from "node:assert/strict";
import { test } from "node:test";
import { runCInterpreter as run } from "../src/engine/interpreters/cInterpreter.js";
import { generateSteps } from "../src/engine/generateSteps.js";
import { SAMPLES } from "../src/data/samples.js";

test("scalar writes reject undeclared and array targets without mutation", () => {
  const expressions = ["x = 2", "x += 2", "x -= 2", "x *= 2", "x /= 2", "x %= 2",
    "x++", "x--", "++x", "--x"];
  for (const declaration of ["", "int x[1] = {4};"]) {
    for (const expression of expressions) {
      const steps = run(`int main() { ${declaration} ${expression}; int after=1; }`);
      const end = steps.at(-1);
      assert.match(end.note, declaration ? /scalar/ : /Undeclared variable/, expression);
      assert.deepEqual(end.variables, declaration ? { x: [4] } : {}, expression);
      assert.equal(steps.filter((s) => s.note.startsWith("⚠️")).length, 1);
      assert.deepEqual(end.callStack.map((f) => f.functionName), ["main"]);
    }
  }
});

test("invalid scalar targets are rejected before side-effecting RHS calls", () => {
  for (const declaration of ["", "int x[1]={4};"]) {
    for (const op of ["=", "+=", "-=", "*=", "/=", "%="]) {
      const steps = run(`int hits=0; int bump(){hits++;return 2;}
        int main(){${declaration} x ${op} bump();}`);
      assert.match(steps.at(-1).note, declaration ? /scalar/ : /Undeclared variable/);
      assert.equal(steps.at(-1).variables.hits, 0);
      assert.ok(!steps.some((s) => s.note.includes("Enter bump")));
    }
  }
});

test("valid scalar writes preserve locals, parameters, globals and update values", () => {
  const steps = successful(`int g=1;
    int f(int x){
      x=4; x+=3; x-=1; x*=2; x/=3; x%=3;
      int a=x++; int b=x--; int c=++x; int d=--x;
      g+=x; g++; --g;
      return a*1000+b*100+c*10+d;
    }
    int main(){int g=9; int result=f(99); return result+g;}`);
  assert.match(steps.at(-1).note, /main returned 1230/);
  assert.equal(steps.at(-1).variables.g, 2);
});

test("array-element writes still evaluate index and RHS calls once", () => {
  const steps = successful(`int hits=0;
    int index(){hits++;return 0;} int value(){hits++;return 8;}
    int main(){int a[1]={1}; a[index()]=value();
      a[0]+=2; a[0]-=1; a[0]*=2; a[0]/=3; a[0]%=4;
      return a[0];}`);
  assert.match(steps.at(-1).note, /main returned 2/);
  assert.equal(steps.at(-1).variables.hits, 2);
});

test("snippet scalar validation preserves error recovery without creating bindings", () => {
  const steps = run("int hits=0; missing=(hits=1); int a[1]={4}; a++; int after=2;");
  assert.equal(steps.filter((s) => s.note.startsWith("⚠️")).length, 2);
  assert.deepEqual(steps.at(-1).variables, { hits: 0, a: [4], after: 2 });
});

test("logical precedence controls side effects and explicit parentheses win", () => {
  for (const [expr, result, hits] of [
    ["1 || 0 && f()", 1, 0], ["(1 || 0) && f()", 0, 1],
    ["1 || (0 && f())", 1, 0], ["0 && f() || 1", 1, 0],
    ["0 && (f() || 1)", 0, 0],
  ]) {
    const steps = successful(`int hits=0; int f(){hits++;return 0;}
      int main(){return ${expr};}`);
    assert.match(steps.at(-1).note, new RegExp(`main returned ${result} `), expr);
    assert.equal(steps.at(-1).variables.hits, hits, expr);
  }
});

test("relational precedence exceeds equality and equality exceeds logical operators", () => {
  for (const [expr, result, hits] of [
    ["f() == 1 < 1", 0, 1], ["(f() == 1) < 1", 1, 1],
    ["f() == (1 < 1)", 0, 1], ["f() != 1 <= 1", 1, 1],
    ["f() == 1 > 0", 0, 1], ["f() != 1 >= 0", 1, 1],
    ["f() == 1 < 1 && f()", 0, 1], ["(f() == 1) < 1 && f()", 1, 2],
    ["0 && f() == 0", 0, 0], ["1 || f() == 0", 1, 0],
  ]) {
    const steps = successful(`int hits=0; int f(){hits++;return 2;}
      int main(){return ${expr};}`);
    assert.match(steps.at(-1).note, new RegExp(`main returned ${result} `), expr);
    assert.equal(steps.at(-1).variables.hits, hits, expr);
  }
});

test("prefix updates compose at unary precedence and retain expression values", () => {
  for (const [expr, result, x] of [
    ["++x + 1", 3, 2], ["1 + ++x", 3, 2], ["--x + 3", 3, 0],
    ["3 + --x", 3, 0], ["++x * 3", 6, 2], ["++x == 2", 1, 2],
    ["2 > --x", 1, 0], ["f(++x + 1)", 3, 2], ["f(3 + --x)", 3, 0],
  ]) {
    const steps = successful(`int f(int n){return n;}
      int main(){int x=1; int result=${expr}; return result;}`);
    assert.equal(steps.at(-2).variables.x, x, expr);
    assert.match(steps.at(-1).note, new RegExp(`main returned ${result} `), expr);
  }
  assert.match(successful("int main(){int x=1; ++x; --x; return x;}").at(-1).note,
    /main returned 1/);
});

test("prefix and postfix non-identifier targets fail before any execution", () => {
  for (const op of ["++", "--"]) {
    for (const target of ["f()", "a[0]", "(x+1)", "5", "x++"]) {
      for (const expr of [`${op}${target}`, `${target}${op}`]) {
        const steps = run(`int hits=0; int f(){hits++;return 1;}
          int main(){int a[1]={4};int x=1;${expr};}`);
        assert.equal(steps.length, 1, expr);
        assert.match(steps[0].note, /Parse error/, expr);
        assert.deepEqual(steps[0].variables, {}, expr);
        assert.deepEqual(steps[0].callStack, [], expr);
      }
    }
  }
});

const infiniteLoops = ["while(1) {}", "for(;;) {}", "for(int i=0;1;i++) {}", "do {} while(1);"];

test("function loop limits are fatal and retain the deepest diagnostic frame", () => {
  for (const loop of infiniteLoops) {
    const steps = run(`int f(){int marker=42; ${loop} int after=1; return 7;}
      int wrapper(){return f();} int main(){return wrapper();}`);
    const end = steps.at(-1);
    assert.match(end.note, /Loop exceeded 100 iterations/, loop);
    assert.equal(steps.filter((s) => s.note.startsWith("⚠️")).length, 1);
    assert.deepEqual(end.callStack.map((f) => f.functionName), ["main", "wrapper", "f"]);
    assert.equal(end.callStack.at(-1).locals.marker, 42);
    assert.ok(!steps.some((s) => Object.hasOwn(s.variables, "after")));
    assert.ok(!steps.some((s) => /↩|resume|execution complete/.test(s.note)));
  }
  assert.match(successful("int main(){return 2;}").at(-1).note, /main returned 2/);
});

test("snippet loop limits retain warning-and-break compatibility", () => {
  for (const loop of infiniteLoops) {
    const steps = run(`${loop} int after=7;`);
    assert.equal(steps.filter((s) => s.note.startsWith("⚠️")).length, 1);
    assert.match(steps.find((s) => s.note.startsWith("⚠️")).note, /Loop exceeded 100/);
    assert.equal(steps.at(-1).variables.after, 7);
    assert.ok(steps.every((s) => s.callStack.length === 0));
  }
});

test("finite function loops still finish at the iteration limit", () => {
  for (const loop of ["while(i<100){i++;}", "for(;i<100;i++){}", "do{i++;}while(i<100);"]) {
    const steps = successful(`int f(){int i=0;${loop}return i;} int main(){return f();}`);
    assert.match(steps.at(-1).note, /main returned 100/);
  }
});

function successful(code) {
  const steps = run(code);
  assert.ok(steps.length);
  assert.deepEqual(steps.filter((s) => s.note.startsWith("⚠️")), []);
  for (const step of steps) {
    assert.equal(step.callStack.filter((f) => f.isActive).length, step.callStack.length ? 1 : 0);
    if (step.callStack.length) assert.equal(step.callStack.at(-1).line, step.line);
  }
  return steps;
}

const stacks = (steps) => steps.map((s) => s.callStack.map((f) => f.functionName).join(" > "));

test("Basic Functions: exact values, source lines and push/return/pop sequence", () => {
  const steps = successful(SAMPLES.c["Basic Functions"]);
  assert.deepEqual(stacks(steps), ["main", "main > add", "main > add", "main > add", "main", "main", "main", ""]);
  assert.deepEqual(steps.map((s) => s.line), [6, 1, 2, 3, 7, 7, 8, 9]);
  assert.deepEqual(steps[1].callStack[1].parameters, { a: 2, b: 3 });
  assert.deepEqual(steps[2].variables, { a: 2, b: 3, result: 5 });
  assert.equal(steps[3].note, "↩ return 5");
  assert.deepEqual(steps[4].variables, {}); // Assignment has not completed.
  assert.deepEqual(steps[5].variables, { x: 5 });
  assert.deepEqual(steps[1].callStack[0].locals, {}); // Historical copy.
  assert.equal(steps[1].callStack[0].line, 7);
  assert.deepEqual(steps.at(-1).variables, {});
});

test("Nested Calls: caller suspension, inner return 10, outer return 10", () => {
  const steps = successful(SAMPLES.c["Nested Calls"]);
  assert.deepEqual(stacks(steps), ["main", "main > addThenDouble", "main > addThenDouble",
    "main > addThenDouble > doubleValue", "main > addThenDouble > doubleValue",
    "main > addThenDouble", "main > addThenDouble", "main > addThenDouble", "main", "main", "main", ""]);
  assert.deepEqual(steps[3].callStack.map((f) => f.line), [12, 7, 1]);
  assert.deepEqual(steps[3].callStack.map((f) => f.locals), [{}, { a: 2, b: 3, sum: 5 }, { n: 5 }]);
  assert.equal(steps[4].note, "↩ return 10");
  assert.deepEqual(steps[5].variables, { a: 2, b: 3, sum: 5 });
  assert.equal(steps[6].variables.result, 10);
  assert.equal(steps[7].note, "↩ return 10");
  assert.deepEqual(steps[9].variables, { answer: 10 });
});

test("factorial uses independent recursive frames and unwinds to 120", () => {
  const steps = successful(SAMPLES.c["Recursive Factorial"]);
  assert.equal(Math.max(...steps.map((s) => s.callStack.length)), 6);
  const deepest = steps.find((s) => s.callStack.length === 6);
  assert.deepEqual(deepest.callStack.slice(1).map((f) => f.parameters.n), [5, 4, 3, 2, 1]);
  assert.equal(new Set(deepest.callStack.map((f) => f.id)).size, 6);
  assert.equal(steps.find((s) => s.note === "Declared result = 120").variables.result, 120);
  assert.deepEqual(steps.at(-1).callStack, []);
});

test("all original C/C++ samples preserve final variables and step counts", () => {
  const expected = {
    c: { "Basic Math": [5, { x: 10, y: 3, z: 7 }], "If / Else": [6, { score: 72, grade: 2, bonus: 10 }],
      "While Loop": [18, { i: 5, sum: 10 }], "For Loop": [18, { total: 15, i: 6 }],
      "FizzBuzz (lite)": [36, { n: 7, fizz: 1, buzz: 1 }] },
    cpp: { "Basic Math": [4, { x: 11, y: 4, z: 6 }], "While Loop": [15, { i: 4, sum: 6 }] },
  };
  for (const [language, samples] of Object.entries(expected)) {
    for (const [name, [count, variables]] of Object.entries(samples)) {
      const steps = generateSteps(SAMPLES[language][name], language);
      assert.equal(steps.length, count, `${language}: ${name}`);
      assert.deepEqual(steps.at(-1).variables, variables);
      assert.ok(steps.every((s) => s.callStack.length === 0));
    }
  }
});

test("void returns, void fallthrough, zero parameters and implicit main return", () => {
  const steps = successful(`void early(void) { return; int unreachable = 1; }
    void empty() {} int value(void) { return 7; }
    int main(void) { early(); empty(); int x = value(); }`);
  assert.ok(steps.some((s) => s.variables.x === 7));
  assert.ok(!steps.some((s) => Object.hasOwn(s.variables, "unreachable")));
  assert.match(steps.at(-1).note, /main returned 0/);
  successful("void main() { return; }");
});

test("calls in arguments, arithmetic, assignment, printf and conditions evaluate once", () => {
  const steps = successful(`int calls = 0;
    int next() { calls++; return calls; }
    int add(int a, int b) { return a + b; }
    int main() { int x = add(next(), add(next(), next())) * 2;
      x += next(); if (next() == 5) x += 1;
      printf("%d", next()); return x; }`);
  assert.equal(steps.at(-1).variables.calls, 6);
  assert.ok(steps.some((s) => s.note === '📤 Output: "6"'));
  assert.match(steps.at(-1).note, /main returned 17/);
});

test("locals and parameters do not leak; global writes and local shadowing work", () => {
  const steps = successful(`int x = 10;
    int f(int x) { x += 1; { int local = 3; } return x + local; }
    int change() { x += 2; return x; }
    int main() { int x = 5; int a = f(x); int b = f(x); int c = change(); return x; }`);
  const end = steps.at(-2);
  assert.deepEqual(end.variables, { x: 5, a: 9, b: 9, c: 12 });
  assert.deepEqual(steps.at(-1).variables, { x: 12 });
  const failure = run("int f() { return secret; } int main() { int secret = 42; int x = f(); }").at(-1);
  assert.match(failure.note, /Undefined variable "secret"/);
  assert.deepEqual(failure.callStack.map((f) => f.functionName), ["main", "f"]);
});

test("return propagates through every loop and nested block", () => {
  for (const loop of ["while (1)", "for (int i=0; i<3; i++)", "do"]) {
    const code = `int f() { ${loop} { if (1) { return 8; } } ${loop === "do" ? "while(1);" : ""} return 99; }
      int main() { int x = f(); return x; }`;
    assert.match(successful(code).at(-1).note, /main returned 8/);
  }
});

test("arrays remain local, snapshots stay independent, index calls run once", () => {
  const steps = successful(`int count = 0;
    int index() { count++; return 0; }
    int f() { int a[2] = {2, 3}; a[index()] = 7; return a[0] + a[1]; }
    int main() { int a[2] = {8, 9}; int x = f(); return x; }`);
  assert.match(steps.at(-1).note, /main returned 10/);
  assert.equal(steps.at(-1).variables.count, 1);
  assert.deepEqual(steps.find((s) => s.note === "Declared a[2] = [2, 3]").callStack.at(-1).locals.a, [2, 3]);
  assert.deepEqual(steps.at(-2).variables.a, [8, 9]);
});

test("short circuit skips calls and printf evaluates even unused arguments", () => {
  const steps = successful(`int count = 0; int bump() { count++; return 1; }
    int main() { int a = 0 && bump(); int b = 1 || bump(); printf("ok", bump()); return count; }`);
  assert.match(steps.at(-1).note, /main returned 1/);
});

test("forward definitions, mutual recursion and safe identifier names", () => {
  assert.match(successful(`int main() { return even(4); }
    int even(int n) { if (n == 0) return 1; return odd(n-1); }
    int odd(int n) { if (n == 0) return 0; return even(n-1); }`).at(-1).note, /main returned 1/);
  assert.match(successful("int constructor(int __proto__) { return __proto__; } int main() { return constructor(3); }").at(-1).note, /main returned 3/);
});

test("invalid function programs report clear errors", () => {
  const cases = [
    ["int f() { return 1; }", /require main/],
    ["int main(int x) {}", /expects 1 arguments/],
    ["int main() { missing(); }", /Unknown function/],
    ["int f(int a) { return a; } int main() { return f(); }", /expects 1 arguments/],
    ["int f() {} int main() { return f(); }", /without returning/],
    ["int main() { return; }", /must return a value/],
    ["void f() { return 2; } int main() { f(); }", /cannot return a value/],
    ["void f() {} int main() { int x = f(); }", /cannot be used as a value/],
    ["int main() {} int main() {}", /Duplicate function/],
    ["int f(int a, int a) {} int main() {}", /Duplicate parameter/],
    ["float f() {} int main() {}", /Only int and void/],
    ["int f(int a[]){return 0;} int main(){}", /Parse error/],
    ["int f(int a); int main(){}", /Parse error/],
    ["int main(){int x=f(1,);}", /Parse error/],
    ["int main(){int f(){return 0;}}", /Parse error/],
    ["int x=0; x=2; int main(){}", /Only global declarations/],
  ];
  for (const [code, pattern] of cases) {
    const steps = run(code);
    assert.match(steps.at(-1).note, pattern, code);
    assert.ok(Array.isArray(steps.at(-1).callStack));
  }
});

test("bounds, division and modulo errors retain the failing function frame", () => {
  for (const [body, pattern] of [
    ["int a[1]={1}; return a[2];", /out of bounds/],
    ["int a[1]={1}; a[-1]=2; return 0;", /out of bounds/],
    ["return 1/0;", /Division by zero/], ["return 1%0;", /Modulo by zero/],
    ["int a=2; a%=0; return a;", /Modulo by zero/],
  ]) {
    const steps = run(`int fail() { ${body} } int main() { int x=fail(); return 0; }`);
    assert.match(steps.at(-1).note, pattern);
    assert.equal(steps.at(-1).callStack.at(-1).functionName, "fail");
    assert.ok(!steps.some((s) => s.note.startsWith("Declared x")));
  }
});

test("depth limit is fatal from every expression recovery path", () => {
  for (const expression of ["return f();", "int x=f();", "f();", "if(f()) return 1;",
    "while(f()) {}", "for(;f();) {}", "do {} while(f());", "printf(\"%d\",f());",
    "int a[1]={f()};", "int a[f()];"]) {
    const steps = run(`int f() { ${expression} return 0; } int main() { f(); }`);
    assert.match(steps.at(-1).note, /Call depth exceeded 64 frames/, expression);
    assert.equal(steps.at(-1).callStack.length, 64);
    assert.equal(steps.filter((s) => s.note.startsWith("⚠️")).length, 1);
    assert.ok(steps.length < 200);
  }
});

test("broad recursion and large allocations are bounded; legacy loop guard remains", () => {
  const broad = run("int f(int n) { if(n==0) return 1; return f(n-1)+f(n-1); } int main(){return f(30);}");
  assert.match(broad.at(-1).note, /Trace.*limit|Trace exceeded|Execution exceeded/);
  assert.ok(broad.length <= 5001);
  assert.match(run("int a[1000000000];").at(-1).note, /Array size/);
  assert.match(run("while(1) {}").at(-1).note, /Loop exceeded 100/);
  assert.deepEqual(successful("int x=1; return 0; x=2;").at(-1).variables, { x: 1 });
});

test("postfix ++/-- reject non-identifier targets instead of corrupting state", () => {
  const cases = [
    "int f() { return 1; } int main() { f()++; return 0; }",
    "int main() { int arr[2] = {1, 2}; arr[0]++; return 0; }",
    "int main() { 5++; return 0; }",
    "int main() { int a = 1; int b = 2; (a + b)++; return 0; }",
  ];
  for (const code of cases) {
    const steps = run(code);
    assert.equal(steps.length, 1, code);
    assert.match(steps[0].note, /Parse error/, code);
    assert.deepEqual(steps[0].variables, {}, code);
  }
});

test("postfix ++/-- on a plain identifier still works", () => {
  const steps = successful("int main() { int i = 0; i++; return i; }");
  assert.match(steps.at(-1).note, /main returned 1/);
});

test("for-loop update may call a void function purely for its side effect", () => {
  const steps = successful(`int calls = 0;
    void bump() { calls = calls + 1; }
    int main() {
      for (int i = 0; calls < 3; bump()) {}
      return calls;
    }`);
  assert.match(steps.at(-1).note, /main returned 3/);
});

test('"execution complete" is reported only for the true entry call, not for a call in a global initializer', () => {
  const steps = successful(`int helper() { return 5; }
    int x = helper();
    int main() { return x; }`);
  const helperReturn = steps.find((s) => s.note.startsWith("↩ helper returned"));
  const mainReturn = steps.find((s) => s.note.startsWith("↩ main returned"));
  assert.ok(helperReturn, "expected a helper return step");
  assert.ok(mainReturn, "expected a main return step");
  assert.doesNotMatch(helperReturn.note, /execution complete/);
  assert.match(helperReturn.note, /resume global initialization/);
  assert.match(mainReturn.note, /execution complete/);
});
