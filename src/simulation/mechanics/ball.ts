import type { BallSpec, MaterialName, Vec2 } from "../core/types";

export interface BallInput {
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
}

export function ball(input: BallInput): BallSpec {
  if (input.radius <= 0) {
    throw new Error(`ball: radius must be > 0 (got ${input.radius})`);
  }
  const spec: BallSpec = {
    kind: "ball",
    position: input.position,
    radius: input.radius,
    angle: input.angle ?? 0,
    velocity: input.velocity,
    angularVelocity: input.angularVelocity,
    fixed: input.fixed ?? false,
    material: input.material ?? "wood",
    charge: input.charge,
  };
  return {
    ...spec,
    ...(input.collideWithBalls === false ? { collideWithBalls: false as const } : {}),
    ...(input.fixtureRestitution !== undefined
      ? { fixtureRestitution: input.fixtureRestitution }
      : {}),
    ...(input.fixtureFriction !== undefined ? { fixtureFriction: input.fixtureFriction } : {}),
    ...(input.linearDamping !== undefined ? { linearDamping: input.linearDamping } : {}),
    ...(input.angularDamping !== undefined ? { angularDamping: input.angularDamping } : {}),
  };
}
