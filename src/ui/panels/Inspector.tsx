import { useEffect, useState } from "react";
import { testIds } from "../a11y/ids";
import { useUIStore } from "../state/store";
import { useSimulationContext } from "../hooks/SimulationContext";
import type { BodyView } from "../../simulation";
import type { ViewportMode } from "../hooks/useViewportMode";

export interface InspectorProps {
  variant: "panel" | "rail" | "sheet";
}

export function Inspector({ variant }: InspectorProps) {
  const selectedId = useUIStore((s) => s.selectedId);
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

  if (variant === "rail") {
    return (
      <aside
        data-testid={testIds.inspector}
        aria-label="Inspector"
        style={railStyle}
      >
        <div style={railEyebrowStyle}>Body</div>
        {view ? (
          <div style={railValueStyle} title={`Body #${view.id}`}>
            #{view.id}
          </div>
        ) : (
          <div style={{ ...railValueStyle, opacity: 0.5 }} aria-hidden="true">
            —
          </div>
        )}
      </aside>
    );
  }

  const isSheet = variant === "sheet";
  return (
    <aside
      data-testid={testIds.inspector}
      aria-label="Inspector"
      style={isSheet ? sheetStyle : panelStyle}
    >
      <div style={headerRowStyle}>
        <div style={eyebrowStyle}>Inspector</div>
        {isSheet && (
          <button
            type="button"
            aria-label="Dismiss inspector"
            onClick={() => setInspectorOpen(false)}
            style={dismissStyle}
          >
            ×
          </button>
        )}
      </div>
      {view === null ? (
        <div style={emptyStateStyle}>No body selected</div>
      ) : (
        <BodyDetails view={view} />
      )}
    </aside>
  );
}

function BodyDetails({ view }: { view: BodyView }) {
  const speed = Math.hypot(view.velocity.x, view.velocity.y);
  return (
    <div style={detailsStyle}>
      <Row label="Body" value={`#${view.id} · ${labelOf(view.kind)}`} />
      <Row label="Material" value={titleCase(view.material)} />
      <Row
        label="Position"
        value={`${fmt(view.position.x)}, ${fmt(view.position.y)} m`}
      />
      <Row label="Speed" value={`${fmt(speed)} m/s`} />
      <Row label="Angle" value={`${fmt((view.angle * 180) / Math.PI)}°`} />
      {view.charge !== 0 && (
        <Row label="Charge" value={`${fmt(view.charge)} C`} accent="charge" />
      )}
      {view.kind === "magnet" && (
        <Row label="Dipole" value={`${fmt(view.dipole)} A·m²`} accent="magnet" />
      )}
      {view.kind === "ball" && <Row label="Radius" value={`${fmt(view.radius)} m`} />}
      {view.kind === "box" && (
        <Row label="Size" value={`${fmt(view.width)} × ${fmt(view.height)} m`} />
      )}
      {view.kind === "magnet" && <Row label="Radius" value={`${fmt(view.radius)} m`} />}
    </div>
  );
}

function Row(props: {
  label: string;
  value: string;
  accent?: "charge" | "magnet";
}) {
  const colorByAccent = props.accent === "charge"
    ? "#9c4a3a"
    : props.accent === "magnet"
    ? "#a06a3f"
    : "#2a2520";
  return (
    <div style={rowStyle}>
      <span style={rowLabelStyle}>{props.label}</span>
      <span
        style={{
          ...rowValueStyle,
          color: colorByAccent,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {props.value}
      </span>
    </div>
  );
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 100) return n.toFixed(0);
  if (abs >= 10) return n.toFixed(1);
  if (abs >= 1) return n.toFixed(2);
  return n.toFixed(3);
}

function labelOf(kind: BodyView["kind"]): string {
  switch (kind) {
    case "ball":
      return "Ball";
    case "box":
      return "Box";
    case "magnet":
      return "Magnet";
  }
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const panelStyle: React.CSSProperties = {
  width: 220,
  padding: "12px 12px",
  background: "#eae2d5",
  borderLeft: "1px solid #d8cfbe",
  display: "flex",
  flexDirection: "column",
  gap: 8,
  fontSize: 12,
  lineHeight: 1.3,
  color: "#2a2520",
  flexShrink: 0,
  overflowY: "auto",
};

const sheetStyle: React.CSSProperties = {
  width: "100%",
  padding: "16px 14px calc(16px + env(safe-area-inset-bottom))",
  background: "#eae2d5",
  display: "flex",
  flexDirection: "column",
  gap: 12,
  fontSize: 14,
  lineHeight: 1.35,
  color: "#2a2520",
  height: "100%",
  overflowY: "auto",
};

const railStyle: React.CSSProperties = {
  width: 44,
  padding: "10px 4px",
  background: "#eae2d5",
  borderLeft: "1px solid #d8cfbe",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
  color: "#2a2520",
  flexShrink: 0,
};

const railEyebrowStyle: React.CSSProperties = {
  fontSize: 8.5,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#5a4f43",
};

const railValueStyle: React.CSSProperties = {
  fontFamily: '"SF Mono", ui-monospace, Menlo, monospace',
  fontSize: 11,
  fontVariantNumeric: "tabular-nums",
};

const headerRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const dismissStyle: React.CSSProperties = {
  appearance: "none",
  border: "none",
  background: "transparent",
  color: "#5a4f43",
  fontSize: 22,
  lineHeight: 1,
  cursor: "pointer",
  padding: 4,
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#5a4f43",
  fontWeight: 500,
};

const emptyStateStyle: React.CSSProperties = {
  color: "#5a4f43",
  fontStyle: "italic",
  paddingTop: 8,
};

const detailsStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  paddingTop: 4,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  borderBottom: "1px dashed #d8cfbe",
  paddingBottom: 4,
};

const rowLabelStyle: React.CSSProperties = {
  fontSize: 9.5,
  color: "#5a4f43",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const rowValueStyle: React.CSSProperties = {
  fontSize: 11,
  fontFamily: '"SF Mono", ui-monospace, Menlo, monospace',
};

export function inspectorVariantFor(mode: ViewportMode): "panel" | "sheet" {
  if (mode === "desktop") return "panel";
  // Tablet shares the phone pattern: floating peek + drawer. The rail
  // mostly showed "BODY —" and stole canvas width without earning it.
  return "sheet";
}
