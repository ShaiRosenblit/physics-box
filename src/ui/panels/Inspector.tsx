import { useEffect, useState } from "react";
import { testIds } from "../a11y/ids";
import { useUIStore } from "../state/store";
import { useSimulationContext } from "../hooks/SimulationContext";
import type { BodyView } from "../../simulation";

export function Inspector() {
  const selectedId = useUIStore((s) => s.selectedId);
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

  return (
    <aside
      data-testid={testIds.inspector}
      aria-label="Inspector"
      style={panelStyle}
    >
      <div style={eyebrowStyle}>Inspector</div>
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
  width: 232,
  padding: 16,
  background: "#eae2d5",
  borderLeft: "1px solid #d8cfbe",
  display: "flex",
  flexDirection: "column",
  gap: 12,
  fontSize: 13,
  color: "#2a2520",
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#5a4f43",
  fontWeight: 500,
};

const emptyStateStyle: React.CSSProperties = {
  color: "#5a4f43",
  fontSize: 12,
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
  fontSize: 11,
  color: "#5a4f43",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const rowValueStyle: React.CSSProperties = {
  fontSize: 12,
  fontFamily: '"SF Mono", ui-monospace, Menlo, monospace',
};
