// src/hooks/useBreakpoint.js
// ─────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
// Single source of truth for responsive breakpoints.
// Every component imports this instead of duplicating
// window.innerWidth checks. Uses ResizeObserver for accuracy.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";

const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
};

export function useBreakpoint() {
  const [width, setWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1280,
  );

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, []);

  return {
    width,
    isMobile: width < BREAKPOINTS.mobile,
    isTablet: width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet,
    isDesktop: width >= BREAKPOINTS.tablet,
  };
}
