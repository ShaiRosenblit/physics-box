import type { CSSProperties } from "react";
import type { MaterialName } from "../../simulation";
import { activeSpawnModeFromTool } from "../canvas/usePointerGestures";
import { testIds } from "../a11y/ids";
import { useSimulationContext } from "../hooks/SimulationContext";
import { useViewportMode } from "../hooks/useViewportMode";
import {
  useUIStore,
  type BalloonSpawnPreset,
  type BoxSpawnPreset,
  type ChargedBallSpawnPreset,
  type CrankSpawnPreset,
  type EngineSpawnPreset,
  type MagnetSpawnPreset,
  type NeutralBallSpawnPreset,
  type SpawnPresetKey,
  type SpawnPresetsBundle,
} from "../state/store";
import { layout, ui } from "../style/tokens";

const MATERIALS: MaterialName[] = ["wood", "metal", "cork", "felt", "latex"];

// Sizing vars — overridden on phone (see panel root). The viewport meta
// pins maximum-scale=1, so we no longer need 16px-floor inputs to stop
// iOS auto-zooming on focus; phone controls can stay compact.
const inputStyle: CSSProperties = {
  height: "var(--pb-ctrl-h, 26px)",
  minWidth: "var(--pb-ctrl-min, 56px)",
  padding: "var(--pb-ctrl-pad, 0 6px)",
  borderRadius: layout.controlRadius,
  border: `${layout.controlBorder}px solid ${ui.rule}`,
  background: ui.paper,
  color: ui.inkPrimary,
  fontSize: "var(--pb-ctrl-fs, 12px)",
  fontVariantNumeric: "tabular-nums",
};

const labelStyle: CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: ui.inkMuted,
};

const fieldStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  alignItems: "stretch",
  // Keep natural width inside the phone's horizontally-scrolling row so
  // each field doesn't squish to its minimum. No-op on desktop wrap.
  flexShrink: 0,
};

const spawnToggleLabelStyle: CSSProperties = {
  display: "flex",
  gap: 6,
  alignItems: "center",
  fontSize: 11,
  color: ui.inkPrimary,
  cursor: "pointer",
  flexShrink: 0,
  whiteSpace: "nowrap",
};

function SpawnFixedToggle(props: {
  checked: boolean;
  onChange: (fixed: boolean) => void;
}) {
  return (
    <label style={spawnToggleLabelStyle}>
      <input
        type="checkbox"
        checked={props.checked}
        aria-label="Fixed in world"
        onChange={(e) => props.onChange(e.target.checked)}
      />
      <span>Fixed (static)</span>
    </label>
  );
}

export interface SpawnToolOptionsProps {
  /** Where the panel is anchored relative to the canvas — flips the divider. */
  dock?: "top" | "bottom";
}

