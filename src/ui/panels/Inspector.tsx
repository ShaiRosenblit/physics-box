import { useEffect, useState, type CSSProperties } from "react";
import { testIds } from "../a11y/ids";
import { useUIStore } from "../state/store";
import { useSimulationContext } from "../hooks/SimulationContext";
import type { BodyView, ConstraintView, Id, MaterialName } from "../../simulation";
import type { ViewportMode } from "../hooks/useViewportMode";
import { layout, ui } from "../style/tokens";

const MATERIALS: MaterialName[] = ["wood", "metal", "cork", "felt", "latex"];

const MIN_ROPE_SEG_UI = 2;

type SelectionPanelTarget =
  | { kind: "body"; view: BodyView }
  | { kind: "constraint"; view: ConstraintView };

function useRemoveSelection() {
  const { remove } = useSimulationContext();
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  return (id: Id) => {
    remove(id);
    setSelectedId(null);
  };
}

function RemoveFromSceneFooter(props: { id: Id }) {
  const removeSelection = useRemoveSelection();
  return (
    <div style={inspectorRemoveSectionStyle}>
      <button
        type="button"
        data-testid={testIds.inspectorRemoveSelection}
        aria-label="Remove selection from scene"
        style={inspectorRemoveButtonStyle}
        onClick={() => removeSelection(props.id)}
      >
        Remove from scene
      </button>
    </div>
  );
}

export interface InspectorProps {
  variant: "panel" | "rail" | "sheet";
}

