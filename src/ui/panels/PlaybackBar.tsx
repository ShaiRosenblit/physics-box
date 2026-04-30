import { testIds } from "../a11y/ids";
import {
  PauseIcon,
  PlayIcon,
  ResetIcon,
  StepIcon,
} from "../icons";
import { useUIStore } from "../state/store";

export interface PlaybackBarProps {
  readonly tick: number;
  readonly compact: boolean;
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
      style={{ ...barStyle, ...(props.compact ? compactBarStyle : {}) }}
    >
      <div style={{ ...controlsStyle, ...(props.compact ? compactControlsStyle : {}) }}>
        {running ? (
          <PlaybackButton
            label="Pause"
            testId={testIds.buttonPause}
            onClick={props.onPause}
            icon={<PauseIcon />}
            compact={props.compact}
          />
        ) : (
          <PlaybackButton
            label="Play"
            testId={testIds.buttonPlay}
            onClick={props.onPlay}
            primary
            icon={<PlayIcon />}
            compact={props.compact}
          />
        )}
        <PlaybackButton
          label="Step"
          testId={testIds.buttonStep}
          onClick={props.onStep}
          disabled={running}
          icon={<StepIcon />}
          compact={props.compact}
        />
        <PlaybackButton
          label="Reset"
          testId={testIds.buttonReset}
          onClick={props.onReset}
          icon={<ResetIcon />}
          compact={props.compact}
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
  icon: React.ReactNode;
  primary?: boolean;
  disabled?: boolean;
  compact?: boolean;
}) {
  const showLabel = !props.compact;
  return (
    <button
      type="button"
      data-testid={props.testId}
      aria-label={props.label}
      title={props.label}
      onClick={props.disabled ? undefined : props.onClick}
      disabled={props.disabled}
      style={{
        ...buttonStyle,
        ...(props.compact ? compactButtonStyle : {}),
        ...(props.primary ? buttonPrimaryStyle : {}),
        ...(props.disabled ? buttonDisabledStyle : {}),
      }}
    >
      <span style={iconWrapStyle} aria-hidden="true">
        {props.icon}
      </span>
      {showLabel && <span>{props.label}</span>}
    </button>
  );
}

const barStyle: React.CSSProperties = {
  height: 36,
  padding: "0 12px",
  background: "#eae2d5",
  borderTop: "1px solid #d8cfbe",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  fontSize: 12,
  color: "#2a2520",
  flexShrink: 0,
};

const compactBarStyle: React.CSSProperties = {
  height: 56,
  padding: "0 12px calc(env(safe-area-inset-bottom))",
};

const controlsStyle: React.CSSProperties = {
  display: "flex",
  gap: 4,
  alignItems: "center",
};

const compactControlsStyle: React.CSSProperties = {
  gap: 8,
};

const buttonStyle: React.CSSProperties = {
  appearance: "none",
  border: "1px solid #d8cfbe",
  background: "#f5efe6",
  color: "#2a2520",
  padding: "3px 10px",
  borderRadius: 3,
  font: "inherit",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  transition: "background 160ms ease-out, border-color 160ms ease-out",
};

const compactButtonStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  padding: 0,
  borderRadius: 22,
  justifyContent: "center",
  gap: 0,
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
  fontSize: 10,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#5a4f43",
  opacity: 0.85,
  fontVariantNumeric: "tabular-nums",
};

const iconWrapStyle: React.CSSProperties = {
  display: "inline-flex",
  width: 16,
  height: 16,
};