/** Compact controls for the active spawn tool ("recipe" before placement). */
export function SpawnToolOptions({ dock = "top" }: SpawnToolOptionsProps = {}) {
  const tool = useUIStore((s) => s.tool);
  const spawnPresets = useUIStore((s) => s.spawnPresets);
  const setSpawnPresetPartial = useUIStore((s) => s.setSpawnPresetPartial);
  const viewportMode = useViewportMode();
  const isPhone = viewportMode === "phone";

  const mode = activeSpawnModeFromTool(tool);
  const { maxCharge, maxDipole, maxBuoyancyLift, maxMotorTorque, maxRpm } =
    useSimulationContext().world.config;

  if (mode === null) return null;

  const bump = <K extends SpawnPresetKey>(
    k: K,
    partial: Partial<SpawnPresetsBundle[K]>,
  ) => {
    setSpawnPresetPartial(k, partial);
  };

  const phoneVars: CSSProperties = isPhone
    ? ({
        ["--pb-ctrl-h" as string]: "30px",
        ["--pb-ctrl-fs" as string]: "14px",
        ["--pb-ctrl-min" as string]: "60px",
        ["--pb-ctrl-pad" as string]: "0 6px",
      } as CSSProperties)
    : {};

  return (
    <div
      data-testid={testIds.spawnToolOptions}
      aria-label="Spawn options for the active tool"
      style={{
        flexShrink: 0,
        padding: isPhone
          ? "6px 10px calc(6px + env(safe-area-inset-bottom))"
          : "6px 10px",
        background: ui.paperShade,
        borderTop: dock === "bottom" ? `1px solid ${ui.rule}` : undefined,
        borderBottom: dock === "top" ? `1px solid ${ui.rule}` : undefined,
        display: "flex",
        // Phone: a single row that scrolls horizontally, so the panel
        // takes only one row's worth of canvas height. Desktop / tablet
        // keep the wrapping multi-row layout where horizontal space is
        // not the limiting factor.
        flexWrap: isPhone ? "nowrap" : "wrap",
        overflowX: isPhone ? "auto" : undefined,
        WebkitOverflowScrolling: isPhone ? "touch" : undefined,
        gap: isPhone ? "0 10px" : "8px 14px",
        alignItems: "flex-end",
        ...phoneVars,
      }}
    >
      {!isPhone && (
        <div style={{ ...labelStyle, flex: "1 0 100%", marginBottom: -4 }}>
          Next placement
        </div>
      )}
      {mode === "ball" && (
        <BallFields
          preset={spawnPresets.ball}
          onPatch={(p) => bump("ball", p)}
          showCharge={false}
          maxCharge={maxCharge}
        />
      )}
      {mode === "ball+" && (
        <BallFields
          preset={spawnPresets.ballPlus}
          onPatch={(p) => bump("ballPlus", p)}
          showCharge
          maxCharge={maxCharge}
          chargeLabel="Charge (+)"
        />
      )}
      {mode === "ball-" && (
        <BallFields
          preset={spawnPresets.ballMinus}
          onPatch={(p) => bump("ballMinus", p)}
          showCharge
          maxCharge={maxCharge}
          chargeLabel="Charge (−)"
        />
      )}
      {(mode === "magnet+" || mode === "magnet-") && (
        <MagnetFields
          preset={
            mode === "magnet+" ?
              spawnPresets.magnetPlus
            : spawnPresets.magnetMinus
          }
          onPatch={(p) =>
            bump(mode === "magnet+" ? "magnetPlus" : "magnetMinus", p)
          }
          maxDipole={maxDipole}
          polarityLabel={mode === "magnet+" ? "Strength (N)" : "Strength (S)"}
        />
      )}
      {(mode === "engine+" || mode === "engine-") && (
        <EngineFields
          preset={
            mode === "engine+" ? spawnPresets.enginePlus : spawnPresets.engineMinus
          }
          onPatch={(p) =>
            bump(mode === "engine+" ? "enginePlus" : "engineMinus", p)
          }
          maxMotorTorque={maxMotorTorque}
          maxRpm={maxRpm}
        />
      )}
      {mode === "box" && (
        <BoxFields preset={spawnPresets.box} onPatch={(p) => bump("box", p)} />
      )}
      {mode === "balloon" && (
        <BalloonFields
          preset={spawnPresets.balloon}
          onPatch={(p) => bump("balloon", p)}
          maxBuoyancyLift={maxBuoyancyLift}
        />
      )}
      {mode === "crank" && (
        <CrankFields
          preset={spawnPresets.crank}
          onPatch={(p) => bump("crank", p)}
        />
      )}
    </div>
  );
}

