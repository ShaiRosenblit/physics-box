import type { FanSpec, Id, MaterialName, Vec2 } from "../core/types";

export interface FanInput {
  position: Vec2;
  width: number;
  height: number;
  /** Effective range of the wind cone (m). */
  range: number;
  /** Half-angle of the cone (rad). Defaults to 25°. */
  halfAngle?: number;
  /** Peak force at the fan mouth (N). */
  force: number;
  angle?: number;
  material?: MaterialName;
  defaultEnabled?: boolean;
  triggerBy?: Id;
  fixtureRestitution?: number;
  fixtureFriction?: number;
}

/**
 * Air jet body. Force is applied to the *center* of every dynamic body
 * inside the cone; magnitude fades linearly from `force` at the mouth to
 * 0 at `range`. Always static.
 */
export function fan(input: FanInput): FanSpec {
  if (input.width <= 0 || input.height <= 0) {
    throw new Error(
      `fan: width and height must be > 0 (got ${input.width}, ${input.height})`,
    );
  }
  if (input.range <= 0) {
    throw new Error(`fan: range must be > 0 (got ${input.range})`);
  }
  if (!Number.isFinite(input.force)) {
    throw new Error(`fan: force must be a finite number`);
  }
  const halfAngle = input.halfAngle ?? (25 * Math.PI) / 180;
  if (halfAngle <= 0 || halfAngle >= Math.PI / 2) {
    throw new Error(
      `fan: halfAngle must be in (0, π/2) (got ${halfAngle})`,
    );
  }
  return {
    kind: "fan",
    position: input.position,
    width: input.width,
    height: input.height,
    range: input.range,
    halfAngle,
    force: input.force,
    angle: input.angle ?? 0,
    fixed: true,
    material: input.material ?? "metal",
    defaultEnabled: input.defaultEnabled ?? true,
    ...(input.triggerBy !== undefined ? { triggerBy: input.triggerBy } : {}),
    ...(input.fixtureRestitution !== undefined
      ? { fixtureRestitution: input.fixtureRestitution }
      : {}),
    ...(input.fixtureFriction !== undefined
      ? { fixtureFriction: input.fixtureFriction }
      : {}),
  };
}
