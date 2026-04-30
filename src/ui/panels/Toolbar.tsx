import type { ComponentType, SVGProps } from "react";
import { bodyToolThumbSrc } from "../assets/tools/thumbs";
import { testIds } from "../a11y/ids";
import {
  BallIcon,
  BalloonIcon,
  BFieldIcon,
  BoxIcon,
  ChargeMinusIcon,
  ChargePlusIcon,
  EFieldIcon,
  GridIcon,
  HingeIcon,
  MagnetNIcon,
  MagnetSIcon,
  PulleyIcon,
  RopeIcon,
  SelectIcon,
  SpringIcon,
} from "../icons";
import { useUIStore, type Tool } from "../state/store";
import type { ViewportMode } from "../hooks/useViewportMode";
import { ToolGlyph } from "./ToolGlyph";

type IconC = ComponentType<SVGProps<SVGSVGElement>>;

interface ToolDef {
  readonly id: Tool;
  readonly label: string;
  readonly icon: IconC;
}

const bodyTools: readonly ToolDef[] = [
  { id: "ball", label: "Ball", icon: BallIcon },
  { id: "balloon", label: "Balloon", icon: BalloonIcon },
  { id: "box", label: "Box", icon: BoxIcon },
  { id: "ball+", label: "Ball (+)", icon: ChargePlusIcon },
  { id: "ball-", label: "Ball (−)", icon: ChargeMinusIcon },
  { id: "magnet+", label: "Magnet N", icon: MagnetNIcon },
  { id: "magnet-", label: "Magnet S", icon: MagnetSIcon },
];

const connectorTools: readonly ToolDef[] = [
  { id: "rope", label: "Rope", icon: RopeIcon },
  { id: "hinge", label: "Hinge", icon: HingeIcon },
  { id: "spring", label: "Spring", icon: SpringIcon },
  { id: "pulley", label: "Pulley", icon: PulleyIcon },
];

const selectTool: ToolDef = { id: "select", label: "Select", icon: SelectIcon };

export interface ToolbarProps {
  /** Layout variant; "panel" = full sidebar, "rail" = icon column, "sheet" = phone drawer body. */
  variant: "panel" | "rail" | "sheet";
}