export function Inspector({ variant }: InspectorProps) {
  const selectedId = useUIStore((s) => s.selectedId);
  const setInspectorOpen = useUIStore((s) => s.setInspectorOpen);
  const { world } = useSimulationContext();
  const [target, setTarget] = useState<SelectionPanelTarget | null>(null);

  useEffect(() => {
    if (selectedId === null) {
      setTarget(null);
      return;
    }
    let cancelled = false;
    let raf = 0;
    const tick = () => {
      if (cancelled) return;
      const snap = world.snapshot();
      const body = snap.bodies.find((b) => b.id === selectedId) ?? null;
      if (body) {
        setTarget({ kind: "body", view: body });
      } else {
        const c = snap.constraints.find((co) => co.id === selectedId) ?? null;
        setTarget(c ? { kind: "constraint", view: c } : null);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [selectedId, world]);

  const removeSelection = useRemoveSelection();

  if (variant === "rail") {
    return (
      <aside
        data-testid={testIds.inspector}
        aria-label="Inspector"
        style={railStyle}
      >
        <div style={railEyebrowStyle}>
          {target === null ? "—" : target.kind === "body" ? "Body" : "Link"}
        </div>
        {target ? (
          <div style={railValueStyle} title={`Id ${target.view.id}`}>
            #{target.view.id}
          </div>
        ) : (
          <div style={{ ...railValueStyle, opacity: 0.5 }} aria-hidden="true">
            —
          </div>
        )}
        {target ? (
          <button
            type="button"
            data-testid={testIds.inspectorRemoveSelection}
            aria-label="Remove selection from scene"
            title="Remove from scene"
            onClick={() => {
              removeSelection(target.view.id);
            }}
            style={railRemoveButtonStyle}
          >
            ×
          </button>
        ) : null}
      </aside>
    );
  }

  const isSheet = variant === "sheet";
  return (
    <aside
      data-testid={testIds.inspector}
      aria-label="Inspector"
      style={isSheet ? sheetStyle : panelStyle}
    >
      <div style={headerRowStyle}>
        <div style={eyebrowStyle}>Inspector</div>
        {isSheet && (
          <button
            type="button"
            aria-label="Dismiss inspector"
            onClick={() => setInspectorOpen(false)}
            style={dismissStyle}
          >
            ×
          </button>
        )}
      </div>
      {target === null ? (
        <div style={emptyStateStyle}>Nothing selected</div>
      ) : target.kind === "body" ? (
        <BodyDetails key={target.view.id} view={target.view} />
      ) : (
        <ConstraintDetails key={target.view.id} view={target.view} />
      )}
    </aside>
  );
}

function ConstraintDetails({ view }: { view: ConstraintView }) {
  const { patchConstraint } = useSimulationContext();
  const ctl = inspectorControlStyle;

  return (
    <div style={detailsStyle}>
      <ReadRow label={constraintKindShort(view.kind)} value={`#${view.id}`} />

      {view.kind === "rope" && (
        <>
          <div style={editRowStyle}>
            <span style={editLabelStyle}>Nominal length</span>
            <input
              aria-label="Rope nominal length"
              type="number"
              min={0.05}
              step={0.05}
              style={ctl}
              value={view.nominalLength}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v)) {
                  patchConstraint(view.id, { length: Math.max(0.05, v) });
                }
              }}
            />
          </div>
          <div style={editRowStyle}>
            <span style={editLabelStyle}>Segments</span>
            <input
              aria-label="Rope segment links"
              type="number"
              min={MIN_ROPE_SEG_UI}
              step={1}
              style={ctl}
              value={view.segmentLinks}
              onChange={(e) => {
                const iv = parseInt(e.target.value, 10);
                if (Number.isFinite(iv)) {
                  patchConstraint(view.id, {
                    segments: Math.max(MIN_ROPE_SEG_UI, iv),
                  });
                }
              }}
            />
          </div>
          <div style={editRowStyle}>
            <span style={editLabelStyle}>Material</span>
            <select
              aria-label="Rope material"
              style={ctl}
              value={view.material}
              onChange={(e) =>
                patchConstraint(view.id, {
                  material: e.target.value as MaterialName,
                })
              }
            >
              {MATERIALS.map((m) => (
                <option key={m} value={m}>
                  {titleCase(m)}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {view.kind === "spring" && (
        <>
          <div style={editRowStyle}>
            <span style={editLabelStyle}>Rest length</span>
            <input
              aria-label="Spring rest length"
              type="number"
              min={0.05}
              step={0.05}
              style={ctl}
              value={view.restLength}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v)) {
                  patchConstraint(view.id, { restLength: Math.max(0.05, v) });
                }
              }}
            />
          </div>
          <div style={editRowStyle}>
            <span style={editLabelStyle}>Stiffness (Hz)</span>
            <input
              aria-label="Spring frequency Hz"
              type="number"
              min={0}
              max={120}
              step={0.5}
              style={ctl}
              value={view.frequencyHz}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v) && v >= 0) {
                  patchConstraint(view.id, { frequencyHz: v });
                }
              }}
            />
          </div>
          <div style={editRowStyle}>
            <span style={editLabelStyle}>Damping</span>
            <input
              aria-label="Spring damping ratio"
              type="number"
              min={0}
              max={5}
              step={0.05}
              style={ctl}
              value={view.dampingRatio}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v) && v >= 0) {
                  patchConstraint(view.id, { dampingRatio: v });
                }
              }}
            />
          </div>
          <ReadRow label="Span" value={`${fmt(view.currentLength)} m`} />
        </>
      )}

      {view.kind === "hinge" && (
        <>
          <div style={editRowStyle}>
            <span style={editLabelStyle}>Pivot X</span>
            <input
              aria-label="Hinge pivot X"
              type="number"
              step={0.05}
              style={ctl}
              value={view.anchor.x}
              onChange={(e) => {
                const vx = parseFloat(e.target.value);
                if (!Number.isFinite(vx)) return;
                patchConstraint(view.id, {
                  worldAnchor: { x: vx, y: view.anchor.y },
                });
              }}
            />
          </div>
          <div style={editRowStyle}>
            <span style={editLabelStyle}>Pivot Y</span>
            <input
              aria-label="Hinge pivot Y"
              type="number"
              step={0.05}
              style={ctl}
              value={view.anchor.y}
              onChange={(e) => {
                const vy = parseFloat(e.target.value);
                if (!Number.isFinite(vy)) return;
                patchConstraint(view.id, {
                  worldAnchor: { x: view.anchor.x, y: vy },
                });
              }}
            />
          </div>
          <ReadRow
            label="Bodies"
            value={`A ${view.bodyA}${view.bodyB !== undefined ? ` · B ${view.bodyB}` : ""}`}
          />
        </>
      )}

      {view.kind === "pulley" && (
        <>
          <div style={editRowStyle}>
            <span style={editLabelStyle}>Spread</span>
            <input
              aria-label="Pulley half spread"
              type="number"
              min={0.05}
              max={2}
              step={0.01}
              style={ctl}
              value={view.halfSpread}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v) && v > 0) {
                  patchConstraint(view.id, { halfSpread: v });
                }
              }}
            />
          </div>
          <div style={editRowStyle}>
            <span style={editLabelStyle}>Ratio</span>
            <input
              aria-label="Pulley ratio"
              type="number"
              min={0.1}
              max={20}
              step={0.1}
              style={ctl}
              value={view.ratio}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v) && v > 0) {
                  patchConstraint(view.id, { ratio: v });
                }
              }}
            />
          </div>
          <ReadRow
            label="Wheel"
            value={`${fmt(view.wheelCenter.x)}, ${fmt(view.wheelCenter.y)}`}
          />
        </>
      )}

      {view.kind === "belt" && (
        <>
          <ReadRow label="Driver rotor" value={`#${view.driverRotorId}`} />
          <ReadRow label="Driven body" value={`#${view.drivenBodyId}`} />
          <div style={editRowStyle}>
            <span style={editLabelStyle}>Gear ratio</span>
            <input
              aria-label="Belt gear ratio"
              type="number"
              min={-40}
              max={40}
              step={0.05}
              style={ctl}
              value={view.ratio}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v) && Math.abs(v) > 1e-6) {
                  patchConstraint(view.id, { ratio: v });
                }
              }}
            />
          </div>
        </>
      )}
      <RemoveFromSceneFooter id={view.id} />
    </div>
  );
}

