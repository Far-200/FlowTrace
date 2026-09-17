// src/components/CodeEditor.jsx

import { useEffect, useRef, useState, useCallback } from "react";
import MonacoEditor from "@monaco-editor/react";
import { LANGUAGES } from "../utils/languageConfig.js";

const MONACO_LANG = {
  c: "c",
  cpp: "cpp",
  java: "java",
  python: "python",
};

let completionProviderRegistered = false;
let hoverProviderRegistered = false;

function registerCCompletions(monaco) {
  if (completionProviderRegistered) return;
  completionProviderRegistered = true;

  monaco.languages.registerCompletionItemProvider("c", {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      return {
        suggestions: [
          {
            label: "int",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "int ${1:name} = ${2:0};",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "Integer variable declaration",
            range,
          },
          {
            label: "if",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: ["if (${1:condition}) {", "\t${2}", "}"].join("\n"),
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "if statement",
            range,
          },
          {
            label: "ifelse",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              "if (${1:condition}) {",
              "\t${2}",
              "} else {",
              "\t${3}",
              "}",
            ].join("\n"),
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "if / else statement",
            range,
          },
          {
            label: "while",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: ["while (${1:condition}) {", "\t${2}", "}"].join("\n"),
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "while loop",
            range,
          },
          {
            label: "for",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              "for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {",
              "\t${3}",
              "}",
            ].join("\n"),
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "for loop",
            range,
          },
          {
            label: "printf",
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'printf("${1:%d}\\n", ${2:var});',
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "printf — simulated output",
            range,
          },
          {
            label: "dowhile",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: ["do {", "\t${1}", "} while (${2:condition});"].join(
              "\n",
            ),
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "do-while loop",
            range,
          },
        ],
      };
    },
  });
}

