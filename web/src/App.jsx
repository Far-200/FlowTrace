// src/App.jsx
import { useState, useCallback, useMemo, useRef } from "react";

import { generateSteps } from "./engine/generateSteps.js";
import { SAMPLES } from "./data/samples.js";
import { LANGUAGES } from "./utils/languageConfig.js";
import { useBreakpoint } from "./hooks/useBreakpoint.js";

import Header from "./components/Header.jsx";
import SampleTabs from "./components/SampleTabs.jsx";
import CodeEditor from "./components/CodeEditor.jsx";
import Controls from "./components/Controls.jsx";
import MobileControls from "./components/MobileControls.jsx";
import MobileTabs from "./components/MobileTabs.jsx";
import CurrentStepPanel from "./components/CurrentStepPanel.jsx";
import VariablesPanel from "./components/VariablesPanel.jsx";
import CallStackPanel from "./components/CallStackPanel.jsx";
import TraceLog from "./components/TraceLog.jsx";
import Footer from "./components/Footer.jsx";

import "./styles/global.css";

// ── How tall the mobile editor is in px ──────────────────────
// This single constant controls everything. Change it here only.
const MOBILE_EDITOR_HEIGHT = 260;

export default function App() {
  const { isMobile, isTablet } = useBreakpoint();

  const [language, setLanguage] = useState("c");
  const [code, setCode] = useState("");
  const [steps, setSteps] = useState([]);
  const [stepIdx, setStepIdx] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState("");
  const [varHistory, setVarHistory] = useState([]);
  const [activeSample, setActiveSample] = useState("");
  const [mobileTab, setMobileTab] = useState("step");

  const autoRef = useRef(null);

  const currentStep = steps[stepIdx];
  const prevStep = steps[stepIdx - 1];
  const isDone = steps.length > 0 && stepIdx === steps.length - 1;
  const isSupported = LANGUAGES[language]?.supported ?? false;
  const currentSamples = useMemo(() => SAMPLES[language] ?? {}, [language]);
  const isEmpty = !code || code.trim() === "";
  const varCount = currentStep ? Object.keys(currentStep.variables).length : 0;

  // ── Engine ────────────────────────────────────────────────
  const compile = useCallback(() => {
    if (isEmpty) return [];
    try {
      const s = generateSteps(code, language);
      setSteps(s);
      setStepIdx(-1);
      setVarHistory([]);
      setError("");
      return s;
    } catch (e) {
      setError(e.message);
      return [];
    }
  }, [code, language, isEmpty]);

  const handleReset = useCallback(() => {
    clearInterval(autoRef.current);
    setIsRunning(false);
    setSteps([]);
    setStepIdx(-1);
    setVarHistory([]);
    setError("");
  }, []);

  const handleRestart = useCallback(() => {
    clearInterval(autoRef.current);
    setIsRunning(false);
    setStepIdx(-1);
    setVarHistory([]);
  }, []);

  const handleStep = useCallback(() => {
    let s = steps;
    if (s.length === 0) {
      s = compile();
      if (s.length === 0) return;
    }
    const next = stepIdx + 1;
    if (next < s.length) {
      setStepIdx(next);
      setVarHistory((prev) => [
        ...prev,
        { stepIdx: next, vars: { ...s[next].variables } },
      ]);
    }
  }, [steps, stepIdx, compile]);

  const handleAutoRun = useCallback(() => {
    if (isRunning) {
      clearInterval(autoRef.current);
      setIsRunning(false);
      return;
    }
    let s = steps;
    if (s.length === 0) {
      s = compile();
      if (s.length === 0) return;
    }
    setIsRunning(true);
    let idx = stepIdx;
    autoRef.current = setInterval(() => {
      idx++;
      if (idx >= s.length) {
        clearInterval(autoRef.current);
        setIsRunning(false);
        setStepIdx(s.length - 1);
        return;
      }
      setStepIdx(idx);
      setVarHistory((prev) => [
        ...prev,
        { stepIdx: idx, vars: { ...s[idx].variables } },
      ]);
    }, 700);
  }, [isRunning, steps, stepIdx, compile]);

  const handleSampleSelect = useCallback(
    (name) => {
      handleReset();
      setActiveSample(name);
      setCode(currentSamples[name] ?? "");
    },
    [handleReset, currentSamples],
  );

  const handleLanguageChange = useCallback(
    (lang) => {
      handleReset();
      setLanguage(lang);
      setActiveSample("");
      setCode("");
    },
    [handleReset],
  );

  const handleClear = useCallback(() => {
    handleReset();
    setCode("");
    setActiveSample("");
  }, [handleReset]);

  const controlProps = {
    onStep: handleStep,
    onAutoRun: handleAutoRun,
    onReset: handleReset,
    onRestart: handleRestart,
    onCompile: compile,
    onClear: handleClear,
    isRunning,
    isDone,
    hasSteps: steps.length > 0,
    isSupported,
    isEmpty,
  };

  const panelProps = {
    currentStep,
    prevStep,
    stepIdx,
    totalSteps: steps.length,
    varHistory,
  };

  // ═══════════════════════════════════════════════════════════
  // DESKTOP layout (≥ 768px)
  // ═══════════════════════════════════════════════════════════
  if (!isMobile) {
    return (
      <div
        style={{
          height: "100vh",
          background: "#0a0c10",
          color: "#e2e8f0",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Header
          language={language}
          onLanguageChange={handleLanguageChange}
          stepIdx={stepIdx}
          totalSteps={steps.length}
          isMobile={false}
        />
        <SampleTabs
          samples={currentSamples}
          activeSample={activeSample}
          onSelect={handleSampleSelect}
        />

        <div
          style={{
            display: "flex",
            flex: 1,
            gap: isTablet ? 12 : 16,
            padding: isTablet ? "12px 16px" : "16px 24px",
            overflow: "hidden",
            minHeight: 0,
          }}
        >
          {/* Left: editor + controls */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            {/* Wrapper gives editor a bounded flex context */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <CodeEditor
                code={code}
                onCodeChange={(val) => {
                  setCode(val);
                  setActiveSample("");
                }}
                steps={steps}
                stepIdx={stepIdx}
                language={language}
                error={error}
                onStep={handleStep}
                onAutoRun={handleAutoRun}
                onReset={handleReset}
                isMobile={false}
                // No editorHeight on desktop — uses flex chain
              />
            </div>
            <Controls {...controlProps} />
          </div>

          {/* Right: panels */}
          <div
            className="inspector-sidebar"
            style={{
              width: isTablet ? 240 : 280,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              flexShrink: 0,
              overflowY: "auto",
            }}
          >
            <CurrentStepPanel {...panelProps} />
            <VariablesPanel {...panelProps} />
            <CallStackPanel currentStep={currentStep} />
            <TraceLog varHistory={varHistory} steps={steps} />
          </div>
        </div>

        <Footer language={language} />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // MOBILE layout (< 768px)
  // ═══════════════════════════════════════════════════════════
  return (
    <div
      style={{
        height: "100dvh",
        background: "#0a0c10",
        color: "#e2e8f0",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Header
        language={language}
        onLanguageChange={handleLanguageChange}
        stepIdx={stepIdx}
        totalSteps={steps.length}
        isMobile={true}
      />

      <SampleTabs
        samples={currentSamples}
        activeSample={activeSample}
        onSelect={handleSampleSelect}
      />

      {/* ── Editor block ──────────────────────────────────── */}
      {/* Explicit px height — never trusts flex chain on mobile */}
      <div
        style={{
          height: MOBILE_EDITOR_HEIGHT,
          flexShrink: 0,
          padding: "8px 10px 0",
        }}
      >
        <CodeEditor
          code={code}
          onCodeChange={(val) => {
            setCode(val);
            setActiveSample("");
          }}
          steps={steps}
          stepIdx={stepIdx}
          language={language}
          error={error}
          onStep={handleStep}
          onAutoRun={handleAutoRun}
          onReset={handleReset}
          isMobile={true}
          editorHeight={MOBILE_EDITOR_HEIGHT - 8} // minus top padding
        />
      </div>

      {/* ── Mobile tab bar ─────────────────────────────────── */}
      <div style={{ flexShrink: 0, marginTop: 8 }}>
        <MobileTabs
          activeTab={mobileTab}
          onTabChange={setMobileTab}
          stepCount={varHistory.length}
          varCount={varCount}
        />
      </div>

      {/* ── Scrollable panel area ───────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px 10px 90px",
          minHeight: 0,
        }}
      >
        {mobileTab === "step" && <CurrentStepPanel {...panelProps} />}
        {mobileTab === "variables" && <VariablesPanel {...panelProps} />}
        {mobileTab === "stack" && <CallStackPanel currentStep={currentStep} />}
        {mobileTab === "trace" && <TraceLog varHistory={varHistory} steps={steps} />}
      </div>

      {/* ── Fixed bottom controls ───────────────────────────── */}
      <MobileControls {...controlProps} />
    </div>
  );
}
