# FlowTrace

**A step-by-step code execution visualizer built for learning how code actually runs.**

FlowTrace simulates the execution of C-like programs line by line — showing you exactly which line is executing, how variables change, and why control flows the way it does. No compiler. No black box. Just clarity.

> Built with React, Monaco Editor, and a custom AST-based interpreter written entirely in JavaScript.

---

## What It Does

Most beginners write code and run it — but they never _see_ it run. They guess at variable values, misread loop conditions, and stare at output wondering how it got there.

FlowTrace fixes that. Paste in a C program, click **Step**, and watch execution unfold one line at a time. Every variable update is live. Every branch decision is annotated. The trace log keeps a full history of what happened.

It feels like having a debugger — except built for learning, not production.

---

## Features

### Editor

- Full Monaco Editor integration (the same engine powering VS Code)
- Syntax highlighting for C, C++, Java, and Python
- Auto-closing brackets, parentheses, and quotes
- Smart indentation and tab-to-spaces support
- Bracket pair matching
- Autocomplete snippets for `int`, `if`, `while`, `for`, `printf`, and more
- Hover over any variable during execution to see its current value

### Execution Engine

- **Step mode** — advance one line at a time
- **Auto-run mode** — plays through all steps at 700ms intervals with pause support
- **Restart** — replay from step 1 without re-parsing
- **Reset** — return to edit mode instantly
- Live variable panel with change detection and value history trail
- Color-coded execution notes (condition results, assignments, output, returns)
- Loop guard — stops runaway loops after 100 iterations

### UI / UX

- Active line highlight via Monaco Decorations API (not CSS hacks)
- Non-active lines dimmed during execution for focus
- Scroll sync — editor automatically follows the executing line
- Execution progress bar
- Floating execution badge showing current line number
- Error banner with line-specific red squiggles (Monaco markers)
- Copy code and download as `.c` / `.cpp` / `.java` / `.py`
- Fully responsive — desktop side-by-side layout, mobile tabbed layout
- Sticky controls bar on mobile with thumb-accessible tap targets
- Keyboard shortcuts: `Ctrl+Enter` (Step), `Shift+Enter` (Auto-run), `Ctrl+R` (Reset)

---

## Screenshots

> _(Coming soon)_

| Desktop — Execution in progress     | Mobile — Variables tab             |
| ----------------------------------- | ---------------------------------- |
| `screenshots/desktop-execution.png` | `screenshots/mobile-variables.png` |

| Editor — Empty state          | Trace log                   |
| ----------------------------- | --------------------------- |
| `screenshots/empty-state.png` | `screenshots/trace-log.png` |

---

## How It Works

FlowTrace does not compile or execute real C. It runs a custom simulation pipeline entirely in the browser:

```
Raw C Source Code
        │
        ▼
┌───────────────┐
│    Lexer      │  Converts source text into typed tokens
│  tokenizer.js │  e.g. "int x = 5;" → [INT, IDENT, EQ, NUMBER, SEMI]
└───────┬───────┘
        │
        ▼
┌───────────────┐
│    Parser     │  Recursive descent parser builds an AST
│ cInterpreter  │  Each node: { kind, line, ...fields }
└───────┬───────┘
        │
        ▼
┌───────────────────────────────────────────┐
│              AST Interpreter              │
│                                           │
│  Walks the tree, evaluates expressions,   │
│  mutates an environment { varName: value} │
│  Emits one Step per meaningful action:    │
│  { line, code, variables, note }          │
└───────┬───────────────────────────────────┘
        │
        ▼
┌───────────────┐
│   React UI    │  Renders steps on demand
│               │  Monaco decorations highlight active line
│               │  Variable panel diffs previous vs current state
└───────────────┘
```

### Supported C Syntax

| Construct               | Example                     | Status |
| ----------------------- | --------------------------- | ------ |
| Integer declaration     | `int x = 5;`                | ✅     |
| Float / char            | `float pi = 3.14;`          | ✅     |
| Multi-declaration       | `int x = 1, y = 2;`         | ✅     |
| Arithmetic              | `x = x * 2 + y % 3;`        | ✅     |
| Compound assignment     | `x += 1;` `y *= 2;`         | ✅     |
| Increment / decrement   | `x++` `--i`                 | ✅     |
| Comparison + logical    | `x > 0 && y != 3`           | ✅     |
| If / else if / else     | Full nesting                | ✅     |
| While loop              | With iteration counter      | ✅     |
| For loop                | Init, condition, update     | ✅     |
| Do-while                |                             | ✅     |
| Printf simulation       | `%d`, `%f`, `%c`, `%s`      | ✅     |
| Return statement        |                             | ✅     |
| Line and block comments | `//` and `/* */`            | ✅     |
| Preprocessor directives | `#include` silently skipped | ✅     |

---

## Project Structure