function registerHoverProvider(monaco, getVars) {
  if (hoverProviderRegistered) return;
  hoverProviderRegistered = true;

  monaco.languages.registerHoverProvider("c", {
    provideHover(model, position) {
      const vars = getVars();
      if (!vars || Object.keys(vars).length === 0) return null;
      const word = model.getWordAtPosition(position);
      if (!word) return null;
      const name = word.word;
      if (!(name in vars)) return null;
      const val = vars[name];
      return {
        range: new monaco.Range(
          position.lineNumber,
          word.startColumn,
          position.lineNumber,
          word.endColumn,
        ),
        contents: [
          { value: `**FlowTrace** — current value` },
          { value: `\`\`\`c\n${name} = ${val}\n\`\`\`` },
        ],
      };
    },
  });
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function CodeEditor({
  code,
  onCodeChange,
  steps,
  stepIdx,
  language,
  error,
  onStep,
  onAutoRun,
  onReset,
  isMobile = false, // ← NEW: passed from App.jsx
  editorHeight = null, // ← NEW: explicit px height override
}) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);
  const dimDecoRef = useRef([]);
  const currentVarsRef = useRef({});

  const [autoScroll, setAutoScroll] = useState(true);
  const [copyDone, setCopyDone] = useState(false);

  const currentStep = steps[stepIdx];
  const isExecuting = steps.length > 0;
  const isEmpty = !code || code.trim() === "";
  const langCfg = LANGUAGES[language];
  const monacoLang = MONACO_LANG[language] ?? "plaintext";
  const progress = steps.length
    ? Math.round(((stepIdx + 1) / steps.length) * 100)
    : 0;
  const isDone = steps.length > 0 && stepIdx === steps.length - 1;

  // Sync the hover provider's closure with the latest step. This runs
  // in an effect (not during render) because currentVarsRef is read by
  // an external system — Monaco's async hover callback — not by this
  // component's own render output.
  useEffect(() => {
    currentVarsRef.current = currentStep?.variables ?? {};
  }, [currentStep]);

  // ── Mount ─────────────────────────────────────────────────
  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;
    registerCCompletions(monaco);
    registerHoverProvider(monaco, () => currentVarsRef.current);

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () =>
      onStep?.(),
    );
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, () =>
      onAutoRun?.(),
    );
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR, () =>
      onReset?.(),
    );
  }

  // ── Line decorations ──────────────────────────────────────
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const totalLines = editor.getModel()?.getLineCount() ?? 0;

    if (!currentStep?.line) {
      decorationsRef.current = editor.deltaDecorations(
        decorationsRef.current,
        [],
      );
      dimDecoRef.current = editor.deltaDecorations(dimDecoRef.current, []);
      return;
    }

    const activeL = currentStep.line;

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
      {
        range: new monaco.Range(activeL, 1, activeL, 1),
        options: {
          isWholeLine: true,
          className: "ft-active-line",
          linesDecorationsClassName: "ft-active-border",
          glyphMarginClassName: "ft-active-glyph",
          overviewRuler: {
            color: "#3b82f6",
            position: monaco.editor.OverviewRulerLane.Left,
          },
        },
      },
    ]);

    const dimRanges = [];
    if (activeL > 1) {
      dimRanges.push({
        range: new monaco.Range(1, 1, activeL - 1, 1),
        options: { isWholeLine: true, className: "ft-dim-line" },
      });
    }
    if (activeL < totalLines) {
      dimRanges.push({
        range: new monaco.Range(activeL + 1, 1, totalLines, 1),
        options: { isWholeLine: true, className: "ft-dim-line" },
      });
    }
    dimDecoRef.current = editor.deltaDecorations(dimDecoRef.current, dimRanges);

    if (autoScroll) editor.revealLineInCenter(activeL);
  }, [currentStep, autoScroll]);

  // ── Clear on reset ────────────────────────────────────────
  useEffect(() => {
    if (!isExecuting && editorRef.current) {
      decorationsRef.current = editorRef.current.deltaDecorations(
        decorationsRef.current,
        [],
      );
      dimDecoRef.current = editorRef.current.deltaDecorations(
        dimDecoRef.current,
        [],
      );
    }
  }, [isExecuting]);

  // ── Read-only ─────────────────────────────────────────────
  useEffect(() => {
    editorRef.current?.updateOptions({ readOnly: isExecuting });
  }, [isExecuting]);

  // ── Error markers ─────────────────────────────────────────
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (!model) return;

    if (error) {
      const lineMatch = error.match(/Line\s+(\d+)/i);
      const errLine = lineMatch ? parseInt(lineMatch[1], 10) : 1;
      monaco.editor.setModelMarkers(model, "flowtrace", [
        {
          startLineNumber: errLine,
          endLineNumber: errLine,
          startColumn: 1,
          endColumn: model.getLineMaxColumn(errLine),
          message: error,
          severity: monaco.MarkerSeverity.Error,
        },
      ]);
      editor.revealLineInCenter(errLine);
    } else {
      monaco.editor.setModelMarkers(model, "flowtrace", []);
    }
  }, [error]);

  // ── Copy ──────────────────────────────────────────────────
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    });
  }, [code]);

  // ── Download ──────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    const ext =
      language === "python"
        ? "py"
        : language === "java"
          ? "java"
          : language === "cpp"
            ? "cpp"
            : "c";
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flowtrace_code.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [code, language]);

  // ── Monaco options ────────────────────────────────────────
  const editorOptions = {
    fontSize: isMobile ? 12 : 13,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontLigatures: true,
    lineNumbers: "on",
    lineNumbersMinChars: isMobile ? 2 : 3,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: "off",
    tabSize: 2,
    insertSpaces: true,
    autoClosingBrackets: "always",
    autoClosingQuotes: "always",
    autoIndent: "full",
    formatOnType: true,
    matchBrackets: "always",
    renderLineHighlight: "none",
    cursorBlinking: "smooth",
    cursorSmoothCaretAnimation: "on",
    smoothScrolling: true,
    glyphMargin: !isMobile, // saves space on mobile
    scrollbar: {
      verticalScrollbarSize: 6,
      horizontalScrollbarSize: 6,
    },
    padding: { top: 8, bottom: 8 },
    readOnly: isExecuting,
    readOnlyMessage: { value: "↺ Reset to edit code" },
  };

  // ── Height calculation ────────────────────────────────────
  // KEY FIX: Never use "100%" for Monaco height — it requires
  // every ancestor to have explicit heights, which breaks on mobile.
  // Instead we either use the passed editorHeight prop (explicit px)
  // or a sensible default based on context.
  // The panel header is ~38px, error/done banners are ~34px each.
  // On desktop (no editorHeight prop) we use "100%" safely because
  // the desktop layout has a properly bounded flex chain.
  const headerH = 38;
  const errorH = error ? 34 : 0;
  const doneH = isDone ? 34 : 0;
  const reservedH = headerH + errorH + doneH;

  let monacoHeight;
  if (editorHeight) {
    // Explicit px passed from parent — subtract reserved chrome
    monacoHeight = Math.max(editorHeight - reservedH, 80);
  } else if (isMobile) {
    // Mobile fallback — never trust flex chain
    monacoHeight = 200;
  } else {
    // Desktop — flex chain is reliable
    monacoHeight = "100%";
  }

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div
      className="panel"
      style={{
        display: "flex",
        flexDirection: "column",
        position: "relative",
        // On desktop: participate in flex chain normally
        // On mobile: just wrap content, height comes from parent
        flex: isMobile ? undefined : 1,
        height: isMobile ? "100%" : undefined,
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {/* Decoration styles */}
      <style>{`
        .ft-active-line   { background: rgba(59,130,246,0.13) !important; transition: background 0.2s ease; }
        .ft-active-border { background: #3b82f6 !important; width: 3px !important; margin-left: 2px; border-radius: 2px; box-shadow: 0 0 8px rgba(59,130,246,0.6); }
        .ft-active-glyph::before { content: "▶"; color: #3b82f6; font-size: 10px; margin-left: 4px; text-shadow: 0 0 6px rgba(59,130,246,0.8); }
        .ft-dim-line { opacity: 0.45; transition: opacity 0.15s ease; }
        @keyframes ft-var-pulse {
          0%   { box-shadow: 0 0 0 0   rgba(59,130,246,0.6); }
          60%  { box-shadow: 0 0 0 6px rgba(59,130,246,0);   }
          100% { box-shadow: 0 0 0 0   rgba(59,130,246,0);   }
        }
        .ft-var-changed { animation: ft-var-pulse 0.5s ease forwards; }
        @keyframes ft-dot-pulse {
          0%, 100% { opacity: 1;   transform: scale(1);   }
          50%      { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>

      {/* ── Panel header ── */}
      <div className="panel-header">
        <span>
          {langCfg?.icon} {langCfg?.label} Editor
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Hide scroll/copy/download buttons on mobile to save space */}
          {!isMobile && (
            <>
              <button
                title="Toggle auto-scroll"
                onClick={() => setAutoScroll((p) => !p)}
                style={{
                  background: autoScroll
                    ? "rgba(59,130,246,0.15)"
                    : "transparent",
                  border: `1px solid ${autoScroll ? "#3b82f6" : "#1f2937"}`,
                  borderRadius: 4,
                  color: autoScroll ? "#60a5fa" : "#4b5563",
                  fontSize: 10,
                  padding: "2px 7px",
                  cursor: "pointer",
                  fontFamily: "monospace",
                }}
              >
                ⇅ scroll
              </button>

              {!isEmpty && (
                <button
                  title="Copy code"
                  onClick={handleCopy}
                  style={{
                    background: "transparent",
                    border: "1px solid #1f2937",
                    borderRadius: 4,
                    color: copyDone ? "#34d399" : "#4b5563",
                    fontSize: 10,
                    padding: "2px 7px",
                    cursor: "pointer",
                    fontFamily: "monospace",
                  }}
                >
                  {copyDone ? "✓ copied" : "⎘ copy"}
                </button>
              )}

              {!isEmpty && (
                <button
                  title="Download"
                  onClick={handleDownload}
                  style={{
                    background: "transparent",
                    border: "1px solid #1f2937",
                    borderRadius: 4,
                    color: "#4b5563",
                    fontSize: 10,
                    padding: "2px 7px",
                    cursor: "pointer",
                    fontFamily: "monospace",
                  }}
                >
                  ↓ save
                </button>
              )}
            </>
          )}

          {isExecuting ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                className="progress-bar"
                style={{ width: isMobile ? 60 : 80 }}
              >
                <div
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span style={{ fontSize: 10, color: "#6b7280", minWidth: 28 }}>
                {progress}%
              </span>
            </div>
          ) : (
            <span style={{ fontSize: 10, color: "#3b82f6" }}>
              {langCfg?.supported
                ? isMobile
                  ? "tap Step ↓"
                  : "Ctrl+Enter to step"
                : langCfg?.comingSoon}
            </span>
          )}
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div
          style={{
            padding: "8px 14px",
            background: "#1c0a0a",
            borderBottom: "1px solid #7f1d1d",
            color: "#f87171",
            fontSize: 11,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "monospace",
            flexShrink: 0,
          }}
        >
          <span>⚠️</span>
          <span style={{ flex: 1, lineHeight: 1.5 }}>{error}</span>
        </div>
      )}

      {/* ── Execution complete banner ── */}
      {isDone && (
        <div
          style={{
            padding: "7px 14px",
            background: "rgba(52,211,153,0.07)",
            borderBottom: "1px solid rgba(52,211,153,0.2)",
            color: "#34d399",
            fontSize: 11,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "monospace",
            flexShrink: 0,
          }}
        >
          <span>✓</span>
          <span>Execution complete — all {steps.length} steps done</span>
        </div>
      )}

      {/* ── Monaco editor ── */}
      {/* CRITICAL: use explicit px height, NOT "100%" or flex:1     */}
      {/* "100%" breaks when any ancestor lacks an explicit height.   */}
      <div
        style={{
          position: "relative",
          background: "#1e1e1e",
          // flex: 1 on desktop where chain is reliable
          // explicit height on mobile where chain is not
          flex: !isMobile && !editorHeight ? 1 : undefined,
          height: isMobile || editorHeight ? monacoHeight : undefined,
          minHeight: 0,
          flexShrink: 0,
        }}
      >
        <MonacoEditor
          height={monacoHeight}
          width="100%"
          language={monacoLang}
          value={code}
          theme="vs-dark"
          options={editorOptions}
          onChange={(val) => onCodeChange(val ?? "")}
          onMount={handleEditorDidMount}
          loading={
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                background: "#1e1e1e",
                color: "#4b5563",
                fontSize: 12,
                fontFamily: "monospace",
              }}
            >
              <span style={{ animation: "ft-dot-pulse 1.2s ease infinite" }}>
                ⚡ Loading editor...
              </span>
            </div>
          }
        />

        {/* Keyboard shortcut hint — desktop only */}
        {!isMobile && !isExecuting && !isEmpty && (
          <div
            style={{
              position: "absolute",
              bottom: 10,
              right: 14,
              fontSize: 10,
              color: "#374151",
              fontFamily: "monospace",
              pointerEvents: "none",
              lineHeight: 1.8,
              textAlign: "right",
            }}
          >
            <span style={{ color: "#1f2937" }}>Ctrl+Enter</span> Step &nbsp;
            <span style={{ color: "#1f2937" }}>⇧+Enter</span> Run &nbsp;
            <span style={{ color: "#1f2937" }}>Ctrl+R</span> Reset
          </div>
        )}

        {/* Floating executing badge */}
        {isExecuting && !isDone && currentStep && (
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 14,
              background: "rgba(59,130,246,0.15)",
              border: "1px solid rgba(59,130,246,0.3)",
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: 10,
              color: "#60a5fa",
              fontFamily: "monospace",
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
              backdropFilter: "blur(4px)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#3b82f6",
                display: "inline-block",
                animation: "ft-dot-pulse 1.2s ease-in-out infinite",
              }}
            />
            L{currentStep.line}
          </div>
        )}

        {/* Empty state overlay */}
        {isEmpty && !isExecuting && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(13,17,23,0.85)",
              backdropFilter: "blur(2px)",
              pointerEvents: "none",
              zIndex: 10,
              gap: 10,
              padding: 20,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "linear-gradient(135deg, #1e3a5f, #1e1b4b)",
                border: "1px solid #1f2937",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              ⚡
            </div>
            <div
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 600,
                fontSize: isMobile ? 13 : 15,
                color: "#e2e8f0",
                textAlign: "center",
              }}
            >
              Start typing your code
            </div>
            <div
              style={{
                fontSize: 10,
                color: "#4b5563",
                textAlign: "center",
                maxWidth: 220,
                lineHeight: 1.6,
              }}
            >
              Or load a sample above.
              {!isMobile && (
                <>
                  <br />
                  Ctrl+Enter to step · Shift+Enter to run
                </>
              )}
            </div>
          </div>
        )}

        {/* Coming soon overlay */}
        {!langCfg?.supported && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(13,17,23,0.9)",
              backdropFilter: "blur(3px)",
              zIndex: 10,
              gap: 10,
              pointerEvents: "none",
            }}
          >
            <div style={{ fontSize: 28 }}>{langCfg?.icon}</div>
            <div
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 600,
                fontSize: 14,
                color: "#e2e8f0",
              }}
            >
              {langCfg?.label} Editor
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#fbbf24",
                background: "rgba(251,191,36,0.08)",
                border: "1px solid rgba(251,191,36,0.2)",
                borderRadius: 8,
                padding: "7px 14px",
                textAlign: "center",
              }}
            >
              🚧 {langCfg?.comingSoon}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