export function Toolbar({ variant }: ToolbarProps) {
  const tool = useUIStore((s) => s.tool);
  const setTool = useUIStore((s) => s.setTool);
  const showGrid = useUIStore((s) => s.showGrid);
  const showEField = useUIStore((s) => s.showEField);
  const showBField = useUIStore((s) => s.showBField);
  const hasCharges = useUIStore((s) => s.hasCharges);
  const hasMagnets = useUIStore((s) => s.hasMagnets);
  const toggleGrid = useUIStore((s) => s.toggleGrid);
  const toggleEField = useUIStore((s) => s.toggleEField);
  const toggleBField = useUIStore((s) => s.toggleBField);
  const setToolsOpen = useUIStore((s) => s.setToolsOpen);

  const choose = (id: Tool) => {
    setTool(id);
    if (variant === "sheet") setToolsOpen(false);
  };

  if (variant === "rail") {
    const renderRailGroup = (items: readonly ToolDef[]) => (
      <div style={railGroupStyle}>
        {items.map((t) => (
          <RailButton
            key={t.id}
            label={t.label}
            testId={`${testIds.toolButtonPrefix}${t.id}`}
            active={tool === t.id}
            icon={t.icon}
            thumbSrc={bodyToolThumbSrc[t.id]}
            onClick={() => choose(t.id)}
          />
        ))}
      </div>
    );
    return (
      <aside
        data-testid={testIds.toolbar}
        aria-label="Tools"
        style={railStyle}
      >
        {renderRailGroup([selectTool])}
        <div style={railSeparatorStyle} />
        {renderRailGroup(bodyTools)}
        <div style={railSeparatorStyle} />
        {renderRailGroup(connectorTools)}
        <div style={railSeparatorStyle} />
        <div style={railGroupStyle}>
          <RailToggle
            label="Grid"
            testId={testIds.toggleGrid}
            pressed={showGrid}
            icon={GridIcon}
            onClick={toggleGrid}
          />
          <RailToggle
            label="E field"
            testId={testIds.toggleEField}
            pressed={showEField && hasCharges}
            icon={EFieldIcon}
            onClick={toggleEField}
            disabled={!hasCharges}
          />
          <RailToggle
            label="B field"
            testId={testIds.toggleBField}
            pressed={showBField && hasMagnets}
            icon={BFieldIcon}
            onClick={toggleBField}
            disabled={!hasMagnets}
          />
        </div>
      </aside>
    );
  }

  // panel + sheet share full-label rendering; sheet is wider for thumb reach.
  const isSheet = variant === "sheet";
  return (
    <aside
      data-testid={testIds.toolbar}
      aria-label="Tools"
      style={isSheet ? sheetStyle : panelStyle}
    >
      <Section label="Tools">
        <FullToolButton
          testId={`${testIds.toolButtonPrefix}select`}
          label="Select"
          icon={SelectIcon}
          active={tool === "select"}
          onClick={() => choose("select")}
        />
      </Section>

      <Section label="Bodies">
        {/* Single-column list keeps full labels readable at panel widths
            and on narrow phone sheets without truncating to "Bal" / "Mag". */}
        {bodyTools.map((t) => (
          <FullToolButton
            key={t.id}
            label={t.label}
            testId={`${testIds.toolButtonPrefix}${t.id}`}
            active={tool === t.id}
            icon={t.icon}
            thumbSrc={bodyToolThumbSrc[t.id]}
            onClick={() => choose(t.id)}
          />
        ))}
      </Section>

      <Section label="Connectors">
        {connectorTools.map((t) => (
          <FullToolButton
            key={t.id}
            label={t.label}
            testId={`${testIds.toolButtonPrefix}${t.id}`}
            active={tool === t.id}
            icon={t.icon}
            onClick={() => choose(t.id)}
          />
        ))}
      </Section>

      <Section label="View">
        <FullToggleButton
          label="Grid"
          testId={testIds.toggleGrid}
          icon={GridIcon}
          pressed={showGrid}
          onClick={toggleGrid}
        />
        <FullToggleButton
          label="E field"
          testId={testIds.toggleEField}
          icon={EFieldIcon}
          pressed={showEField && hasCharges}
          onClick={toggleEField}
          disabled={!hasCharges}
          disabledReason="No charges in scene"
        />
        <FullToggleButton
          label="B field"
          testId={testIds.toggleBField}
          icon={BFieldIcon}
          pressed={showBField && hasMagnets}
          onClick={toggleBField}
          disabled={!hasMagnets}
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

function FullToolButton(props: {
  label: string;
  testId: string;
  active: boolean;
  icon: IconC;
  thumbSrc?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={props.testId}
      aria-label={props.label}
      aria-pressed={props.active}
      onClick={props.onClick}
      style={{
        ...buttonStyle,
        ...(props.active ? buttonActiveStyle : {}),
      }}
    >
      <span style={iconWrapStyle} aria-hidden="true">
        <ToolGlyph icon={props.icon} thumbSrc={props.thumbSrc} />
      </span>
      <span style={labelTextStyle}>{props.label}</span>
    </button>
  );
}

function FullToggleButton(props: {
  label: string;
  testId: string;
  pressed: boolean;
  icon: IconC;
  onClick: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const Icon = props.icon;
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
      <span style={iconWrapStyle} aria-hidden="true">
        <Icon />
      </span>
      <span style={labelTextStyle}>{props.label}</span>
    </button>
  );
}

function RailButton(props: {
  label: string;
  testId: string;
  active: boolean;
  icon: IconC;
  thumbSrc?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={props.testId}
      aria-label={props.label}
      aria-pressed={props.active}
      title={props.label}
      onClick={props.onClick}
      style={{
        ...railButtonStyle,
        ...(props.active ? buttonActiveStyle : {}),
      }}
    >
      <ToolGlyph icon={props.icon} thumbSrc={props.thumbSrc} />
    </button>
  );
}

function RailToggle(props: {
  label: string;
  testId: string;
  pressed: boolean;
  icon: IconC;
  onClick: () => void;
  disabled?: boolean;
}) {
  const Icon = props.icon;
  return (
    <button
      type="button"
      data-testid={props.testId}
      aria-label={props.label}
      aria-pressed={props.pressed}
      aria-disabled={props.disabled ? true : undefined}
      title={props.label}
      onClick={props.disabled ? undefined : props.onClick}
      style={{
        ...railButtonStyle,
        ...(props.pressed && !props.disabled ? buttonActiveStyle : {}),
        ...(props.disabled ? buttonDisabledStyle : {}),
      }}
    >
      <Icon />
    </button>
  );
}

const panelStyle: React.CSSProperties = {
  width: 168,
  padding: "12px 10px",
  background: "#eae2d5",
  borderRight: "1px solid #d8cfbe",
  display: "flex",
  flexDirection: "column",
  gap: 14,
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
  gap: 18,
  fontSize: 14,
  lineHeight: 1.3,
  color: "#2a2520",
  height: "100%",
  overflowY: "auto",
};

const railStyle: React.CSSProperties = {
  width: 44,
  padding: "8px 4px",
  background: "#eae2d5",
  borderRight: "1px solid #d8cfbe",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  color: "#2a2520",
  flexShrink: 0,
};

const railGroupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const railSeparatorStyle: React.CSSProperties = {
  width: 22,
  height: 1,
  background: "#d8cfbe",
  margin: "4px 0",
};

const sectionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: "0.14em",
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
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 8,
  textAlign: "left",
  transition: "background 160ms ease-out, border-color 160ms ease-out",
};

const labelTextStyle: React.CSSProperties = {
  flex: 1,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const iconWrapStyle: React.CSSProperties = {
  display: "inline-flex",
  width: 16,
  height: 16,
  flexShrink: 0,
};

const railButtonStyle: React.CSSProperties = {
  appearance: "none",
  border: "1px solid transparent",
  background: "transparent",
  color: "#2a2520",
  width: 36,
  height: 36,
  borderRadius: 6,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
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

// Suppress unused warning when only "panel" is rendered.
export type _ToolbarVariant = ToolbarProps["variant"];

// Helper to access viewport mode → variant from outside.
export function toolbarVariantFor(mode: ViewportMode): "panel" | "rail" | "sheet" {
  if (mode === "desktop") return "panel";
  if (mode === "tablet") return "rail";
  return "sheet";
}
