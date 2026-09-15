# FlowTrace

**A step-by-step code execution visualizer built for learning how code actually runs.**

FlowTrace simulates the execution of C-like programs line by line — showing which line is executing, how variables change, and how control flows through the program.

No compiler. No opaque execution. Just a visible execution trace designed for learning.

> Built with React, Monaco Editor, and a browser-based AST interpreter implemented in JavaScript.

---

## What It Does

Most beginners write code and run it — but they never really *see* it run.

They guess variable values, misread loop conditions, and stare at the final output wondering how the program got there.

FlowTrace makes that process visible.

Paste in a supported C program, click **Step**, and watch execution unfold one action at a time. Variable updates appear live, branch decisions are annotated, and the trace log keeps a history of what happened.

It behaves a little like a debugger — but the focus is learning rather than production debugging.

---

## Features

### Editor

- Monaco Editor integration
- Syntax highlighting for C, C++, Java, and Python
- Auto-closing brackets, parentheses, and quotes
- Smart indentation and tab-to-spaces support
- Bracket pair matching
- Autocomplete snippets for `int`, `if`, `while`, `for`, `printf`, and more
- Hover over variables during execution to inspect their current values

### Execution Engine

- **Step mode** — advance one execution step at a time
- **Auto-run mode** — play through generated steps automatically
- **Pause** — stop auto-run at the current step
- **Restart** — replay from step 1 without re-parsing
- **Reset** — return to edit mode
- Live variable panel with change detection and value history
- Execution notes for conditions, assignments, output, and returns
- Loop guard to prevent runaway simulations

### UI / UX

- Active-line highlighting through the Monaco Decorations API
- Non-active lines dimmed during execution
- Automatic editor scrolling to the currently executing line
- Execution progress bar
- Current-line execution badge
- Error banner with Monaco markers
- Copy code and download as `.c`, `.cpp`, `.java`, or `.py`
- Responsive desktop and mobile layouts
- Mobile execution controls
- Keyboard shortcuts:
  - `Ctrl+Enter` — Step
  - `Shift+Enter` — Auto-run
  - `Ctrl+R` — Reset

---

## Screenshots

> *(Coming soon)*

| Desktop — Execution in progress | Mobile — Variables tab |
| --- | --- |
| `screenshots/desktop-execution.png` | `screenshots/mobile-variables.png` |

| Editor — Empty state | Trace log |
| --- | --- |
| `screenshots/empty-state.png` | `screenshots/trace-log.png` |

---

## How It Works

FlowTrace does not compile or execute native C code.

Instead, it uses a browser-side simulation pipeline:

```
Raw C Source Code
        │
        ▼
┌───────────────┐
│    Lexer      │
│ tokenizer.js  │
│               │
│ Source code   │
│ → tokens      │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│    Parser     │
│ cInterpreter  │
│               │
│ Tokens        │
│ → AST         │
└───────┬───────┘
        │
        ▼
┌────────────────────────────────┐
│        AST Interpreter         │
│                                 │
│ Walks the syntax tree          │
│ Evaluates expressions          │
│ Updates the variable environment│
│ Emits execution steps such as: │
│                                 │
│ { line, code, variables, note }│
└───────┬─────────────────────────┘
        │
        ▼
┌───────────────┐
│   React UI    │
│               │
│ Displays the  │
│ generated     │
│ execution     │
│ trace         │
└───────────────┘
```

At a high level:

1. The lexer converts source text into tokens.
2. The parser constructs an abstract syntax tree.
3. The interpreter walks that tree and maintains a variable environment.
4. Meaningful execution events become individual steps.
5. The React interface visualizes those steps using Monaco highlights, variable panels, and trace history.

---

## Supported C Syntax

| Construct | Example | Status |
| --- | --- | --- |
| Integer declaration | `int x = 5;` | ✅ |
| Float / char | `float pi = 3.14;` | ✅ |
| Multi-declaration | `int x = 1, y = 2;` | ✅ |
| Arithmetic | `x = x * 2 + y % 3;` | ✅ |
| Compound assignment | `x += 1; y *= 2;` | ✅ |
| Increment / decrement | `x++` `--i` | ✅ |
| Comparison + logical | `x > 0 && y != 3` | ✅ |
| If / else if / else | Full nesting | ✅ |
| While loop | With iteration counter | ✅ |
| For loop | Init, condition, update | ✅ |
| Do-while | | ✅ |
| Printf simulation | `%d`, `%f`, `%c`, `%s` | ✅ |
| Return statement | | ✅ |
| Line and block comments | `//` and `/* */` | ✅ |
| Preprocessor directives | `#include` silently skipped | ✅ |

---

## Project Structure

