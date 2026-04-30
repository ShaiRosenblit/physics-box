import { sceneIds, type SceneName } from "../../simulation";
import { testIds } from "../a11y/ids";
import {
  PauseIcon,
  PlayIcon,
  ResetIcon,
  StepIcon,
} from "../icons";
import { useUIStore } from "../state/store";

const SCENE_LABEL: Record<SceneName, string> = {
  empty: "Empty",
  welcome: "Welcome",
  engines: "Engines demo",
  galton: "Galton board",
  random: "Random",
};

const SPEED_SLIDER_STEP = 1 / 64;

function speedLabel(multiplier: number): string {
  const s = multiplier.toFixed(3);
  return String(parseFloat(s));
}

export interface PlaybackBarProps {
  readonly tick: number;
  readonly compact: boolean;
  readonly scene: SceneName;
  readonly gravityEnabled: boolean;
  readonly airDensity: number;
  readonly maxAirDensity: number;
  /** Simulation integration rate multiplier (same units as `SimulationConfig.timeScale`). */
  readonly timeScale: number;
  readonly timeScaleMin: number;
  readonly timeScaleMax: number;
  readonly onSceneChange: (scene: SceneName) => void;
  readonly onGravityChange: (enabled: boolean) => void;
  readonly onAirDensityChange: (density: number) => void;
  readonly onTimeScaleChange: (multiplier: number) => void;
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
        <select
          data-testid={testIds.sceneSelect}
          aria-label="Scene"
          title="Scene"
          value={props.scene}
          onChange={(e) => props.onSceneChange(e.target.value as SceneName)}
          style={{
            ...sceneSelectStyle,
            ...(props.compact ? sceneSelectCompactStyle : {}),
          }}
        >
          {sceneIds.map((id) => (
            <option key={id} value={id}>
              {SCENE_LABEL[id]}
            </option>
          ))}
        </select>
        <label style={{ ...gravityToggleStyle, ...(props.compact ? gravityToggleCompactStyle : {}) }}>
          <input
            type="checkbox"
            data-testid={testIds.toggleGravity}
            checked={props.gravityEnabled}
            onChange={(e) => props.onGravityChange(e.target.checked)}
            aria-label="Gravity"
            title="Gravity"
            style={gravityCheckboxStyle}
          />
          {!props.compact && <span>Gravity</span>}
        </label>
        <label
          style={{
            ...gravityToggleStyle,
            ...(props.compact ? gravityToggleCompactStyle : {}),
            gap: 8,
          }}
        >
          <span style={{ fontSize: 10, opacity: 0.85, whiteSpace: "nowrap" }}>
            {!props.compact ? "Air" : ""} ρ
          </span>
          <input
            type="range"
            data-testid={testIds.airDensity}
            aria-label="Ambient fluid density"
            title="Ambient fluid density (Archimedes)"
            min={0}
            max={props.maxAirDensity}
            step={0.02}
            value={Math.min(props.airDensity, props.maxAirDensity)}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (Number.isFinite(v)) props.onAirDensityChange(v);
            }}
            style={{
              width: props.compact ? 72 : 100,
              accentColor: "#2a2520",
            }}
          />
        </label>
        <label
          style={{
            ...gravityToggleStyle,
            ...(props.compact ? gravityToggleCompactStyle : {}),
            gap: 8,
          }}
        >
          <span style={{ fontSize: 10, opacity: 0.85, whiteSpace: "nowrap" }}>
            {!props.compact ? `Speed ×${speedLabel(props.timeScale)}` : "×"}
          </span>
          <input
            type="range"
            data-testid={testIds.playbackSpeed}
            aria-label="Simulation speed"
            title="Simulation speed (integration time scale)"
            min={props.timeScaleMin}
            max={props.timeScaleMax}
            step={SPEED_SLIDER_STEP}
            value={Math.min(
              props.timeScaleMax,
              Math.max(props.timeScaleMin, props.timeScale),
            )}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (Number.isFinite(v)) props.onTimeScaleChange(v);
            }}
            style={{
              width: props.compact ? 72 : 100,
              accentColor: "#2a2520",
            }}
          />
        </label>
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

const sceneSelectStyle: React.CSSProperties = {
  appearance: "none",
  border: "1px solid #d8cfbe",
  background: "#f5efe6",
  color: "#2a2520",
  padding: "3px 8px",
  borderRadius: 3,
  font: "inherit",
  fontSize: 12,
  cursor: "pointer",
  minWidth: 108,
  transition: "background 160ms ease-out, border-color 160ms ease-out",
};

const sceneSelectCompactStyle: React.CSSProperties = {
  minWidth: 92,
  padding: "6px 8px",
  borderRadius: 4,
};

const gravityToggleStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  cursor: "pointer",
  userSelect: "none",
  fontSize: 12,
  color: "#2a2520",
};

const gravityToggleCompactStyle: React.CSSProperties = {
  padding: "4px 0",
};

const gravityCheckboxStyle: React.CSSProperties = {
  width: 14,
  height: 14,
  accentColor: "#2a2520",
  cursor: "pointer",
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
