import type { Id, SliderSpec, Vec2 } from "../core/types";

export interface SliderInput {
  bodyA: Id;
  bodyB?: Id;
  worldAnchor: Vec2;
  axis: Vec2;
  lowerLimit?: number;
  upperLimit?: number;
  breakForce?: number;
}

/**
 * Linear slider. Restricts `bodyA` (and optionally `bodyB`) to translate
 * along a fixed world-space line. Without `bodyB`, the counterpart is
 * the static ground (so a free-floating body becomes a tracked carriage).
 */
export function slider(input: SliderInput): SliderSpec {
  const ax = input.axis.x;
  const ay = input.axis.y;
  const len = Math.hypot(ax, ay);
  if (len < 1e-9) {
    throw new Error(`slider: axis must be non-zero`);
  }
  if (
    input.lowerLimit !== undefined &&
    input.upperLimit !== undefined &&
    input.lowerLimit > input.upperLimit
  ) {
    throw new Error(
      `slider: lowerLimit (${input.lowerLimit}) must be ≤ upperLimit (${input.upperLimit})`,
    );
  }
  return {
    kind: "slider",
    bodyA: input.bodyA,
    ...(input.bodyB !== undefined ? { bodyB: input.bodyB } : {}),
    worldAnchor: { x: input.worldAnchor.x, y: input.worldAnchor.y },
    axis: { x: ax / len, y: ay / len },
    ...(input.lowerLimit !== undefined ? { lowerLimit: input.lowerLimit } : {}),
    ...(input.upperLimit !== undefined ? { upperLimit: input.upperLimit } : {}),
    ...(input.breakForce !== undefined && input.breakForce > 0
      ? { breakForce: input.breakForce }
      : {}),
  };
}
