import { testIds } from "../a11y/ids";
import { useUIStore } from "../state/store";

export function Inspector() {
  const selectedId = useUIStore((s) => s.selectedId);

  return (
    <aside
      data-testid={testIds.inspector}
      aria-label="Inspector"
      style={panelStyle}
    >
      <div style={eyebrowStyle}>Inspector</div>
      {selectedId === null ? (
        <div style={emptyStateStyle}>No body selected</div>
      ) : (
        <div style={emptyStateStyle}>Body #{selectedId}</div>
      )}
    </aside>
  );
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