function EngineFields(props: {
  preset: EngineSpawnPreset;
  onPatch: (p: Partial<EngineSpawnPreset>) => void;
  maxMotorTorque: number;
  maxRpm: number;
}) {
  return (
    <>
      <div style={fieldStyle}>
        <span style={labelStyle}>Width</span>
        <input
          aria-label="Engine width"
          type="number"
          min={0.05}
          step={0.02}
          style={inputStyle}
          value={fmtInput(props.preset.width)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) props.onPatch({ width: Math.max(0.05, v) });
          }}
        />
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>Height</span>
        <input
          aria-label="Engine height"
          type="number"
          min={0.05}
          step={0.02}
          style={inputStyle}
          value={fmtInput(props.preset.height)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) props.onPatch({ height: Math.max(0.05, v) });
          }}
        />
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>Flywheel</span>
        <input
          aria-label="Flywheel radius"
          type="number"
          min={0.05}
          step={0.02}
          style={inputStyle}
          value={fmtInput(props.preset.flywheelRadius)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) props.onPatch({ flywheelRadius: Math.max(0.05, v) });
          }}
        />
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>RPM</span>
        <input
          aria-label="Engine rpm magnitude"
          type="number"
          min={0}
          max={props.maxRpm}
          step={10}
          style={inputStyle}
          value={fmtInput(props.preset.rpm)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) {
              props.onPatch({
                rpm: Math.max(0, Math.min(props.maxRpm, Math.round(v))),
              });
            }
          }}
        />
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>Max τ</span>
        <input
          aria-label="Engine max motor torque"
          type="number"
          min={0}
          max={props.maxMotorTorque}
          step={5}
          style={inputStyle}
          value={fmtInput(props.preset.maxTorque)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) {
              props.onPatch({
                maxTorque: Math.max(
                  0,
                  Math.min(props.maxMotorTorque, v),
                ),
              });
            }
          }}
        />
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>Material</span>
        <select
          aria-label="Engine material"
          style={inputStyle}
          value={props.preset.material}
          onChange={(e) =>
            props.onPatch({ material: e.target.value as MaterialName })
          }
        >
          {MATERIALS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>Lin. damp</span>
        <input
          aria-label="Linear damping"
          type="number"
          min={0}
          max={50}
          step={0.05}
          style={inputStyle}
          value={fmtInput(props.preset.linearDamping)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) props.onPatch({ linearDamping: Math.max(0, v) });
          }}
        />
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>Ang. damp</span>
        <input
          aria-label="Angular damping"
          type="number"
          min={0}
          max={50}
          step={0.05}
          style={inputStyle}
          value={fmtInput(props.preset.angularDamping)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) props.onPatch({ angularDamping: Math.max(0, v) });
          }}
        />
      </div>
      <SpawnFixedToggle
        checked={props.preset.fixed}
        onChange={(fixed) => props.onPatch({ fixed })}
      />
    </>
  );
}

function CrankFields(props: {
  preset: CrankSpawnPreset;
  onPatch: (p: Partial<CrankSpawnPreset>) => void;
}) {
  const maxPin = Math.max(0.02, props.preset.radius * 0.98);
  return (
    <>
      <div style={fieldStyle}>
        <span style={labelStyle}>Wheel r</span>
        <input
          aria-label="Crank wheel radius"
          type="number"
          min={0.05}
          step={0.02}
          style={inputStyle}
          value={fmtInput(props.preset.radius)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) props.onPatch({ radius: Math.max(0.05, v) });
          }}
        />
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>Pin r</span>
        <input
          aria-label="Pin distance along +X"
          type="number"
          min={0.02}
          step={0.01}
          style={inputStyle}
          value={fmtInput(props.preset.pinRadius)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) {
              props.onPatch({
                pinRadius: Math.min(maxPin, Math.max(0.02, v)),
              });
            }
          }}
        />
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>Material</span>
        <select
          aria-label="Spawn material"
          style={inputStyle}
          value={props.preset.material}
          onChange={(e) =>
            props.onPatch({ material: e.target.value as MaterialName })
          }
        >
          {MATERIALS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>Lin. damp</span>
        <input
          aria-label="Linear damping"
          type="number"
          min={0}
          max={50}
          step={0.05}
          style={inputStyle}
          value={fmtInput(props.preset.linearDamping)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) props.onPatch({ linearDamping: Math.max(0, v) });
          }}
        />
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>Ang. damp</span>
        <input
          aria-label="Angular damping"
          type="number"
          min={0}
          max={50}
          step={0.05}
          style={inputStyle}
          value={fmtInput(props.preset.angularDamping)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) props.onPatch({ angularDamping: Math.max(0, v) });
          }}
        />
      </div>
      <label style={spawnToggleLabelStyle}>
        <input
          type="checkbox"
          checked={props.preset.collideDynamicBalls}
          aria-label="Collide with dynamic balls"
          onChange={(e) =>
            props.onPatch({ collideDynamicBalls: e.target.checked })
          }
        />
        <span>Ball–ball hits</span>
      </label>
      <SpawnFixedToggle
        checked={props.preset.fixed}
        onChange={(fixed) => props.onPatch({ fixed })}
      />
    </>
  );
}

