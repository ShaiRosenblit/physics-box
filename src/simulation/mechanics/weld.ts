import type { Id, Vec2, WeldSpec } from "../core/types";

export interface WeldInput {
  bodyA: Id;
  bodyB: Id;
  worldAnchor: Vec2;
  breakForce?: number;
}

export function weld(input: WeldInput): WeldSpec {
  return {
    kind: "weld",
    bodyA: input.bodyA,
    bodyB: input.bodyB,
    worldAnchor: input.worldAnchor,
    ...(input.breakForce !== undefined && input.breakForce > 0
      ? { breakForce: input.breakForce }
      : {}),
  };
}