function constraintKindShort(kind: ConstraintView["kind"]): string {
  switch (kind) {
    case "rope":
      return "Rope";
    case "hinge":
      return "Hinge";
    case "spring":
      return "Spring";
    case "pulley":
      return "Pulley";
    case "belt":
      return "Belt";
  }
}

function BodyDetails({ view }: { view: BodyView }) {
  const { patchBody, world } = useSimulationContext();
  const { maxCharge, maxDipole, maxBuoyancyLift, maxMotorTorque } = world.config;
  const speed = Math.hypot(view.velocity.x, view.velocity.y);

  const ctl = inspectorControlStyle;
  const angleDeg = (view.angle * 180) / Math.PI;

  return (
    <div style={detailsStyle}>
      <ReadRow label="Body" value={`#${view.id} · ${labelOf(view.kind)}`} />

      {!world.running ? (
        <ReadRow label="Pause" value="Drag to reposition · Shift+drag turns" />
      ) : null}

      <div style={editRowStyle}>
        <span style={editLabelStyle}>Position X</span>
        <input
          aria-label="Body center X"
          type="number"
          step={0.05}
          style={ctl}
          value={view.position.x}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) {
              patchBody(view.id, {
                position: { x: v, y: view.position.y },
              });
            }
          }}
        />
      </div>
      <div style={editRowStyle}>
        <span style={editLabelStyle}>Position Y</span>
        <input
          aria-label="Body center Y"
          type="number"
          step={0.05}
          style={ctl}
          value={view.position.y}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) {
              patchBody(view.id, {
                position: { x: view.position.x, y: v },
              });
            }
          }}
        />
      </div>
      <div style={editRowStyle}>
        <span style={editLabelStyle}>Angle °</span>
        <input
          aria-label="Body angle degrees"
          type="number"
          step={1}
          style={ctl}
          value={Number.isFinite(angleDeg) ? Math.round(angleDeg * 100) / 100 : 0}
          onChange={(e) => {
            const d = parseFloat(e.target.value);
            if (!Number.isFinite(d)) return;
            patchBody(view.id, {
              angle: (d * Math.PI) / 180,
            });
          }}
        />
      </div>

      <div style={editRowStyle}>
        <span style={editLabelStyle}>Material</span>
        <select
          aria-label="Material"
          style={ctl}
          value={view.material}
          onChange={(e) =>
            patchBody(view.id, { material: e.target.value as MaterialName })
          }
        >
          {MATERIALS.map((m) => (
            <option key={m} value={m}>
              {titleCase(m)}
            </option>
          ))}
        </select>
      </div>

      {(view.kind === "ball" ||
        view.kind === "balloon" ||
        view.kind === "box" ||
        view.kind === "crank" ||
        view.kind === "engine" ||
        view.kind === "engine_rotor") && (
        <div style={editRowStyle}>
          <span style={editLabelStyle}>Charge</span>
          <input
            aria-label="Charge"
            type="number"
            min={-maxCharge}
            max={maxCharge}
            step={0.25}
            style={ctl}
            value={view.charge}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (Number.isFinite(v)) {
                patchBody(view.id, {
                  charge: Math.max(-maxCharge, Math.min(maxCharge, v)),
                });
              }
            }}
          />
        </div>
      )}

      {view.kind === "magnet" && (
        <div style={editRowStyle}>
          <span style={editLabelStyle}>Dipole</span>
          <input
            aria-label="Dipole moment"
            type="number"
            min={-maxDipole}
            max={maxDipole}
            step={0.5}
            style={ctl}
            value={view.dipole}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (Number.isFinite(v)) {
                patchBody(view.id, {
                  dipole: Math.max(-maxDipole, Math.min(maxDipole, v)),
                });
              }
            }}
          />
        </div>
      )}

      {(view.kind === "engine" || view.kind === "engine_rotor") && (
        <div style={editRowStyle}>
          <span style={editLabelStyle}>Torque</span>
          <input
            aria-label="Motor torque"
            type="number"
            min={-maxMotorTorque}
            max={maxMotorTorque}
            step={1}
            style={ctl}
            value={view.torque}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (Number.isFinite(v)) {
                patchBody(view.id, {
                  torque: Math.max(-maxMotorTorque, Math.min(maxMotorTorque, v)),
                });
              }
            }}
          />
        </div>
      )}

      {(view.kind === "engine" || view.kind === "engine_rotor") && (
        <div style={editRowStyle}>
          <span style={editLabelStyle}>Flywheel r</span>
          <input
            aria-label="Flywheel radius"
            type="number"
            min={0.05}
            step={0.02}
            style={ctl}
            value={view.kind === "engine" ? view.rotorRadius : view.radius}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (Number.isFinite(v)) {
                patchBody(view.id, {
                  rotorRadius: Math.max(0.05, v),
                });
              }
            }}
          />
        </div>
      )}

      {(view.kind === "ball" || view.kind === "balloon") && (
        <>
          <div style={editRowStyle}>
            <span style={editLabelStyle}>Radius</span>
            <input
              aria-label="Radius"
              type="number"
              min={0.05}
              step={0.02}
              style={ctl}
              value={view.radius}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v)) patchBody(view.id, { radius: Math.max(0.05, v) });
              }}
            />
          </div>
          <label style={toggleRowStyle}>
            <input
              type="checkbox"
              checked={view.collideDynamicBalls}
              aria-label="Collide with other dynamic balls"
              onChange={(e) =>
                patchBody(view.id, { collideWithBalls: e.target.checked })
              }
            />
            <span>Ball–ball hits</span>
          </label>
        </>
      )}

      {view.kind === "crank" && (
        <>
          <div style={editRowStyle}>
            <span style={editLabelStyle}>Wheel r</span>
            <input
              aria-label="Crank wheel radius"
              type="number"
              min={0.05}
              step={0.02}
              style={ctl}
              value={view.radius}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v)) patchBody(view.id, { radius: Math.max(0.05, v) });
              }}
            />
          </div>
          <div style={editRowStyle}>
            <span style={editLabelStyle}>Pin local X</span>
            <input
              aria-label="Pin offset local X"
              type="number"
              step={0.01}
              style={ctl}
              value={view.pinLocal.x}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v)) {
                  patchBody(view.id, {
                    pinLocal: { x: v, y: view.pinLocal.y },
                  });
                }
              }}
            />
          </div>
          <div style={editRowStyle}>
            <span style={editLabelStyle}>Pin local Y</span>
            <input
              aria-label="Pin offset local Y"
              type="number"
              step={0.01}
              style={ctl}
              value={view.pinLocal.y}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v)) {
                  patchBody(view.id, {
                    pinLocal: { x: view.pinLocal.x, y: v },
                  });
                }
              }}
            />
          </div>
          <label style={toggleRowStyle}>
            <input
              type="checkbox"
              checked={view.collideDynamicBalls}
              aria-label="Collide with other dynamic balls"
              onChange={(e) =>
                patchBody(view.id, { collideWithBalls: e.target.checked })
              }
            />
            <span>Ball–ball hits</span>
          </label>
        </>
      )}

      {(view.kind === "box" || view.kind === "engine") && (
        <>
          <div style={editRowStyle}>
            <span style={editLabelStyle}>Width</span>
            <input
              aria-label="Width"
              type="number"
              min={0.05}
              step={0.02}
              style={ctl}
              value={view.width}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v)) patchBody(view.id, { width: Math.max(0.05, v) });
              }}
            />
          </div>
          <div style={editRowStyle}>
            <span style={editLabelStyle}>Height</span>
            <input
              aria-label="Height"
              type="number"
              min={0.05}
              step={0.02}
              style={ctl}
              value={view.height}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v)) patchBody(view.id, { height: Math.max(0.05, v) });
              }}
            />
          </div>
        </>
      )}

      {view.kind === "magnet" && (
        <div style={editRowStyle}>
          <span style={editLabelStyle}>Radius</span>
          <input
            aria-label="Radius"
            type="number"
            min={0.05}
            step={0.02}
            style={ctl}
            value={view.radius}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (Number.isFinite(v)) patchBody(view.id, { radius: Math.max(0.05, v) });
            }}
          />
        </div>
      )}

      <label style={toggleRowStyle}>
        <input
          type="checkbox"
          checked={view.fixed}
          aria-label="Fixed in world"
          onChange={(e) => patchBody(view.id, { fixed: e.target.checked })}
        />
        <span>Fixed (static)</span>
      </label>

      <div style={editRowStyle}>
        <span style={editLabelStyle}>Lin. damp</span>
        <input
          aria-label="Linear damping"
          type="number"
          min={0}
          max={50}
          step={0.05}
          style={ctl}
          value={view.linearDamping}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) patchBody(view.id, { linearDamping: Math.max(0, v) });
          }}
        />
      </div>
      <div style={editRowStyle}>
        <span style={editLabelStyle}>Ang. damp</span>
        <input
          aria-label="Angular damping"
          type="number"
          min={0}
          max={50}
          step={0.05}
          style={ctl}
          value={view.angularDamping}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) patchBody(view.id, { angularDamping: Math.max(0, v) });
          }}
        />
      </div>
      <div style={editRowStyle}>
        <span style={editLabelStyle}>Buoy. scale</span>
        <input
          aria-label="Buoyancy scale"
          type="number"
          min={0}
          max={1}
          step={0.05}
          style={ctl}
          value={view.buoyancyScale}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) {
              patchBody(view.id, {
                buoyancyScale: Math.max(0, Math.min(1, v)),
              });
            }
          }}
        />
      </div>
      <div style={editRowStyle}>
        <span style={editLabelStyle}>Lift (N)</span>
        <input
          aria-label="Buoyancy lift"
          type="number"
          min={0}
          max={maxBuoyancyLift}
          step={0.5}
          style={ctl}
          value={view.buoyancyLift}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) {
              patchBody(view.id, {
                buoyancyLift: Math.max(0, Math.min(maxBuoyancyLift, v)),
              });
            }
          }}
        />
      </div>

      <ReadRow
        label="Position"
        value={`${fmt(view.position.x)}, ${fmt(view.position.y)} m`}
      />
      <ReadRow label="Speed" value={`${fmt(speed)} m/s`} />
      <RemoveFromSceneFooter id={view.id} />
    </div>
  );
}