function BallFields(props: {
  preset: NeutralBallSpawnPreset | ChargedBallSpawnPreset;
  onPatch: (
    p: Partial<NeutralBallSpawnPreset> | Partial<ChargedBallSpawnPreset>,
  ) => void;
  showCharge: boolean;
  maxCharge: number;
  chargeLabel?: string;
}) {
  const charged = props.showCharge && "charge" in props.preset;

  return (
    <>
      <div style={fieldStyle}>
        <span style={labelStyle}>Radius</span>
        <input
          aria-label="Spawn radius"
          type="number"
          min={0.05}
          step={0.02}
          style={inputStyle}
          value={fmtInput(props.preset.radius)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) props.onPatch({ radius: Math.max(0.05, v) });
          }}
        />
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>Material</span>
        <select
          aria-label="Spawn material"
          style={inputStyle}
          value={props.preset.material}
          onChange={(e) =>
            props.onPatch({ material: e.target.value as MaterialName })
          }
        >
          {MATERIALS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>Lin. damp</span>
        <input
          aria-label="Linear damping"
          type="number"
          min={0}
          max={50}
          step={0.05}
          style={inputStyle}
          value={fmtInput(props.preset.linearDamping)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) props.onPatch({ linearDamping: Math.max(0, v) });
          }}
        />
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>Ang. damp</span>
        <input
          aria-label="Angular damping"
          type="number"
          min={0}
          max={50}
          step={0.05}
          style={inputStyle}
          value={fmtInput(props.preset.angularDamping)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) props.onPatch({ angularDamping: Math.max(0, v) });
          }}
        />
      </div>
      <label style={spawnToggleLabelStyle}>
        <input
          aria-label="Collide with other dynamic balls"
          type="checkbox"
          checked={props.preset.collideDynamicBalls}
          onChange={(e) =>
            props.onPatch({ collideDynamicBalls: e.target.checked })
          }
        />
        <span>Ball–ball hits</span>
      </label>
      <SpawnFixedToggle
        checked={props.preset.fixed}
        onChange={(fixed) => props.onPatch({ fixed })}
      />
      {charged ? (
        <div style={fieldStyle}>
          <span style={labelStyle}>{props.chargeLabel ?? "Charge"}</span>
          <input
            aria-label="Spawn charge"
            type="number"
            min={-props.maxCharge}
            max={props.maxCharge}
            step={0.5}
            style={inputStyle}
            value={fmtInput((props.preset as ChargedBallSpawnPreset).charge)}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (Number.isFinite(v)) {
                const c = Math.max(
                  -props.maxCharge,
                  Math.min(props.maxCharge, v),
                );
                props.onPatch({ charge: c });
              }
            }}
          />
        </div>
      ) : null}
    </>
  );
}

function BalloonFields(props: {
  preset: BalloonSpawnPreset;
  onPatch: (p: Partial<BalloonSpawnPreset>) => void;
  maxBuoyancyLift: number;
}) {
  return (
    <>
      <div style={fieldStyle}>
        <span style={labelStyle}>Radius</span>
        <input
          aria-label="Balloon radius"
          type="number"
          min={0.05}
          step={0.02}
          style={inputStyle}
          value={fmtInput(props.preset.radius)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) props.onPatch({ radius: Math.max(0.05, v) });
          }}
        />
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>Material</span>
        <select
          aria-label="Balloon material"
          style={inputStyle}
          value={props.preset.material}
          onChange={(e) =>
            props.onPatch({ material: e.target.value as MaterialName })
          }
        >
          {MATERIALS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>Lift (N)</span>
        <input
          aria-label="Buoyancy lift"
          type="number"
          min={0}
          max={props.maxBuoyancyLift}
          step={0.5}
          style={inputStyle}
          value={fmtInput(props.preset.buoyancyLift)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) {
              props.onPatch({
                buoyancyLift: Math.max(0, Math.min(props.maxBuoyancyLift, v)),
              });
            }
          }}
        />
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>Lin. damp</span>
        <input
          aria-label="Linear damping"
          type="number"
          min={0}
          max={50}
          step={0.05}
          style={inputStyle}
          value={fmtInput(props.preset.linearDamping)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) props.onPatch({ linearDamping: Math.max(0, v) });
          }}
        />
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>Ang. damp</span>
        <input
          aria-label="Angular damping"
          type="number"
          min={0}
          max={50}
          step={0.05}
          style={inputStyle}
          value={fmtInput(props.preset.angularDamping)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) props.onPatch({ angularDamping: Math.max(0, v) });
          }}
        />
      </div>
      <label style={spawnToggleLabelStyle}>
        <input
          aria-label="Collide with other dynamic balls"
          type="checkbox"
          checked={props.preset.collideDynamicBalls}
          onChange={(e) =>
            props.onPatch({ collideDynamicBalls: e.target.checked })
          }
        />
        <span>Ball–ball hits</span>
      </label>
      <SpawnFixedToggle
        checked={props.preset.fixed}
        onChange={(fixed) => props.onPatch({ fixed })}
      />
    </>
  );
}

