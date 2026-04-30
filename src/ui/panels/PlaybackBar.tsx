import { testIds } from "../a11y/ids";
import { useUIStore } from "../state/store";

export interface PlaybackBarProps {
  readonly tick: number;
  readonly onPlay: () => void;
  readonly onPause: () => void;
  readonly onStep: () => void;
  readonly onReset: () => void;
}

export function PlaybackBar(props: PlaybackBarProps) {
  const running = useUIStore((s) => s.running);

  return (
    <footer
      data-testid={testIds.playbackBar}
      aria-label="Playback"
      style={barStyle}
    >
      <div style={leftGroup}>
        {running ? (
          <PlaybackButton
            label="Pause"
            testId={testIds.buttonPause}
            onClick={props.onPause}
          />
        ) : (
          <PlaybackButton
            label="Play"
            testId={testIds.buttonPlay}
            onClick={props.onPlay}
            primary
          />
        )}
        <PlaybackButton
          label="Step"
          testId={testIds.buttonStep}
          onClick={props.onStep}
          disabled={running}
        />
        <PlaybackButton
          label="Reset"
          testId={testIds.buttonReset}
          onClick={props.onReset}
        />
      </div>

      <div
        aria-live="polite"
        data-testid={testIds.tickCounter}
        style={tickStyle}
      >
        tick {props.tick}
      </div>
    </footer>
  );
}

function PlaybackButton(props: {
  label: string;
  testId: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      data-testid={props.testId}
      aria-label={props.label}
      onClick={props.disabled ? undefined : props.onClick}
      disabled={props.disabled}
      style={{
        ...buttonStyle,
        ...(props.primary ? buttonPrimaryStyle : {}),
        ...(props.disabled ? buttonDisabledStyle : {}),
      }}
    >
      {props.label}
    </button>
  );
}

const barStyle: React.CSSProperties = {
  height: 48,
  padding: "0 16px",
  background: "#eae2d5",
  borderTop: "1px solid #d8cfbe",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  fontSize: 13,
  color: "#2a2520",
};

const leftGroup: React.CSSProperties = {
  display: "flex",
  gap: 6,
  alignItems: "center",
};

const buttonStyle: React.CSSProperties = {
  appearance: "none",
  border: "1px solid #d8cfbe",
  background: "#f5efe6",
  color: "#2a2520",
  padding: "6px 14px",
  borderRadius: 4,
  font: "inherit",
  cursor: "pointer",
  transition: "background 160ms ease-out, border-color 160ms ease-out",
};

const buttonPrimaryStyle: React.CSSProperties = {
  background: "#2a2520",
  color: "#f5efe6",
  borderColor: "#2a2520",
};

const buttonDisabledStyle: React.CSSProperties = {
  opacity: 0.4,
  cursor: "not-allowed",
};

const tickStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#5a4f43",
  opacity: 0.85,
};
