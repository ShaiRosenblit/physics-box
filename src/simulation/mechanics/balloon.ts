import type { BalloonSpec, MaterialName, Vec2 } from "../core/types";

export interface BalloonInput {
  position: Vec2;
  radius: number;
  charge?: number;
  material?: MaterialName;
  velocity?: Vec2;
  angularVelocity?: number;
  angle?: number;
  fixed?: boolean;
  collideWithBalls?: boolean;
  fixtureRestitution?: number;
  fixtureFriction?: number;
  linearDamping?: number;
  angularDamping?: number;
  buoyancyScale?: number;
  buoyancyLift?: number;
}

/**
 * Helium-style balloon: light `latex` envelope, prescriptive lift by default.
 */
export function balloon(input: BalloonInput): BalloonSpec {
  if (input.radius <= 0) {
    throw new Error(`balloon: radius must be > 0 (got ${input.radius})`);
  }
  const spec: BalloonSpec = {
    kind: "balloon",
    position: input.position,
    radius: input.radius,
    angle: input.angle ?? 0,
    velocity: input.velocity,
    angularVelocity: input.angularVelocity,
    fixed: input.fixed ?? false,
    material: input.material ?? "latex",
    charge: input.charge,
    buoyancyScale: input.buoyancyScale ?? 1,
    buoyancyLift: input.buoyancyLift ?? 14,
    linearDamping: input.linearDamping ?? 0.35,
    angularDamping: input.angularDamping ?? 0.25,
  };
  return {
    ...spec,
    ...(input.collideWithBalls === false ? { collideWithBalls: false as const } : {}),
    ...(input.fixtureRestitution !== undefined
      ? { fixtureRestitution: input.fixtureRestitution }
      : {}),
    ...(input.fixtureFriction !== undefined ? { fixtureFriction: input.fixtureFriction } : {}),
  };
}