function MagnetFields(props: {
  preset: MagnetSpawnPreset;
  onPatch: (p: Partial<MagnetSpawnPreset>) => void;
  maxDipole: number;
  polarityLabel: string;
}) {
  return (
    <>
      <div style={fieldStyle}>
        <span style={labelStyle}>Radius</span>
        <input
          aria-label="Magnet radius"
          type="number"
          min={0.05}
          step={0.02}
          style={inputStyle}
          value={fmtInput(props.preset.radius)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) props.onPatch({ radius: Math.max(0.05, v) });
          }}
        />
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>{props.polarityLabel}</span>
        <input
          aria-label="Dipole magnitude"
          type="number"
          min={0}
          max={props.maxDipole}
          step={0.5}
          style={inputStyle}
          value={fmtInput(props.preset.dipoleMagnitude)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) {
              props.onPatch({
                dipoleMagnitude: Math.max(
                  0,
                  Math.min(props.maxDipole, v),
                ),
              });
            }
          }}
        />
      </div>
      <SpawnFixedToggle
        checked={props.preset.fixed}
        onChange={(fixed) => props.onPatch({ fixed })}
      />
    </>
  );
}

function BoxFields(props: {
  preset: BoxSpawnPreset;
  onPatch: (p: Partial<BoxSpawnPreset>) => void;
}) {
  return (
    <>
      <div style={fieldStyle}>
        <span style={labelStyle}>Width</span>
        <input
          aria-label="Box width"
          type="number"
          min={0.05}
          step={0.02}
          style={inputStyle}
          value={fmtInput(props.preset.width)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) props.onPatch({ width: Math.max(0.05, v) });
          }}
        />
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>Height</span>
        <input
          aria-label="Box height"
          type="number"
          min={0.05}
          step={0.02}
          style={inputStyle}
          value={fmtInput(props.preset.height)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) props.onPatch({ height: Math.max(0.05, v) });
          }}
        />
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>Material</span>
        <select
          aria-label="Spawn material"
          style={inputStyle}
          value={props.preset.material}
          onChange={(e) =>
            props.onPatch({ material: e.target.value as MaterialName })
          }
        >
          {MATERIALS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>Lin. damp</span>
        <input
          aria-label="Linear damping"
          type="number"
          min={0}
          step={0.05}
          style={inputStyle}
          value={fmtInput(props.preset.linearDamping)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) props.onPatch({ linearDamping: Math.max(0, v) });
          }}
        />
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>Ang. damp</span>
        <input
          aria-label="Angular damping"
          type="number"
          min={0}
          step={0.05}
          style={inputStyle}
          value={fmtInput(props.preset.angularDamping)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) props.onPatch({ angularDamping: Math.max(0, v) });
          }}
        />
      </div>
      <SpawnFixedToggle
        checked={props.preset.fixed}
        onChange={(fixed) => props.onPatch({ fixed })}
      />
    </>
  );
}

function fmtInput(n: number): string {
  return Number.isFinite(n) ? String(n) : "";
}
