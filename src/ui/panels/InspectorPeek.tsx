import { useEffect, useState, type CSSProperties } from "react";
import { testIds } from "../a11y/ids";
import { useUIStore } from "../state/store";
import { useSimulationContext } from "../hooks/SimulationContext";
import type { BodyView, ConstraintView } from "../../simulation";
import { ui } from "../style/tokens";

type PeekSelection =
  | { kind: "body"; view: BodyView }
  | { kind: "constraint"; view: ConstraintView };

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
  const [target, setTarget] = useState<PeekSelection | null>(null);

  useEffect(() => {
    if (selectedId === null) {
      setTarget(null);
      return;
    }
    let cancelled = false;
    let raf = 0;
    const tick = () => {
      if (cancelled) return;
      const snap = world.snapshot();
      const body = snap.bodies.find((b) => b.id === selectedId) ?? null;
      if (body) {
        setTarget({ kind: "body", view: body });
      } else {
        const c = snap.constraints.find((co) => co.id === selectedId) ?? null;
        setTarget(c ? { kind: "constraint", view: c } : null);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [selectedId, world]);

  if (target === null) return null;

  // Drag-aware visibility: keep the peek mounted (so it can fade) but
  // make it pointer-transparent and dim while the user is dragging.
  const summary =
    target.kind === "constraint"
      ? summarizeConstraint(target.view)
      : summarizeBody(target.view);

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

function summarizeConstraint(view: ConstraintView): {
  label: string;
  stats: string;
  tint: string;
} {
  const kind =
    view.kind === "rope"
      ? "Rope"
      : view.kind === "spring"
        ? "Spring"
        : view.kind === "hinge"
          ? "Hinge"
          : "Pulley";

  let stats = "";
  if (view.kind === "rope") {
    stats = `L ${fmt(view.nominalLength)} m · ${view.segmentLinks} seg`;
  } else if (view.kind === "spring") {
    stats = `${fmt(view.frequencyHz)} Hz · L₀ ${fmt(view.restLength)} m`;
  } else if (view.kind === "pulley") {
    stats = `ratio ${fmt(view.ratio)} · spread ${fmt(view.halfSpread)}`;
  } else {
    stats = `${fmt(view.anchor.x)}, ${fmt(view.anchor.y)}`;
  }

  return {
    label: `#${view.id} · ${kind}`,
    stats,
    tint: ui.fieldB,
  };
}

function summarizeBody(view: BodyView): {
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
        tint: view.charge > 0 ? ui.chargePos : ui.chargeNeg,
      };
    }
    return {
      label: `#${view.id} · Ball`,
      stats: speedStr,
      tint: ui.inkMuted,
    };
  }
  if (view.kind === "balloon") {
    return {
      label: `#${view.id} · Balloon`,
      stats: `${speedStr} · lift ${fmt(view.buoyancyLift)} N`,
      tint: ui.fieldB,
    };
  }
  if (view.kind === "magnet") {
    return {
      label: `#${view.id} · Magnet ${view.dipole >= 0 ? "N" : "S"}`,
      stats: `${speedStr} · m ${fmt(view.dipole)} A·m²`,
      tint: ui.fieldB,
    };
  }
  if (view.kind === "engine_rotor") {
    return {
      label: `#${view.id} · Rotor`,
      stats: `${speedStr} · τ ${fmt(view.torque)} N·m · ω ${fmt(view.angularVelocity)}`,
      tint: ui.fieldB,
    };
  }
  if (view.kind === "engine") {
    return {
      label: `#${view.id} · Engine ${view.torque >= 0 ? "CCW" : "CW"}`,
      stats: `${speedStr} · τ ${fmt(view.torque)} N·m`,
      tint: ui.fieldB,
    };
  }
  return {
    label: `#${view.id} · Box`,
    stats: speedStr,
    tint: ui.inkMuted,
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

const peekStyle: CSSProperties = {
  appearance: "none",
  border: "none",
  background: ui.paperShade,
  color: ui.inkPrimary,
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
  fontFamily: "inherit",
  textAlign: "left",
  cursor: "pointer",
  transition: "opacity 160ms ease-out",
};

const dotStyle = (color: string): CSSProperties => ({
  width: 10,
  height: 10,
  borderRadius: 5,
  background: color,
  flexShrink: 0,
});

const labelStyle: CSSProperties = {
  fontWeight: 500,
  whiteSpace: "nowrap",
};

const statsStyle: CSSProperties = {
  flex: 1,
  fontFamily: '"SF Mono", ui-monospace, Menlo, monospace',
  fontVariantNumeric: "tabular-nums",
  fontSize: 11,
  color: ui.inkMuted,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const chevronStyle: CSSProperties = {
  fontSize: 12,
  color: ui.inkMuted,
  marginLeft: 4,
  transform: "rotate(0deg)",
};
