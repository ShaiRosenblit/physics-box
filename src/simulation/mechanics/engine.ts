import type { EngineSpec, MaterialName, Vec2 } from "../core/types";

export interface EngineInput {
  position: Vec2;
  width: number;
  height: number;
  /** Flywheel radius; when omitted, ~28% of the shorter housing side. */
  rotorRadius?: number;
  /** Target rotor speed (rpm); CCW positive. Clamped to `maxRpm` on add/patch. */
  rpm: number;
  /** Motor stall torque limit (N·m); clamped to `maxMotorTorque` on add/patch. */
  maxTorque: number;
  charge?: number;
  material?: MaterialName;
  velocity?: Vec2;
  angularVelocity?: number;
  angle?: number;
  fixed?: boolean;
  fixtureRestitution?: number;
  fixtureFriction?: number;
  linearDamping?: number;
  angularDamping?: number;
}

export function engine(input: EngineInput): EngineSpec {
  if (input.width <= 0 || input.height <= 0) {
    throw new Error(
      `engine: width and height must be > 0 (got ${input.width}, ${input.height})`,
    );
  }
  if (!Number.isFinite(input.rpm)) {
    throw new Error("engine: rpm must be a finite number");
  }
  if (!Number.isFinite(input.maxTorque)) {
    throw new Error("engine: maxTorque must be a finite number");
  }
  const rr =
    input.rotorRadius !== undefined ?
      input.rotorRadius
    : Math.min(input.width, input.height) * 0.28;
  if (rr <= 0) {
    throw new Error(`engine: rotorRadius must be > 0 (got ${rr})`);
  }
  return {
    kind: "engine",
    position: input.position,
    width: input.width,
    height: input.height,
    rotorRadius: rr,
    rpm: input.rpm,
    maxTorque: input.maxTorque,
    angle: input.angle ?? 0,
    velocity: input.velocity,
    angularVelocity: input.angularVelocity,
    fixed: input.fixed ?? false,
    material: input.material ?? "metal",
    charge: input.charge,
    ...(input.fixtureRestitution !== undefined
      ? { fixtureRestitution: input.fixtureRestitution }
      : {}),
    ...(input.fixtureFriction !== undefined ? { fixtureFriction: input.fixtureFriction } : {}),
    ...(input.linearDamping !== undefined ? { linearDamping: input.linearDamping } : {}),
    ...(input.angularDamping !== undefined ? { angularDamping: input.angularDamping } : {}),
  };
}