```
flowtrace/
├── src/
│   ├── App.jsx                      # Root — layout, state, orchestration
│   ├── main.jsx
│   │
│   ├── engine/
│   │   ├── tokenizer.js             # Lexer: source → token list
│   │   ├── evaluator.js             # Expression evaluator (recursive descent)
│   │   ├── generateSteps.js         # Language router → interpreter
│   │   └── interpreters/
│   │       ├── cInterpreter.js      # Full AST-based C interpreter
│   │       ├── cppInterpreter.js    # Delegates to C (planned extension)
│   │       ├── javaInterpreter.js   # Placeholder
│   │       └── pythonInterpreter.js # Placeholder
│   │
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── SampleTabs.jsx
│   │   ├── CodeEditor.jsx           # Monaco integration + decorations
│   │   ├── Controls.jsx             # Desktop execution controls
│   │   ├── MobileControls.jsx       # Fixed bottom bar (mobile)
│   │   ├── MobileTabs.jsx           # Panel tab switcher (mobile)
│   │   ├── CurrentStepPanel.jsx
│   │   ├── VariablesPanel.jsx
│   │   ├── TraceLog.jsx
│   │   └── Footer.jsx
│   │
│   ├── data/
│   │   └── samples.js               # Sample programs per language
│   │
│   ├── hooks/
│   │   └── useBreakpoint.js         # ResizeObserver-based responsive hook
│   │
│   ├── utils/
│   │   └── languageConfig.js        # Language metadata + support flags
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
# Clone the repository
git clone https://github.com/your-username/flowtrace.git

# Navigate into the project
cd flowtrace

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`.

```bash
# Build for production
npm run build

# Preview the production build
npm run preview
```

---

## Usage

**Writing code:**

- Open FlowTrace in your browser
- The editor starts empty — write C code directly or click a sample from the tabs
- Supported constructs are listed in the table above

**Running code:**

- Click **▶ Step** to execute one line at a time (or `Ctrl+Enter`)
- Click **⚡ Run** to play through all steps automatically (or `Shift+Enter`)
- Click **⏸ Pause** during auto-run to stop at the current line
- Click **⟳ Restart** to replay from step 1 without re-parsing
- Click **↺ Reset** to return to edit mode (`Ctrl+R`)

**Reading the output:**

- The active line is highlighted blue in the editor
- The **Current Step** panel shows the line being executed and an annotation explaining what happened
- The **Variables** panel shows all live variables, highlights ones that just changed, and shows a delta (`+1`, `-3`) on updates
- The **Trace Log** records every step in reverse chronological order

---

## Limitations

FlowTrace is a **simulation engine**, not a real C compiler. It is intentionally scoped to the constructs that are most relevant for learning.

**Not supported (yet):**

- Pointers and pointer arithmetic (`*`, `&`)
- Arrays and array indexing
- User-defined functions and call stacks
- Structs and unions
- Dynamic memory (`malloc`, `free`)
- Standard library calls (`scanf`, `fgets`, `math.h`, etc.)
- Preprocessor directives (`#define`, `#ifdef`)
- Multi-file programs
- Undefined behavior — FlowTrace will either error cleanly or produce simplified output

If you paste a program that uses unsupported features, FlowTrace will either skip those lines silently or surface a clear error message. It will not crash.

---

## Roadmap

**Near-term:**

- [ ] Array support (`int arr[5]`, indexing, iteration)
- [ ] User-defined functions with a visible call stack panel
- [ ] Execution speed control (slow / normal / fast)
- [ ] Breakpoints — click a line number to pause there

**Medium-term:**

- [ ] Python interpreter (indentation-based block parsing)
- [ ] Java interpreter
- [ ] Memory view — visualize stack allocations

**Long-term:**

- [ ] Optional backend execution mode using GCC + GDB output parsing
- [ ] WebAssembly-based real C execution in the browser
- [ ] Collaborative mode — share a session link

---

## Why This Project Exists

Tools like Python Tutor showed that visualizing execution changes how people learn to program. But Python Tutor is limited in scope and dated in design.

FlowTrace is an attempt to build something closer to a real developer tool — with a proper editor, a real parse tree, and a UI that respects the user's intelligence — while keeping the core goal simple: **make code stop being magic and start being visible.**

The interpreter is written from scratch (no eval, no external parsing libraries) specifically because understanding how a lexer, parser, and tree-walking interpreter work is itself a valuable learning outcome. The codebase is intentionally readable and documented for exactly this reason.

---

## Tech Stack

| Layer       | Technology                                   |
| ----------- | -------------------------------------------- |
| Framework   | React 19                                     |
| Build tool  | Vite                                         |
| Editor      | Monaco Editor (`@monaco-editor/react`)       |
| Styling     | CSS Modules + inline styles                  |
| Lexer       | Custom (tokenizer.js)                        |
| Parser      | Recursive descent (cInterpreter.js)          |
| Interpreter | Tree-walking AST evaluator                   |
| Responsive  | Custom `useBreakpoint` hook (ResizeObserver) |

No UI component libraries. No external parsing libraries. No runtime dependencies beyond React and Monaco.

---

## Contributing

Contributions are welcome, especially for:

- New language interpreters (Python, Java)
- Additional C syntax support
- Bug reports with code that produces incorrect output

Please open an issue before submitting a large PR.

---

## License

MIT License — free to use, modify, and distribute.
Just..........credit the original author🫠

---

_FlowTrace is a portfolio and learning project. It is not affiliated with any compiler toolchain or IDE vendor._
