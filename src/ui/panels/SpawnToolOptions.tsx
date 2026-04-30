import type { CSSProperties } from "react";
import type { MaterialName } from "../../simulation";
import { activeSpawnModeFromTool } from "../canvas/usePointerGestures";
import { testIds } from "../a11y/ids";
import { useSimulationContext } from "../hooks/SimulationContext";
import {
  useUIStore,
  type BoxSpawnPreset,
  type ChargedBallSpawnPreset,
  type MagnetSpawnPreset,
  type NeutralBallSpawnPreset,
  type SpawnPresetKey,
  type SpawnPresetsBundle,
} from "../state/store";
import { layout, ui } from "../style/tokens";

const MATERIALS: MaterialName[] = ["wood", "metal", "cork", "felt"];

const inputStyle: CSSProperties = {
  height: layout.controlHeight,
  minWidth: 56,
  padding: "0 6px",
  borderRadius: layout.controlRadius,
  border: `${layout.controlBorder}px solid ${ui.rule}`,
  background: ui.paper,
  color: ui.inkPrimary,
  fontSize: 12,
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
};

/** Compact controls for the active spawn tool ("recipe" before placement). */
export function SpawnToolOptions() {
  const tool = useUIStore((s) => s.tool);
  const spawnPresets = useUIStore((s) => s.spawnPresets);
  const setSpawnPresetPartial = useUIStore((s) => s.setSpawnPresetPartial);

  const mode = activeSpawnModeFromTool(tool);
  const { maxCharge, maxDipole } = useSimulationContext().world.config;

  if (mode === null) return null;

  const bump = <K extends SpawnPresetKey>(
    k: K,
    partial: Partial<SpawnPresetsBundle[K]>,
  ) => {
    setSpawnPresetPartial(k, partial);
  };

  return (
    <div
      data-testid={testIds.spawnToolOptions}
      aria-label="Spawn options for the active tool"
      style={{
        flexShrink: 0,
        padding: "6px 10px",
        background: ui.paperShade,
        borderBottom: `1px solid ${ui.rule}`,
        display: "flex",
        flexWrap: "wrap",
        gap: "8px 14px",
        alignItems: "flex-end",
      }}
    >
      <div style={{ ...labelStyle, flex: "1 0 100%", marginBottom: -4 }}>
        Next placement
      </div>
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
      {mode === "box" && (
        <BoxFields preset={spawnPresets.box} onPatch={(p) => bump("box", p)} />
      )}
    </div>
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
      <label
        style={{
          display: "flex",
          gap: 6,
          alignItems: "center",
          fontSize: 11,
          color: ui.inkPrimary,
          cursor: "pointer",
        }}
      >
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
    </>
  );
}

function fmtInput(n: number): string {
  return Number.isFinite(n) ? String(n) : "";
}
