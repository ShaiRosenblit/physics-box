import type { GameMode } from "../types";

export interface ModeToggleProps {
  readonly mode: GameMode;
  readonly onChange: (next: GameMode) => void;
  readonly compact?: boolean;
}

export function ModeToggle({ mode, onChange, compact }: ModeToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Mode"
      data-testid="mode-toggle"
      style={{ ...wrapStyle, ...(compact ? compactWrapStyle : {}) }}
    >
      <ToggleButton
        label="Sandbox"
        testId="mode-sandbox"
        active={mode === "sandbox"}
        onClick={() => onChange("sandbox")}
        compact={compact}
      />
      <ToggleButton
        label="Puzzle"
        testId="mode-puzzle"
        active={mode === "puzzle"}
        onClick={() => onChange("puzzle")}
        compact={compact}
      />
    </div>
  );
}

function ToggleButton(props: {
  label: string;
  testId: string;
  active: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={props.active}
      data-testid={props.testId}
      onClick={props.onClick}
      style={{
        ...btnStyle,
        ...(props.compact ? compactBtnStyle : {}),
        ...(props.active ? activeBtnStyle : {}),
      }}
    >
      {props.label}
    </button>
  );
}

const wrapStyle: React.CSSProperties = {
  display: "inline-flex",
  padding: 2,
  borderRadius: 999,
  background: "#eae2d5",
  border: "1px solid #d8cfbe",
};

const compactWrapStyle: React.CSSProperties = {
  padding: 2,
};

const btnStyle: React.CSSProperties = {
  appearance: "none",
  border: "1px solid transparent",
  background: "transparent",
  color: "#5a4f43",
  padding: "3px 12px",
  borderRadius: 999,
  font: "inherit",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  letterSpacing: "0.02em",
};

const compactBtnStyle: React.CSSProperties = {
  padding: "6px 10px",
};

const activeBtnStyle: React.CSSProperties = {
  background: "#f5efe6",
  color: "#2a2520",
  borderColor: "#d8cfbe",
  boxShadow: "0 1px 4px rgba(42,37,32,0.10)",
};