function ReadRow(props: { label: string; value: string }) {
  return (
    <div style={rowStyle}>
      <span style={rowLabelStyle}>{props.label}</span>
      <span
        style={{
          ...rowValueStyle,
          color: ui.inkPrimary,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {props.value}
      </span>
    </div>
  );
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "";
  const abs = Math.abs(n);
  if (abs >= 100) return n.toFixed(0);
  if (abs >= 10) return n.toFixed(1);
  if (abs >= 1) return n.toFixed(2);
  return n.toFixed(3);
}

function labelOf(kind: BodyView["kind"]): string {
  switch (kind) {
    case "ball":
      return "Ball";
    case "balloon":
      return "Balloon";
    case "box":
      return "Box";
    case "crank":
      return "Crank";
    case "engine":
      return "Engine";
    case "engine_rotor":
      return "Rotor";
    case "magnet":
      return "Magnet";
  }
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const panelStyle: CSSProperties = {
  width: 240,
  padding: "12px 12px",
  background: ui.paperShade,
  borderLeft: `1px solid ${ui.rule}`,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  fontSize: 12,
  lineHeight: 1.3,
  color: ui.inkPrimary,
  flexShrink: 0,
  overflowY: "auto",
};

const sheetStyle: CSSProperties = {
  width: "100%",
  padding: "16px 14px calc(16px + env(safe-area-inset-bottom))",
  background: ui.paperShade,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  fontSize: 14,
  lineHeight: 1.35,
  color: ui.inkPrimary,
  height: "100%",
  overflowY: "auto",
};

const railStyle: CSSProperties = {
  width: 44,
  padding: "10px 4px",
  background: ui.paperShade,
  borderLeft: `1px solid ${ui.rule}`,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
  color: ui.inkPrimary,
  flexShrink: 0,
};

const railEyebrowStyle: CSSProperties = {
  fontSize: 8.5,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: ui.inkMuted,
};

const railValueStyle: CSSProperties = {
  fontFamily: '"SF Mono", ui-monospace, Menlo, monospace',
  fontSize: 11,
  fontVariantNumeric: "tabular-nums",
};

const headerRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const dismissStyle: CSSProperties = {
  appearance: "none",
  border: "none",
  background: "transparent",
  color: ui.inkMuted,
  fontSize: 22,
  lineHeight: 1,
  cursor: "pointer",
  padding: 4,
};

const eyebrowStyle: CSSProperties = {
  fontSize: 9,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: ui.inkMuted,
  fontWeight: 500,
};

const emptyStateStyle: CSSProperties = {
  color: ui.inkMuted,
  fontStyle: "italic",
  paddingTop: 8,
};

const detailsStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  paddingTop: 4,
};

const rowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  borderBottom: `1px dashed ${ui.rule}`,
  paddingBottom: 4,
};

const rowLabelStyle: CSSProperties = {
  fontSize: 9.5,
  color: ui.inkMuted,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const rowValueStyle: CSSProperties = {
  fontSize: 11,
  fontFamily: '"SF Mono", ui-monospace, Menlo, monospace',
};

const editRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
  borderBottom: `1px dashed ${ui.rule}`,
  paddingBottom: 4,
};

const editLabelStyle: CSSProperties = {
  flexShrink: 0,
  fontSize: 9.5,
  color: ui.inkMuted,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const inspectorControlStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: layout.controlHeight,
  padding: "0 6px",
  borderRadius: layout.controlRadius,
  border: `${layout.controlBorder}px solid ${ui.rule}`,
  background: ui.paper,
  color: ui.inkPrimary,
  fontSize: 11,
  fontVariantNumeric: "tabular-nums",
};

const toggleRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 11,
  borderBottom: `1px dashed ${ui.rule}`,
  paddingBottom: 4,
};