```
flowtrace/
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   │
│   ├── engine/
│   │   ├── tokenizer.js
│   │   ├── evaluator.js
│   │   ├── generateSteps.js
│   │   └── interpreters/
│   │       ├── cInterpreter.js
│   │       ├── cppInterpreter.js
│   │       ├── javaInterpreter.js
│   │       └── pythonInterpreter.js
│   │
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── SampleTabs.jsx
│   │   ├── CodeEditor.jsx
│   │   ├── Controls.jsx
│   │   ├── MobileControls.jsx
│   │   ├── MobileTabs.jsx
│   │   ├── CurrentStepPanel.jsx
│   │   ├── VariablesPanel.jsx
│   │   ├── TraceLog.jsx
│   │   └── Footer.jsx
│   │
│   ├── data/
│   │   └── samples.js
│   │
│   ├── hooks/
│   │   └── useBreakpoint.js
│   │
│   ├── utils/
│   │   └── languageConfig.js
│   │
│   └── styles/
│       └── global.css
│
├── package.json
└── vite.config.js
```

---

## Installation

**Prerequisites:** Node.js 18+ and npm.

```bash
git clone https://github.com/Far-200/FlowTrace.git
cd FlowTrace

npm install
npm run dev
```

The development server will normally be available at `http://localhost:5173`.

To create a production build:

```bash
npm run build
```

To preview the production build:

```bash
npm run preview
```

---

## Usage

### Writing Code

1. Open FlowTrace in the browser.
2. Write supported C code directly in the editor or load one of the samples.
3. The currently supported constructs are listed above.

### Running Code

- Click **▶ Step** to move forward one execution step.
- Click **⚡ Run** to play through the trace automatically.
- Click **⏸ Pause** to stop auto-run.
- Click **⟳ Restart** to replay the existing trace.
- Click **↺ Reset** to return to edit mode.

### Reading the Output

During execution:

- the current source line is highlighted;
- the Current Step panel explains what is happening;
- the Variables panel displays the current program state;
- recently changed values are highlighted;
- the Trace Log records previous execution steps.

---

## Limitations

FlowTrace is a simulation engine, not a real C compiler.

It intentionally supports only a subset of the language that is useful for learning basic execution and control flow.

### Not Currently Supported

- Pointers and pointer arithmetic
- Arrays and array indexing
- User-defined functions and call stacks
- Structs and unions
- Dynamic memory allocation
- Standard input such as `scanf`
- Most standard-library functionality
- Preprocessor macros such as `#define`
- Conditional preprocessing
- Multi-file programs
- Full C language semantics
- Undefined behavior

Programs containing unsupported syntax may either produce a validation error or behave according to the simplified semantics implemented by FlowTrace.

---

## Roadmap

### Near-term
- [ ] Array support
- [ ] User-defined functions
- [ ] Visible call-stack panel
- [ ] Execution speed controls
- [ ] Breakpoints

### Medium-term
- [ ] Python execution support
- [ ] Java execution support
- [ ] Memory visualization

### Long-term
- [ ] Optional backend execution using compiler/debugger output
- [ ] WebAssembly-based execution experiments
- [ ] Shareable execution sessions

---

## Why This Project Exists

Execution visualizers such as Python Tutor demonstrate how useful it can be to make program state visible while learning.

FlowTrace explores the same general idea through a more IDE-like interface built around Monaco Editor, interactive execution controls, variable inspection, and an explicit execution trace.

The project also serves as a way to explore how tokenization, parsing, abstract syntax trees, interpretation, and execution visualization fit together inside a developer tool.

The implementation avoids external parsing libraries, which keeps the lexer, parser, and interpreter pipeline directly inspectable inside the repository.

---

## Development Note

FlowTrace was developed with substantial AI-assisted coding.

The project is presented as both a portfolio project and a learning project. Its purpose is not to claim that every subsystem was manually authored from scratch, but to explore the architecture, product design, debugging workflow, and engineering concepts behind an interactive execution visualizer.

The repository is being used as a system to study, understand, test, and progressively modify rather than as evidence of unaided implementation.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | React 19 |
| Build tool | Vite |
| Editor | Monaco Editor (`@monaco-editor/react`) |
| Styling | CSS Modules + inline styles |
| Lexer | Custom tokenizer |
| Parser | Recursive-descent parser |
| Interpreter | Tree-walking AST evaluator |
| Responsive | Custom `useBreakpoint` hook |

The execution pipeline does not rely on an external parsing library or native compiler runtime.

---

## Contributing

Contributions are welcome, especially around:

- additional C syntax;
- new language interpreters;
- execution visualization;
- educational UX;
- bugs that produce incorrect execution traces.

Please open an issue before submitting a large change.

---

## License

MIT License.

You are free to use, modify, and distribute the project according to the terms of the license.

FlowTrace is a portfolio and learning project. It is not affiliated with any compiler toolchain or IDE vendor.
