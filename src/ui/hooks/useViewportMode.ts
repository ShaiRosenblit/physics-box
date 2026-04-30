import { useEffect, useState } from "react";

export type ViewportMode = "desktop" | "tablet" | "phone";

export const VIEWPORT_BREAKPOINTS = {
  /** Tablet and up: rails visible, canvas dominates. */
  tablet: 720,
  /** Desktop and up: full-width labelled panels. */
  desktop: 1180,
  /**
   * If the smaller dimension is below this, we treat the viewport as a
   * phone regardless of width. Catches phones in landscape and very
   * short browser windows where rails would crowd the canvas.
   */
  phoneShortSide: 540,
} as const;

function modeForViewport(width: number, height: number): ViewportMode {
  const shortSide = Math.min(width, height);
  if (shortSide < VIEWPORT_BREAKPOINTS.phoneShortSide) return "phone";
  if (width < VIEWPORT_BREAKPOINTS.tablet) return "phone";
  if (width < VIEWPORT_BREAKPOINTS.desktop) return "tablet";
  return "desktop";
}

/**
 * React hook returning the current viewport mode based on window width.
 * SSR-safe: defaults to "desktop" until the first effect runs in the
 * browser. Updates on resize via matchMedia listeners (cheaper than
 * resize events).
 */
export function useViewportMode(): ViewportMode {
  const [mode, setMode] = useState<ViewportMode>(() => {
    if (typeof window === "undefined") return "desktop";
    return modeForViewport(window.innerWidth, window.innerHeight);
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const recompute = () => {
      setMode(modeForViewport(window.innerWidth, window.innerHeight));
    };
    recompute();

    // Listen on resize + orientationchange so we react to landscape /
    // portrait flips on phones (where the short-side rule matters most).
    window.addEventListener("resize", recompute, { passive: true });
    window.addEventListener("orientationchange", recompute);
    return () => {
      window.removeEventListener("resize", recompute);
      window.removeEventListener("orientationchange", recompute);
    };
  }, []);

  return mode;
}
