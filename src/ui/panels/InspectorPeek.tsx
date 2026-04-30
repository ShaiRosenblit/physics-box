import { useEffect, useState } from "react";
import { testIds } from "../a11y/ids";
import { useUIStore } from "../state/store";
import { useSimulationContext } from "../hooks/SimulationContext";
import type { BodyView } from "../../simulation";

/**
 * Compact, non-modal status pill for phone mode.
 *
 * Sits just above the playback bar, summarizes the selected body in
 * one line, and only opens the full inspector on explicit tap. Stays
 * out of the way while a drag is in progress so the canvas is never
 * obscured during manipulation.
 */
export function InspectorPeek() {
  const selectedId = useUIStore((s) => s.selectedId);
  const dragging = useUIStore((s) => s.dragging);
  const setInspectorOpen = useUIStore((s) => s.setInspectorOpen);
  const { world } = useSimulationContext();
  const [view, setView] = useState<BodyView | null>(null);

  useEffect(() => {
    if (selectedId === null) {
      setView(null);
      return;
    }
    let cancelled = false;
    let raf = 0;
    const tick = () => {
      if (cancelled) return;
      const snap = world.snapshot();
      const body = snap.bodies.find((b) => b.id === selectedId) ?? null;
      setView(body);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [selectedId, world]);

  if (view === null) return null;

  // Drag-aware visibility: keep the peek mounted (so it can fade) but
  // make it pointer-transparent and dim while the user is dragging.
  const summary = summarize(view);

  return (
    <button
      type="button"
      data-testid={testIds.inspectorPeek}
      data-state={dragging ? "dragging" : "idle"}
      aria-label={`Inspect ${summary.label}`}
      aria-disabled={dragging ? true : undefined}
      onClick={dragging ? undefined : () => setInspectorOpen(true)}
      style={{
        ...peekStyle,
        opacity: dragging ? 0 : 1,
        pointerEvents: dragging ? "none" : "auto",
      }}
    >
      <span style={dotStyle(summary.tint)} aria-hidden="true" />
      <span style={labelStyle}>{summary.label}</span>
      <span style={statsStyle}>{summary.stats}</span>
      <span style={chevronStyle} aria-hidden="true">
        ⌃
      </span>
    </button>
  );
}

function summarize(view: BodyView): {
  label: string;
  stats: string;
  tint: string;
} {
  const speed = Math.hypot(view.velocity.x, view.velocity.y);
  const speedStr = `${fmt(speed)} m/s`;
  if (view.kind === "ball") {
    if (view.charge !== 0) {
      return {
        label: `#${view.id} · Ball ${view.charge > 0 ? "(+)" : "(−)"}`,
        stats: `${speedStr} · q ${fmt(view.charge)} C`,
        tint: view.charge > 0 ? "#9c4a3a" : "#3a567a",
      };
    }
    return {
      label: `#${view.id} · Ball`,
      stats: speedStr,
      tint: "#5a4f43",
    };
  }
  if (view.kind === "magnet") {
    return {
      label: `#${view.id} · Magnet ${view.dipole >= 0 ? "N" : "S"}`,
      stats: `${speedStr} · m ${fmt(view.dipole)} A·m²`,
      tint: "#a06a3f",
    };
  }
  return {
    label: `#${view.id} · Box`,
    stats: speedStr,
    tint: "#5a4f43",
  };
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 100) return n.toFixed(0);
  if (abs >= 10) return n.toFixed(1);
  if (abs >= 1) return n.toFixed(2);
  return n.toFixed(3);
}

const peekStyle: React.CSSProperties = {
  appearance: "none",
  border: "none",
  background: "#eae2d5",
  color: "#2a2520",
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "calc(100% - 24px)",
  margin: "0 12px 8px",
  padding: "10px 14px",
  height: 44,
  borderRadius: 22,
  boxShadow: "0 4px 14px rgba(42,37,32,0.14)",
  fontSize: 13,
  fontFamily: 'inherit',
  textAlign: "left",
  cursor: "pointer",
  transition: "opacity 160ms ease-out",
};

const dotStyle = (color: string): React.CSSProperties => ({
  width: 10,
  height: 10,
  borderRadius: 5,
  background: color,
  flexShrink: 0,
});

const labelStyle: React.CSSProperties = {
  fontWeight: 500,
  whiteSpace: "nowrap",
};

const statsStyle: React.CSSProperties = {
  flex: 1,
  fontFamily: '"SF Mono", ui-monospace, Menlo, monospace',
  fontVariantNumeric: "tabular-nums",
  fontSize: 11,
  color: "#5a4f43",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const chevronStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#5a4f43",
  marginLeft: 4,
  transform: "rotate(0deg)",
};
