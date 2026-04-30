import type { BoxSpec, MaterialName, Vec2 } from "../core/types";

export interface BoxInput {
  position: Vec2;
  width: number;
  height: number;
  charge?: number;
  material?: MaterialName;
  velocity?: Vec2;
  angularVelocity?: number;
  angle?: number;
  fixed?: boolean;
}

export function box(input: BoxInput): BoxSpec {
  if (input.width <= 0 || input.height <= 0) {
    throw new Error(
      `box: width and height must be > 0 (got ${input.width}, ${input.height})`,
    );
  }
  return {
    kind: "box",
    position: input.position,
    width: input.width,
    height: input.height,
    angle: input.angle ?? 0,
    velocity: input.velocity,
    angularVelocity: input.angularVelocity,
    fixed: input.fixed ?? false,
    material: input.material ?? "wood",
    charge: input.charge,
  };
}
