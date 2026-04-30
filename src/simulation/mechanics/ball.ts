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
}

export function ball(input: BallInput): BallSpec {
  if (input.radius <= 0) {
    throw new Error(`ball: radius must be > 0 (got ${input.radius})`);
  }
  return {
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
}