const inspectorRemoveSectionStyle: CSSProperties = {
  paddingTop: 8,
  marginTop: 4,
  borderTop: `1px solid ${ui.rule}`,
};

const inspectorRemoveButtonStyle: CSSProperties = {
  alignSelf: "stretch",
  width: "100%",
  height: layout.controlHeight,
  padding: "0 8px",
  borderRadius: layout.controlRadius,
  border: `${layout.controlBorder}px solid ${ui.rule}`,
  background: ui.paper,
  color: ui.chargeNeg,
  fontSize: 11,
  fontWeight: 500,
  cursor: "pointer",
};

const railRemoveButtonStyle: CSSProperties = {
  appearance: "none",
  flexShrink: 0,
  width: 26,
  height: 26,
  padding: 0,
  lineHeight: 1,
  fontSize: 16,
  color: ui.chargeNeg,
  background: ui.paper,
  borderRadius: layout.controlRadius,
  border: `${layout.controlBorder}px solid ${ui.rule}`,
  cursor: "pointer",
};

export function inspectorVariantFor(mode: ViewportMode): "panel" | "sheet" {
  if (mode === "desktop") return "panel";
  // Tablet shares the phone pattern: floating peek + drawer. The rail
  // mostly showed "BODY —" and stole canvas width without earning it.
  return "sheet";
}
