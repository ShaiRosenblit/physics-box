import type { CSSProperties } from "react";
import type { MaterialName } from "../../simulation";
import { testIds } from "../a11y/ids";
import { useViewportMode } from "../hooks/useViewportMode";
import {
  useUIStore,
  type ConnectorPresetKey,
  type ConnectorPresetsBundle,
  connectorEligiblePresetTool,
} from "../state/store";
import { layout, ui } from "../style/tokens";

const MATERIALS: MaterialName[] = ["wood", "metal", "cork", "felt"];

const ROPE_SEGMENTS_MIN = 2;

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

const ropeSpringHintStyle: CSSProperties = {
  flex: "1 0 100%",
  fontSize: 11,
  lineHeight: 1.4,
  color: ui.inkMuted,
  margin: 0,
  marginTop: -2,
  maxWidth: 560,
};

export interface ConnectorToolOptionsProps {
  /** Where the panel is anchored relative to the canvas — flips the divider. */
  dock?: "top" | "bottom";
}

/** Compact controls for rope / spring / pulley placement (before second click commits). */
export function ConnectorToolOptions({
  dock = "top",
}: ConnectorToolOptionsProps = {}) {
  const tool = useUIStore((s) => s.tool);
  const presets = useUIStore((s) => s.connectorPresets);
  const setPreset = useUIStore((s) => s.setConnectorPresetPartial);
  const viewportMode = useViewportMode();
  const isPhone = viewportMode === "phone";
  const key = connectorEligiblePresetTool(tool);

  if (key === null) return null;

  const bump = <K extends ConnectorPresetKey>(
    k: K,
    partial: Partial<ConnectorPresetsBundle[K]>,
  ) => {
    setPreset(k, partial);
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
      data-testid={testIds.connectorToolOptions}
      aria-label="Connector options for the active tool"
      style={{
        flexShrink: 0,
        padding: isPhone
          ? "6px 10px calc(6px + env(safe-area-inset-bottom))"
          : "6px 10px",
        background: ui.paperShade,
        borderTop: dock === "bottom" ? `1px solid ${ui.rule}` : undefined,
        borderBottom: dock === "top" ? `1px solid ${ui.rule}` : undefined,
        display: "flex",
        // Phone: single horizontally-scrolling row to keep canvas height.
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
          Next link
        </div>
      )}

      {(key === "rope" || key === "spring") && !isPhone && (
        <div style={ropeSpringHintStyle}>
          Tap twice: empty space or any body. On a body, the attachment uses
          exactly where you tapped — click the crank pin to pull a load in a
          straight line as the wheel turns (belt motor → hinge crank → rope).
        </div>
      )}

      {key === "rope" && (
        <>
          <div style={fieldStyle}>
            <span style={labelStyle}>Segments</span>
            <input
              aria-label="Rope segment count"
              type="number"
              min={ROPE_SEGMENTS_MIN}
              step={1}
              style={inputStyle}
              value={presets.rope.segments}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (Number.isFinite(v)) {
                  bump("rope", { segments: Math.max(ROPE_SEGMENTS_MIN, v) });
                }
              }}
            />
          </div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Material</span>
            <select
              aria-label="Rope material"
              style={inputStyle}
              value={presets.rope.material}
              onChange={(e) =>
                bump("rope", { material: e.target.value as MaterialName })
              }
            >
              {MATERIALS.map((m) => (
                <option key={m} value={m}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {key === "spring" && (
        <>
          <div style={fieldStyle}>
            <span style={labelStyle}>Stiffness (Hz)</span>
            <input
              aria-label="Spring frequency"
              type="number"
              min={0}
              max={120}
              step={0.5}
              style={inputStyle}
              value={presets.spring.frequencyHz}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v) && v >= 0) {
                  bump("spring", { frequencyHz: v });
                }
              }}
            />
          </div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Damping</span>
            <input
              aria-label="Spring damping ratio"
              type="number"
              min={0}
              max={5}
              step={0.05}
              style={inputStyle}
              value={presets.spring.dampingRatio}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v) && v >= 0) {
                  bump("spring", { dampingRatio: v });
                }
              }}
            />
          </div>
        </>
      )}

      {key === "pulley" && (
        <>
          <div style={fieldStyle}>
            <span style={labelStyle}>Spread</span>
            <input
              aria-label="Pulley half spread"
              type="number"
              min={0.05}
              max={2}
              step={0.01}
              style={inputStyle}
              value={presets.pulley.halfSpread}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v) && v > 0) {
                  bump("pulley", { halfSpread: v });
                }
              }}
            />
          </div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Ratio</span>
            <input
              aria-label="Pulley ratio"
              type="number"
              min={0.1}
              max={20}
              step={0.1}
              style={inputStyle}
              value={presets.pulley.ratio}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v) && v > 0) {
                  bump("pulley", { ratio: v });
                }
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
