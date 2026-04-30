import { testIds } from "../a11y/ids";
import { useUIStore, type Tool } from "../state/store";

interface ToolDef {
  readonly id: Tool;
  readonly label: string;
}

const tools: readonly ToolDef[] = [
  { id: "select", label: "Select" },
  { id: "ball", label: "Ball" },
  { id: "box", label: "Box" },
];

export function Toolbar() {
  const tool = useUIStore((s) => s.tool);
  const setTool = useUIStore((s) => s.setTool);
  const showGrid = useUIStore((s) => s.showGrid);
  const showEField = useUIStore((s) => s.showEField);
  const showBField = useUIStore((s) => s.showBField);
  const toggleGrid = useUIStore((s) => s.toggleGrid);
  const toggleEField = useUIStore((s) => s.toggleEField);
  const toggleBField = useUIStore((s) => s.toggleBField);

  return (
    <aside
      data-testid={testIds.toolbar}
      aria-label="Tools"
      style={panelStyle}
    >
      <Section label="Tools">
        {tools.map((t) => (
          <ToolbarButton
            key={t.id}
            label={t.label}
            testId={`${testIds.toolButtonPrefix}${t.id}`}
            active={tool === t.id}
            onClick={() => setTool(t.id)}
          />
        ))}
      </Section>

      <Section label="View">
        <ToggleButton
          label="Grid"
          testId={testIds.toggleGrid}
          pressed={showGrid}
          onClick={toggleGrid}
        />
        <ToggleButton
          label="E field"
          testId={testIds.toggleEField}
          pressed={showEField}
          onClick={toggleEField}
          disabled
          disabledReason="No charges in scene"
        />
        <ToggleButton
          label="B field"
          testId={testIds.toggleBField}
          pressed={showBField}
          onClick={toggleBField}
          disabled
          disabledReason="No magnets in scene"
        />
      </Section>
    </aside>
  );
}

function Section(props: { label: string; children: React.ReactNode }) {
  return (
    <div style={sectionStyle}>
      <div style={eyebrowStyle}>{props.label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {props.children}
      </div>
    </div>
  );
}

function ToolbarButton(props: {
  label: string;
  testId: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={props.testId}
      aria-label={props.label}
      aria-pressed={props.active}
      onClick={props.onClick}
      style={{ ...buttonStyle, ...(props.active ? buttonActiveStyle : {}) }}
    >
      {props.label}
    </button>
  );
}

function ToggleButton(props: {
  label: string;
  testId: string;
  pressed: boolean;
  onClick: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  return (
    <button
      type="button"
      data-testid={props.testId}
      aria-label={props.label}
      aria-pressed={props.pressed}
      aria-disabled={props.disabled ? true : undefined}
      title={props.disabled ? props.disabledReason : undefined}
      onClick={props.disabled ? undefined : props.onClick}
      style={{
        ...buttonStyle,
        ...(props.pressed && !props.disabled ? buttonActiveStyle : {}),
        ...(props.disabled ? buttonDisabledStyle : {}),
      }}
    >
      {props.label}
    </button>
  );
}

const panelStyle: React.CSSProperties = {
  width: 168,
  padding: 16,
  background: "#eae2d5",
  borderRight: "1px solid #d8cfbe",
  display: "flex",
  flexDirection: "column",
  gap: 24,
  fontSize: 13,
  color: "#2a2520",
};

const sectionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#5a4f43",
  fontWeight: 500,
};

const buttonStyle: React.CSSProperties = {
  appearance: "none",
  border: "1px solid #d8cfbe",
  background: "#f5efe6",
  color: "#2a2520",
  padding: "6px 10px",
  borderRadius: 4,
  font: "inherit",
  textAlign: "left",
  cursor: "pointer",
  transition: "background 160ms ease-out, border-color 160ms ease-out",
};

const buttonActiveStyle: React.CSSProperties = {
  background: "#2a2520",
  color: "#f5efe6",
  borderColor: "#2a2520",
};

const buttonDisabledStyle: React.CSSProperties = {
  opacity: 0.4,
  cursor: "not-allowed",
};
